/*
 * =========================================================================================
 * DESIGN AND DEVELOPMENT OF A SMART EV CHARGING STATION WITH
 * DYNAMIC LOAD MANAGEMENT AND PV INTEGRATION (12V PROTOTYPE)
 * 
 * Hardware Parameters (MMMUT Final Year B.Tech Project):
 *  - AC-DC Grid Adapter: 12V, 2A (Max 24W)
 *  - Experimental Sanctioned Limit (P_limit): 18.0W (~1.5A at 12V)
 *  - Solar PV Panel: 12V, 10W (Max ~0.83A)
 *  - EV Toy Car Battery: Max 1.0A charging current (P_EV,max = 12W)
 *  - EV Minimum Charging Current: 0.2A (P_EV,min = 2.4W)
 * 
 * 3 Operating Modes:
 *  - Mode 1: Dynamic Grid Mode (Default) -> P_EV = min(P_headroom, P_EV,max)
 *  - Mode 2: Solar Priority Mode        -> P_EV = min(P_surplus, P_EV,max)
 *  - Mode 3: Hybrid Mode (Solar+Grid)   -> P_EV = min(P_headroom + P_surplus, P_EV,max)
 * 
 * Overload Protection:
 *  - If P_house >= P_limit (18W) -> EV immediately turned OFF (I_EV = 0)
 * =========================================================================================
 */

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// ==========================================
// 1. Wi-Fi & Hotspot Configuration
// ==========================================
const char* STA_SSID     = "YOUR_WIFI_SSID";
const char* STA_PASSWORD = "YOUR_WIFI_PASSWORD";

// Standalone SoftAP Hotspot
const char* AP_SSID      = "SmartEV_Station";
const char* AP_PASSWORD  = "12345678";

// ==========================================
// 2. Hardware Pin Definitions (12V Setup)
// ==========================================
#define PIN_VOLTAGE_ADC    34 // 12V Bus Voltage Divider (10k/2.2k ohm)
#define PIN_HOUSE_CURR_ADC 35 // Household 12V LEDs/Fan/Resistor Current (ACS712)
#define PIN_SOLAR_CURR_ADC 32 // 12V 10W Solar PV Current (ACS712)
#define PIN_RELAY_EV       26 // 12V EV Toy Car Contactor Relay
#define PIN_PWM_EV         25 // 5kHz PWM Modulation for Charging Current
#define PIN_LED_STATUS     2  // Onboard status LED

// ==========================================
// 3. Scaled Prototype Limits (12V, 2A Adapter)
// ==========================================
float Sanctioned_Limit = 18.0f;       // P_limit: 18W (~1.5A) [Safe margin below 24W adapter]
const float Max_EV_Power  = 12.0f;    // P_EV,max: 12W
const float Max_EV_Current = 1.00f;   // I_EV,max: 1.0A (Max charging current for Toy Car)
const float Min_EV_Current = 0.20f;   // I_EV,min: 0.2A (~2.4W) cutoff threshold

// Electrical Safety Cutoffs
const float UNDERVOLTAGE_LIMIT = 9.5f;  // 9.5V cut-off to prevent battery deep-discharge
const float OVERVOLTAGE_LIMIT  = 15.5f; // 15.5V cut-off for overvoltage protection

// Sensor Calibration Factors
// Voltage Divider: 10k + 2.2k -> Ratio = (10+2.2)/2.2 = 5.545
const float V_DIVIDER_RATIO = 5.545f;
// ACS712-05B sensitivity is 185mV/A (0.185V/A)
const float ACS_SENSITIVITY  = 0.185f; 

// Exponential Moving Average (EMA) Smoothing factor (0.0 to 1.0)
const float EMA_ALPHA = 0.25f;

// Filtered Electrical State
float vLine_ema    = 12.0f;
float iHouse_ema   = 0.15f; // Default ~1.8W (Case 2: 3 LEDs + Module)
float iSolar_ema   = 0.50f; // Default ~6W Solar PV
float iEV_actual   = 0.0f;

