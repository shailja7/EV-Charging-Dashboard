"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type OperatingMode = "grid" | "solar" | "hybrid";
export type DemoCase = "case1" | "case2" | "case3" | "case4" | "overload" | "dynamic";

export interface TelemetryData {
  voltage: number;          // V (nominal 12V)
  current_ev: number;       // A (max 1.0A)
  current_house: number;    // A (0.02A - 1.5A)
  current_solar?: number;   // A (0 - 0.83A)
  ev_power: number;         // W (max 12W)
  house_power: number;      // W (0.3W - 18W+)
  solar_power: number;      // W (max 10W)
  grid_power: number;       // W (max 24W adapter)
  grid_headroom: number;    // W (P_limit - P_house)
  solar_surplus: number;    // W (max(0, P_PV - P_house))
  target_power?: number;    // W (calculated based on mode)
  target_current: number;   // A (target_power / voltage)
  efficiency: number;       // %
  relay_active: boolean;    // Contactor state (CLOSED = true, OPEN = false)
  operating_mode: OperatingMode; // Mode 1: grid, Mode 2: solar, Mode 3: hybrid
  solar_priority: boolean;  // Kept for backward compatibility
  emergency_cutoff: boolean;
  sanctioned_limit: number; // W (Default 18.0W for 12V 2A adapter prototype)
  charging_state: "OPTIMAL" | "THROTTLED" | "PAUSED_OVERLOAD" | "OFF" | "EMERGENCY";
  timestamp?: number;
}

export interface PowerSnapshot {
  time: string;
  solar: number;     // W
  grid: number;      // W
  ev: number;        // W
  house: number;     // W
}

export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "HTTP_FALLBACK" | "ERROR";

const DEFAULT_IP = "192.168.4.1"; // Default ESP32 SoftAP IP