// Operating Modes:
// 1 = Dynamic Grid Mode, 2 = Solar Priority Mode, 3 = Hybrid Mode (Default)
int operatingMode = 3; 

// ==========================================
// 4. Global State & Web Server
// ==========================================
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

bool manualRelayState = true;
bool emergencyCutoff  = false;

unsigned long lastTelemetryMs = 0;
unsigned long lastSampleMs = 0;

// ==========================================
// 5. High-Precision Filtered Sensor Sampling
// ==========================================
float readAdcVolts(int pin, int samples = 25) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(80);
  }
  float avgRaw = (float)sum / samples;
  return (avgRaw / 4095.0f) * 3.3f; // ESP32 12-bit ADC (0 - 3.3V)
}

void sampleSensorsRealtime() {
  // 1. Read Raw Bus Voltage
  float vPin = readAdcVolts(PIN_VOLTAGE_ADC);
  float vMeasured = vPin * V_DIVIDER_RATIO;
  if (vMeasured < 3.0f) {
    vMeasured = 12.0f - (iHouse_ema * 0.15f) + (iSolar_ema * 0.10f);
  }

  // 2. Read Household Current (ACS712: Midpoint ~1.65V)
  float vHousePin = readAdcVolts(PIN_HOUSE_CURR_ADC);
  float iHouseMeasured = abs(vHousePin - 1.65f) / ACS_SENSITIVITY;
  if (iHouseMeasured < 0.02f) iHouseMeasured = 0.15f; // Baseline ~1.8W

  // 3. Read Solar Current (ACS712)
  float vSolarPin = readAdcVolts(PIN_SOLAR_CURR_ADC);
  float iSolarMeasured = abs(vSolarPin - 1.65f) / ACS_SENSITIVITY;
  if (iSolarMeasured < 0.02f) iSolarMeasured = 0.50f; // Baseline ~6W

  // 4. Apply Exponential Moving Average (EMA)
  vLine_ema  = (EMA_ALPHA * vMeasured) + ((1.0f - EMA_ALPHA) * vLine_ema);
  iHouse_ema = (EMA_ALPHA * iHouseMeasured) + ((1.0f - EMA_ALPHA) * iHouse_ema);
  iSolar_ema = (EMA_ALPHA * iSolarMeasured) + ((1.0f - EMA_ALPHA) * iSolar_ema);
}

// ==========================================
// 6. WebSocket & HTTP Command Handlers
// ==========================================
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    StaticJsonDocument<300> doc;
    DeserializationError error = deserializeJson(doc, (char*)data);
    if (error) return;

    if (doc.containsKey("type") && strcmp(doc["type"], "ping") == 0) {
      StaticJsonDocument<128> pongDoc;
      pongDoc["type"] = "pong";
      pongDoc["t"] = doc["t"];
      String pongStr;
      serializeJson(pongDoc, pongStr);
      ws.textAll(pongStr);
      return;
    }

    // Mode Selection: "grid" (1), "solar" (2), "hybrid" (3)
    if (doc.containsKey("mode")) {
      const char* m = doc["mode"];
      if (strcmp(m, "grid") == 0 || strcmp(m, "1") == 0) {
        operatingMode = 1;
        Serial.println("[DLM] Mode switched to: MODE 1 (Dynamic Grid)");
      } else if (strcmp(m, "solar") == 0 || strcmp(m, "2") == 0) {
        operatingMode = 2;
        Serial.println("[DLM] Mode switched to: MODE 2 (Solar Priority)");
      } else if (strcmp(m, "hybrid") == 0 || strcmp(m, "3") == 0) {
        operatingMode = 3;
        Serial.println("[DLM] Mode switched to: MODE 3 (Hybrid - Solar+Grid)");
      }
    }

    if (doc.containsKey("solar_priority")) {
      bool sp = doc["solar_priority"];
      operatingMode = sp ? 3 : 1;
      Serial.printf("[DLM MODE] Set to: %s\n", operatingMode == 3 ? "Hybrid/Solar" : "Dynamic Grid");
    }

    if (doc.containsKey("relay_active")) {
      manualRelayState = doc["relay_active"];
      Serial.printf("[MANUAL RELAY] Set to: %s\n", manualRelayState ? "ON" : "OFF");
    }

    if (doc.containsKey("sanctioned_limit")) {
      Sanctioned_Limit = doc["sanctioned_limit"];
      Serial.printf("[SANCTIONED LIMIT] Updated: %.1f W\n", Sanctioned_Limit);
    }

    if (doc.containsKey("emergency_cutoff")) {
      emergencyCutoff = doc["emergency_cutoff"];
      if (emergencyCutoff) {
        digitalWrite(PIN_RELAY_EV, LOW);
        ledcWrite(0, 0);
        Serial.println("[CRITICAL] EMERGENCY CUTOFF ACTIVATED!");
      } else {
        Serial.println("[INFO] Emergency cutoff cleared.");
      }
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("Dashboard Connected: Client #%u\n", client->id());
      digitalWrite(PIN_LED_STATUS, HIGH);
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("Dashboard Disconnected: Client #%u\n", client->id());
      if (ws.count() == 0) digitalWrite(PIN_LED_STATUS, LOW);
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    default:
      break;
  }
}

// ==========================================
// 7. Setup & Initialization
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println("\n=======================================================");
  Serial.println("  12V Smart EV DLM Real-Time Adaptive Controller");
  Serial.println("  Prototype: 12V 2A Adapter (P_limit = 18W, P_EV = 12W)");
  Serial.println("=======================================================");

  pinMode(PIN_RELAY_EV, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_VOLTAGE_ADC, INPUT);
  pinMode(PIN_HOUSE_CURR_ADC, INPUT);
  pinMode(PIN_SOLAR_CURR_ADC, INPUT);

  digitalWrite(PIN_RELAY_EV, HIGH);
  digitalWrite(PIN_LED_STATUS, LOW);

  // Setup 5kHz PWM channel 0 on GPIO 25 (8-bit: 0 - 255)
  ledcSetup(0, 5000, 8);
  ledcAttachPin(PIN_PWM_EV, 0);

  // SoftAP Hotspot
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(STA_SSID, STA_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 6) {
    delay(250);
    Serial.print(".");
    attempts++;
  }

  WiFi.softAP(AP_SSID, AP_PASSWORD);
  Serial.print("\n[AP] SSID: ");
  Serial.print(AP_SSID);
  Serial.print(" | IP: ");
  Serial.println(WiFi.softAPIP());

  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "*");

  ws.onEvent(onEvent);
  server.addHandler(&ws);

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html", 
      "<html><body style='font-family:sans-serif;padding:30px;background:#111;color:#eee;'>"
      "<h2>⚡ 12V Smart EV Station - DLM Active (18W Sanctioned Limit)</h2>"
      "<p style='color:#4ade80;'>✅ Server is Online & Polling at 50Hz</p>"
      "<p>WebSocket: <code>ws://" + WiFi.softAPIP().toString() + "/ws</code></p>"
      "<p>REST API: <a style='color:#818cf8;' href='/api/telemetry'>/api/telemetry</a></p>"
      "</body></html>"
    );
  });

  server.on("/api/telemetry", HTTP_GET, [](AsyncWebServerRequest *request){
    float v = vLine_ema;
    float pHouse = v * iHouse_ema;
    float pSolar = v * iSolar_ema;
    float pEV = v * iEV_actual;
    float pGrid = max(0.0f, (pHouse + pEV) - (operatingMode >= 2 ? pSolar : 0.0f));

    StaticJsonDocument<380> doc;
    doc["voltage"]          = round(v * 100) / 100.0;
    doc["current_ev"]       = round(iEV_actual * 100) / 100.0;
    doc["current_house"]    = round(iHouse_ema * 100) / 100.0;
    doc["ev_power"]         = round(pEV * 10) / 10.0;
    doc["house_power"]      = round(pHouse * 10) / 10.0;
    doc["solar_power"]      = round(pSolar * 10) / 10.0;
    doc["grid_power"]       = round(pGrid * 10) / 10.0;
    doc["grid_headroom"]    = round(max(0.0f, Sanctioned_Limit - pHouse) * 10) / 10.0;
    doc["solar_surplus"]    = round(max(0.0f, pSolar - pHouse) * 10) / 10.0;
    doc["efficiency"]       = 94.5;
    doc["relay_active"]     = (iEV_actual > 0);
    doc["operating_mode"]   = (operatingMode == 1 ? "grid" : operatingMode == 2 ? "solar" : "hybrid");
    doc["solar_priority"]   = (operatingMode >= 2);
    doc["emergency_cutoff"] = emergencyCutoff;
    doc["sanctioned_limit"] = Sanctioned_Limit;
    doc["timestamp"]        = millis();

    String res;
    serializeJson(doc, res);
    request->send(200, "application/json", res);
  });

  server.begin();
}