export function useESP32() {
  const [espIp, setEspIpState] = useState<string>(DEFAULT_IP);
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const [latency, setLatency] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoCase, setDemoCase] = useState<DemoCase>("case2");
  const [diagnosticMsg, setDiagnosticMsg] = useState<string>("");

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    voltage: 12.0,
    current_ev: 1.0,
    current_house: 0.15,
    current_solar: 0.50,
    ev_power: 12.0,
    house_power: 1.8,
    solar_power: 6.0,
    grid_power: 7.8,
    grid_headroom: 16.2,
    solar_surplus: 4.2,
    target_power: 12.0,
    target_current: 1.0,
    efficiency: 94.5,
    relay_active: true,
    operating_mode: "hybrid",
    solar_priority: true,
    emergency_cutoff: false,
    sanctioned_limit: 18.0,
    charging_state: "OPTIMAL",
  });

  const [history, setHistory] = useState<PowerSnapshot[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const pingTimeRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const httpPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved IP from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedIp = localStorage.getItem("esp32_ip");
      if (savedIp) {
        setEspIpState(savedIp);
      }
    }
  }, []);

  const setEspIp = (ip: string) => {
    const trimmed = ip.trim().replace(/^https?:\/\//, "").replace(/^ws:\/\//, "").replace(/\/.*$/, "");
    setEspIpState(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem("esp32_ip", trimmed);
    }
  };

  // Append data point to history chart
  const appendHistory = useCallback((solar: number, grid: number, ev: number, house: number) => {
    const newTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setHistory((prev) => [
      ...prev.slice(-19),
      {
        time: newTime,
        solar: parseFloat(solar.toFixed(1)),
        grid: parseFloat(grid.toFixed(1)),
        ev: parseFloat(ev.toFixed(1)),
        house: parseFloat(house.toFixed(1)),
      },
    ]);
  }, []);

  // Update telemetry data from raw message
  const updateTelemetryData = useCallback((data: Record<string, unknown>) => {
    setTelemetry((prev) => {
      const v = typeof data.voltage === "number" ? data.voltage : prev.voltage;
      const pHouse = typeof data.house_power === "number" ? data.house_power : prev.house_power;
      const pSolar = typeof data.solar_power === "number" ? data.solar_power : prev.solar_power;
      const pEV = typeof data.ev_power === "number" ? data.ev_power : prev.ev_power;
      const pGrid = typeof data.grid_power === "number" ? data.grid_power : prev.grid_power;
      const sLimit = typeof data.sanctioned_limit === "number" ? data.sanctioned_limit : prev.sanctioned_limit;
      const opMode: OperatingMode = (data.operating_mode === "grid" || data.operating_mode === "solar" || data.operating_mode === "hybrid")
        ? data.operating_mode
        : prev.operating_mode;

      appendHistory(pSolar, pGrid, pEV, pHouse);

      return {
        voltage: v,
        current_ev: typeof data.current_ev === "number" ? data.current_ev : prev.current_ev,
        current_house: typeof data.current_house === "number" ? data.current_house : prev.current_house,
        current_solar: typeof data.current_solar === "number" ? data.current_solar : prev.current_solar,
        ev_power: pEV,
        house_power: pHouse,
        solar_power: pSolar,
        grid_power: pGrid,
        grid_headroom: typeof data.grid_headroom === "number" ? data.grid_headroom : Math.max(0, sLimit - pHouse),
        solar_surplus: typeof data.solar_surplus === "number" ? data.solar_surplus : Math.max(0, pSolar - pHouse),
        target_power: typeof data.target_power === "number" ? data.target_power : prev.target_power,
        target_current: typeof data.target_current === "number" ? data.target_current : prev.target_current,
        efficiency: typeof data.efficiency === "number" ? data.efficiency : prev.efficiency,
        relay_active: typeof data.relay_active === "boolean" ? data.relay_active : prev.relay_active,
        operating_mode: opMode,
        solar_priority: typeof data.solar_priority === "boolean" ? data.solar_priority : (opMode !== "grid"),
        emergency_cutoff: typeof data.emergency_cutoff === "boolean" ? data.emergency_cutoff : prev.emergency_cutoff,
        sanctioned_limit: sLimit,
        charging_state: (data.charging_state as TelemetryData["charging_state"]) || prev.charging_state,
        timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
      };
    });
  }, [appendHistory]);

  // Fallback to HTTP polling
  const startHttpPolling = useCallback(() => {
    if (httpPollingRef.current) clearInterval(httpPollingRef.current);
    setStatus("HTTP_FALLBACK");
    setDiagnosticMsg("WebSocket failed, falling back to HTTP REST API (/api/telemetry)...");

    const poll = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`http://${espIp}/api/telemetry`, {
          signal: controller.signal,
          mode: "cors",
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;
          updateTelemetryData(data);
          setStatus("CONNECTED");
          setDiagnosticMsg("");
        } else {
          setStatus("ERROR");
          setDiagnosticMsg(`HTTP ${res.status}: ${res.statusText}`);
        }
      } catch {
        setStatus("ERROR");
        setDiagnosticMsg("ESP32 HTTP endpoint unreachable. Running Demo Mode or connect to SmartEV_Station Wi-Fi.");
      }
    };

    poll();
    httpPollingRef.current = setInterval(poll, 1500);
  }, [espIp, updateTelemetryData]);

  // WebSocket Connection
  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isDemoMode) return;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (httpPollingRef.current) clearInterval(httpPollingRef.current);

    setStatus("CONNECTING");
    setDiagnosticMsg(`Attempting WebSocket connection to ws://${espIp}/ws...`);

    const wsUrl = `ws://${espIp}/ws`;
    let wsConnected = false;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      const connectTimeout = setTimeout(() => {
        if (!wsConnected && ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startHttpPolling();
        }
      }, 2500);

      ws.onopen = () => {
        wsConnected = true;
        clearTimeout(connectTimeout);
        setStatus("CONNECTED");
        setDiagnosticMsg("");
        pingTimeRef.current = Date.now();
        ws.send(JSON.stringify({ type: "ping", t: pingTimeRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") {
            const rtt = Date.now() - data.t;
            setLatency(rtt);
            return;
          }
          updateTelemetryData(data);
        } catch {
          // ignore malformed frame
        }
      };

      ws.onerror = () => {
        if (!wsConnected) {
          startHttpPolling();
        }
      };

      ws.onclose = () => {
        if (wsConnected) {
          setStatus("DISCONNECTED");
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    } catch {
      startHttpPolling();
    }
  }, [espIp, isDemoMode, startHttpPolling, updateTelemetryData]);

  // Test reachability
  const testConnection = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://${espIp}/api/telemetry`, {
        signal: controller.signal,
        mode: "cors",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return { ok: true, message: `Connected to ESP32 at http://${espIp}` };
      }
      return { ok: false, message: `ESP32 responded with status ${res.status}` };
    } catch (e: unknown) {
      const err = e as Error;
      return {
        ok: false,
        message: err.name === "AbortError"
          ? `Connection to ${espIp} timed out (2s)`
          : `Failed to reach ${espIp}. Check Wi-Fi connection to 'SmartEV_Station'.`,
      };
    }
  };

  // Send Command to ESP32
  const sendCommand = (cmd: Record<string, unknown>) => {
    if (isDemoMode) {
      setTelemetry((prev) => {
        const next = { ...prev };
        if (typeof cmd.mode === "string") {
          next.operating_mode = cmd.mode as OperatingMode;
          next.solar_priority = cmd.mode !== "grid";
        }
        if (typeof cmd.solar_priority === "boolean") {
          next.solar_priority = cmd.solar_priority;
          next.operating_mode = cmd.solar_priority ? "hybrid" : "grid";
        }
        if (typeof cmd.relay_active === "boolean") next.relay_active = cmd.relay_active;
        if (typeof cmd.sanctioned_limit === "number") next.sanctioned_limit = cmd.sanctioned_limit;
        if (typeof cmd.emergency_cutoff === "boolean") next.emergency_cutoff = cmd.emergency_cutoff;
        return next;
      });
      return;
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(cmd));
    }
  };

  const setOperatingMode = (mode: OperatingMode) => {
    sendCommand({ mode });
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (httpPollingRef.current) clearInterval(httpPollingRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  // Periodic ping
  useEffect(() => {
    if (status !== "CONNECTED" || isDemoMode) return;
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        socketRef.current.send(JSON.stringify({ type: "ping", t: pingTimeRef.current }));
      }
    }, 5000);
    return () => clearInterval(pingInterval);
  }, [status, isDemoMode]);

  // Demo simulation mode with exact logic from MMMUT 12V Prototype Diagram
  useEffect(() => {
    if (!isDemoMode) return;

    const simInterval = setInterval(() => {
      const now = Date.now();
      const V_bus = 12.0 + (Math.sin(now / 5000) * 0.15); // Stable 12V bus
      const P_limit = telemetry.sanctioned_limit || 18.0;   // Default 18W Sanctioned Limit
      const Max_EV_Power = 12.0;                           // 12W max EV power (1.0A at 12V)
      const Max_EV_Current = 1.0;                          // 1.0A max
      const Min_EV_Current = 0.2;                          // 0.2A cutoff

      // Determine household load based on selected scenario
      let P_house = 1.8;
      let P_PV = 6.0;

      if (demoCase === "case1") {
        // Case 1: 3 LEDs only (Base load)
        P_house = 0.3;
        P_PV = 4.0;
      } else if (demoCase === "case2") {
        // Case 2: 3 LEDs + Extra LED module
        P_house = 1.8;
        P_PV = 6.0;
      } else if (demoCase === "case3") {
        // Case 3: 3 LEDs + Extra module + 12V DC fan
        P_house = 4.2;
        P_PV = 8.0;
      } else if (demoCase === "case4") {
        // Case 4: 3 LEDs + Module + Fan + 12 Ohm Power Resistor (~12W)
        P_house = 16.2;
        P_PV = 9.0;
      } else if (demoCase === "overload") {
        // Overload Case: Load exceeds 18W sanctioned limit
        P_house = 19.5;
        P_PV = 5.0;
      } else {
        // Dynamic mode
        P_house = 3.0 + Math.sin(now / 3500) * 2.5;
        P_PV = 6.5 + Math.cos(now / 5000) * 3.0;
      }

      // 1. Calculate Headroom and Surplus
      const P_headroom = P_limit - P_house;
      const P_surplus = Math.max(0, P_PV - P_house);
      const P_EV_max = Math.min(Max_EV_Power, Max_EV_Current * V_bus);

      // 2. Overload Check
      const isOverload = (P_house >= P_limit);
      let P_EV_target = 0;

      if (isOverload) {
        P_EV_target = 0;
      } else {
        if (telemetry.operating_mode === "grid") {
          // Mode 1: Dynamic Grid Mode
          P_EV_target = Math.min(Math.max(0, P_headroom), P_EV_max);
        } else if (telemetry.operating_mode === "solar") {
          // Mode 2: Solar Priority Mode
          P_EV_target = Math.min(P_surplus, P_EV_max);
        } else {
          // Mode 3: Hybrid Mode (Solar + Grid Support)
          P_EV_target = Math.min(Math.max(0, P_headroom) + P_surplus, P_EV_max);
        }
      }

      // 3. Convert to Current
      const I_EV_target = V_bus > 0.1 ? P_EV_target / V_bus : 0;

      // 4. Control EV Charging & State
      let EV_Current = 0;
      let relayState = telemetry.relay_active;
      let chargingState: TelemetryData["charging_state"] = "OPTIMAL";

      if (telemetry.emergency_cutoff) {
        EV_Current = 0;
        relayState = false;
        chargingState = "EMERGENCY";
      } else if (!telemetry.relay_active) {
        EV_Current = 0;
        relayState = false;
        chargingState = "OFF";
      } else if (isOverload) {
        EV_Current = 0;
        relayState = false;
        chargingState = "PAUSED_OVERLOAD";
      } else if (I_EV_target < Min_EV_Current) {
        EV_Current = 0;
        relayState = false;
        chargingState = "PAUSED_OVERLOAD";
      } else {
        EV_Current = Math.min(I_EV_target, Max_EV_Current);
        relayState = true;
        chargingState = EV_Current < (Max_EV_Current - 0.05) ? "THROTTLED" : "OPTIMAL";
      }

      const EV_Power = EV_Current * V_bus;
      const Total_Station_Power = P_house + EV_Power;
      const Grid_Power = Math.max(0, Total_Station_Power - (telemetry.operating_mode !== "grid" ? P_PV : 0));

      const simTelemetry: TelemetryData = {
        voltage: parseFloat(V_bus.toFixed(2)),
        current_ev: parseFloat(EV_Current.toFixed(2)),
        current_house: parseFloat((P_house / V_bus).toFixed(2)),
        current_solar: parseFloat((P_PV / V_bus).toFixed(2)),
        ev_power: parseFloat(EV_Power.toFixed(1)),
        house_power: parseFloat(P_house.toFixed(1)),
        solar_power: parseFloat(P_PV.toFixed(1)),
        grid_power: parseFloat(Grid_Power.toFixed(1)),
        grid_headroom: parseFloat(Math.max(0, P_headroom).toFixed(1)),
        solar_surplus: parseFloat(P_surplus.toFixed(1)),
        target_power: parseFloat(P_EV_target.toFixed(1)),
        target_current: parseFloat(I_EV_target.toFixed(2)),
        efficiency: 94.5,
        relay_active: relayState,
        operating_mode: telemetry.operating_mode,
        solar_priority: telemetry.operating_mode !== "grid",
        emergency_cutoff: telemetry.emergency_cutoff,
        sanctioned_limit: P_limit,
        charging_state: chargingState,
      };

      setTelemetry(simTelemetry);
      appendHistory(simTelemetry.solar_power, simTelemetry.grid_power, simTelemetry.ev_power, simTelemetry.house_power);
      setLatency(12);
    }, 1000);

    return () => clearInterval(simInterval);
  }, [
    isDemoMode,
    demoCase,
    telemetry.operating_mode,
    telemetry.relay_active,
    telemetry.emergency_cutoff,
    telemetry.sanctioned_limit,
    appendHistory,
  ]);

  return {
    telemetry,
    history,
    status,
    latency,
    diagnosticMsg,
    espIp,
    setEspIp,
    isDemoMode,
    setIsDemoMode,
    demoCase,
    setDemoCase,
    sendCommand,
    setOperatingMode,
    reconnect: connect,
    testConnection,
  };
}