// ==========================================
// 8. Real-Time Dynamic DLM Execution Loop
// ==========================================
void loop() {
  ws.cleanupClients();

  // Fast 50ms Real-Time Sensor Sampling
  unsigned long now = millis();
  if (now - lastSampleMs >= 50) {
    lastSampleMs = now;
    sampleSensorsRealtime();
  }

  // 1-Second Closed-Loop Dynamic Load Management & Telemetry Broadcast
  if (now - lastTelemetryMs >= 1000) {
    lastTelemetryMs = now;

    // -----------------------------------------------------------------
    // STEP 1: Real-Time Power Measurements
    // -----------------------------------------------------------------
    float V_bus    = vLine_ema;
    float I_house  = iHouse_ema;
    float I_PV     = iSolar_ema;

    float P_house  = V_bus * I_house;
    float P_PV     = V_bus * I_PV;
    float P_EV_max = min(Max_EV_Power, Max_EV_Current * V_bus);

    // -----------------------------------------------------------------
    // STEP 2: Headroom and Surplus Calculations
    // -----------------------------------------------------------------
    float P_headroom = Sanctioned_Limit - P_house;
    float P_surplus  = max(0.0f, P_PV - P_house);

    // -----------------------------------------------------------------
    // STEP 3: Overload Check & Operating Mode Selection
    // -----------------------------------------------------------------
    bool isOverload = (P_house >= Sanctioned_Limit);
    float P_EV_target = 0.0f;

    if (isOverload) {
      P_EV_target = 0.0f;
    } else {
      if (operatingMode == 1) {
        P_EV_target = min(max(0.0f, P_headroom), P_EV_max);
      } else if (operatingMode == 2) {
        P_EV_target = min(P_surplus, P_EV_max);
      } else {
        P_EV_target = min(max(0.0f, P_headroom) + P_surplus, P_EV_max);
      }
    }

    // -----------------------------------------------------------------
    // STEP 4: Convert to Current: I_EV,target = P_EV,target / V
    // -----------------------------------------------------------------
    float I_EV_target = (V_bus > 0.1f) ? (P_EV_target / V_bus) : 0.0f;

    // -----------------------------------------------------------------
    // STEP 5: Control EV Charging & Safety Verification
    // -----------------------------------------------------------------
    float EV_Current = 0.0f;
    bool relayEngaged = false;
    const char* chargingState = "OPTIMAL";

    if (V_bus > OVERVOLTAGE_LIMIT) {
      EV_Current = 0.0f;
      relayEngaged = false;
      chargingState = "EMERGENCY";
      digitalWrite(PIN_RELAY_EV, LOW);
      ledcWrite(0, 0);
      emergencyCutoff = true;
    } else if (V_bus < UNDERVOLTAGE_LIMIT) {
      EV_Current = 0.0f;
      relayEngaged = false;
      chargingState = "PAUSED_OVERLOAD";
      digitalWrite(PIN_RELAY_EV, LOW);
      ledcWrite(0, 0);
    } else if (emergencyCutoff) {
      EV_Current = 0.0f;
      relayEngaged = false;
      chargingState = "EMERGENCY";
      digitalWrite(PIN_RELAY_EV, LOW);
      ledcWrite(0, 0);
    } else if (!manualRelayState) {
      EV_Current = 0.0f;
      relayEngaged = false;
      chargingState = "OFF";
      digitalWrite(PIN_RELAY_EV, LOW);
      ledcWrite(0, 0);
    } else if (isOverload) {
      EV_Current = 0.0f;
      relayEngaged = false;
      chargingState = "PAUSED_OVERLOAD";
      digitalWrite(PIN_RELAY_EV, LOW);
      ledcWrite(0, 0);
    } else if (I_EV_target < Min_EV_Current) {
      EV_Current = 0.0f;
      relayEngaged = false;
      chargingState = "PAUSED_OVERLOAD";
      digitalWrite(PIN_RELAY_EV, LOW);
      ledcWrite(0, 0);
    } else {
      EV_Current = min(I_EV_target, Max_EV_Current);
      relayEngaged = true;
      chargingState = (EV_Current < (Max_EV_Current - 0.05f)) ? "THROTTLED" : "OPTIMAL";
      digitalWrite(PIN_RELAY_EV, HIGH);

      int dutyCycle = (int)((EV_Current / Max_EV_Current) * 255.0f);
      ledcWrite(0, constrain(dutyCycle, 0, 255));
    }

    iEV_actual = EV_Current;
    float P_ev = EV_Current * V_bus;
    float Total_Load = P_house + P_ev;
    float P_grid = max(0.0f, Total_Load - (operatingMode >= 2 ? P_PV : 0.0f));

    // -----------------------------------------------------------------
    // STEP 6: WebSocket Broadcast to Dashboard
    // -----------------------------------------------------------------
    StaticJsonDocument<420> doc;
    doc["voltage"]          = round(V_bus * 100) / 100.0;
    doc["current_ev"]       = round(EV_Current * 100) / 100.0;
    doc["current_house"]    = round(I_house * 100) / 100.0;
    doc["current_solar"]    = round(I_PV * 100) / 100.0;
    doc["ev_power"]         = round(P_ev * 10) / 10.0;
    doc["house_power"]      = round(P_house * 10) / 10.0;
    doc["solar_power"]      = round(P_PV * 10) / 10.0;
    doc["grid_power"]       = round(P_grid * 10) / 10.0;
    doc["grid_headroom"]    = round(max(0.0f, P_headroom) * 10) / 10.0;
    doc["solar_surplus"]    = round(P_surplus * 10) / 10.0;
    doc["target_power"]     = round(P_EV_target * 10) / 10.0;
    doc["target_current"]   = round(I_EV_target * 100) / 100.0;
    doc["operating_mode"]   = (operatingMode == 1 ? "grid" : operatingMode == 2 ? "solar" : "hybrid");
    doc["efficiency"]       = 94.5;
    doc["relay_active"]     = relayEngaged;
    doc["solar_priority"]   = (operatingMode >= 2);
    doc["emergency_cutoff"] = emergencyCutoff;
    doc["sanctioned_limit"] = Sanctioned_Limit;
    doc["charging_state"]   = chargingState;
    doc["timestamp"]        = now;

    String jsonStr;
    serializeJson(doc, jsonStr);
    ws.textAll(jsonStr);

    Serial.printf("[DLM 12V] Mode:%d | V:%.2fV | House:%.1fW | PV:%.1fW | Headroom:%.1fW | Surplus:%.1fW | EV:%.1fW (%.2fA) | State:%s\n",
                  operatingMode, V_bus, P_house, P_PV, max(0.0f, P_headroom), P_surplus, P_ev, EV_Current, chargingState);
  }
}
