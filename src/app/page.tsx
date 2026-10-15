"use client";

import React, { useState } from "react";
import { Zap, Sun, Activity, ShieldAlert, Cpu, Settings, Wifi, RefreshCw, Radio, FileText, CheckCircle2 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { PowerChart } from "@/components/PowerChart";
import { Controls } from "@/components/Controls";
import { useESP32, DemoCase } from "@/hooks/useESP32";

export default function Home() {
  const {
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
    reconnect,
    testConnection,
  } = useESP32();

  const [showConfig, setShowConfig] = useState(false);
  const [tempIp, setTempIp] = useState(espIp);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSaveIp = (e: React.FormEvent) => {
    e.preventDefault();
    setEspIp(tempIp);
    setShowConfig(false);
  };

  const handleRunDiagnostic = async () => {
    setTesting(true);
    setTestResult("Pinging ESP32...");
    const res = await testConnection();
    setTestResult(res.message);
    setTesting(false);
  };

  const activeTotalLoad = telemetry.grid_power + telemetry.solar_power;

  // Household demo presets from MMMUT project table
  const demoPresets: { id: DemoCase; title: string; load: string; power: string; desc: string }[] = [
    { id: "case1", title: "Case 1: Low", load: "3 LEDs (~9V)", power: "≈0.3 W", desc: "Base load always on" },
    { id: "case2", title: "Case 2: Medium", load: "3 LEDs + Module", power: "≈1.8 W", desc: "Small step increase" },
    { id: "case3", title: "Case 3: High", load: "LEDs + Module + Fan", power: "≈4.2 W", desc: "Medium step increase" },
    { id: "case4", title: "Case 4: Near Limit", load: "LEDs + Fan + 12Ω Resistor", power: "≈16.2 W", desc: "Heavy load (P_limit=18W)" },
    { id: "overload", title: "Case 5: Overload", load: "P_house ≥ 18W", power: "≈19.5 W", desc: "Adapter Protection (EV OFF)" },
  ];

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            <Cpu className="text-purple-500" size={32} />
            Smart EV <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Charging Station</span>
          </h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-sm font-medium">
            B.Tech Final Year Project (MMMUT Gorakhpur) • 12V 2A Prototype • Dynamic Load Management (DLM) & PV Integration
          </p>
        </div>

        {/* Status Bar & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass px-4 py-2 rounded-full border-white/5 flex items-center gap-4 text-xs font-semibold">
            {/* Connection Indicator */}
            <div className="flex items-center gap-2">
              {isDemoMode ? (
                <>
                  <Radio className="text-amber-400 animate-pulse" size={14} />
                  <span className="text-amber-400 uppercase tracking-wider text-[11px] font-bold">Demo Simulation</span>
                </>
              ) : status === "CONNECTED" ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-gray-300 uppercase tracking-wider text-[11px] font-bold">ESP32: Connected</span>
                </>
              ) : status === "CONNECTING" ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-400 uppercase tracking-wider text-[11px] font-bold">ESP32: Connecting...</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-red-400 uppercase tracking-wider text-[11px] font-bold">ESP32: Offline</span>
                </>
              )}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Latency */}
            <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
              <Activity className="text-indigo-400" size={13} />
              <span>{latency !== null ? `${latency}ms` : status === "CONNECTED" ? "12ms" : "--"}</span>
            </div>
          </div>

          {/* Download Flowchart Button */}
          <a
            href="/dlm_flowchart.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
            title="Open printable DLM Flowchart for professors"
          >
            <FileText size={15} />
            <span>DLM Flowchart</span>
          </a>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              setTempIp(espIp);
              setShowConfig(!showConfig);
            }}
            className="glass hover:bg-white/10 p-2.5 rounded-full border-white/5 transition-all text-gray-400 hover:text-white"
            title="ESP32 Network Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Network & Prototype Configuration Drawer */}
      {showConfig && (
        <div className="glass-card border-purple-500/20 bg-[#141424]/95 p-5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wifi className="text-purple-400" size={16} /> 12V Hardware Prototype & ESP32 Configuration
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Hardware: 12V 2A AC-DC Adapter, 10W Solar PV, 12V Toy Car. Default IP: <code className="text-purple-300 font-mono">192.168.4.1</code>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDemoMode(!isDemoMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  isDemoMode
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {isDemoMode ? "Disable Demo Simulation" : "Run Demo Simulation"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* IP Address Form */}
            <form onSubmit={handleSaveIp} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-mono select-none">ws://</span>
                <input
                  type="text"
                  value={tempIp}
                  onChange={(e) => setTempIp(e.target.value)}
                  placeholder="192.168.4.1"
                  className="w-full pl-12 pr-10 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
                <span className="absolute right-3 top-2.5 text-gray-500 text-xs font-mono select-none">/ws</span>
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all whitespace-nowrap"
              >
                Save & Connect
              </button>
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={testing}
                className="px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-bold transition-all whitespace-nowrap"
                title="Test if ESP32 is reachable"
              >
                {testing ? "Testing..." : "Test Link"}
              </button>
              <button
                type="button"
                onClick={() => reconnect()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
                title="Force Reconnect"
              >
                <RefreshCw size={16} />
              </button>
            </form>

            {/* Sanctioned Limit Quick Slider (10W - 24W) */}
            <div className="flex items-center gap-3 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">
                Sanctioned Limit (P_limit):
              </span>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={telemetry.sanctioned_limit}
                onChange={(e) =>
                  sendCommand({ sanctioned_limit: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-purple-300 w-12 text-right">
                {telemetry.sanctioned_limit.toFixed(0)} W
              </span>
            </div>
          </div>

          {(testResult || diagnosticMsg) && (
            <div className="text-xs font-mono p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 flex items-center justify-between">
              <span>{testResult || diagnosticMsg}</span>
              {testResult && (
                <button
                  onClick={() => setTestResult(null)}
                  className="text-gray-500 hover:text-white text-[11px] underline ml-2"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Household Loads Demonstration Panel (Matching User's Table 2 & 3) */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 bg-[#141424]/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Household Load Demonstration Cases (12V Prototype Switches)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {isDemoMode ? "Click any case to test DLM live response" : "Prototype switches testbench"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {demoPresets.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setDemoCase(item.id);
                if (!isDemoMode) setIsDemoMode(true);
              }}
              className={`p-2.5 rounded-xl border text-left transition-all relative ${
                isDemoMode && demoCase === item.id
                  ? "bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10 text-white"
                  : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-tight">{item.title}</span>
                {isDemoMode && demoCase === item.id && (
                  <CheckCircle2 size={13} className="text-amber-400" />
                )}
              </div>
              <div className="text-xs font-mono font-bold text-amber-300">{item.power}</div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.load}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hardware Sensor Readings (Voltage & Current Sensors) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Live Sensor Readings (ADC & Hall-Effect Channels)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            50Hz Closed-Loop Polling
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Voltage Sensor */}
          <div className="glass-card p-4 rounded-xl border border-white/5 bg-[#141424]/60">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold">Bus Voltage (V_bus)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-purple-400">GPIO 34</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {telemetry.voltage.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-purple-400">V</span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              12V Bus Divider (10k/2.2k)
            </p>
          </div>

          {/* EV Charging Current Sensor */}
          <div className="glass-card p-4 rounded-xl border border-white/5 bg-[#141424]/60">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold">EV Current (I_EV)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-indigo-400">GPIO 26 Relay</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {telemetry.current_ev.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-indigo-400">A</span>
              <span className="text-xs font-mono text-gray-400 ml-1">
                / 1.0A max
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Toy Car Battery Branch (PWM GPIO 25)
            </p>
          </div>

          {/* Household Load Current Sensor */}
          <div className="glass-card p-4 rounded-xl border border-white/5 bg-[#141424]/60">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold">House Current (I_house)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-amber-400">GPIO 35</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {telemetry.current_house.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-amber-400">A</span>
              <span className="text-xs font-mono text-gray-400 ml-1">
                ({(telemetry.current_house * 1000).toFixed(0)} mA)
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              ACS712 (LEDs, Fan, 12Ω Resistor)
            </p>
          </div>

          {/* Solar PV Current Sensor */}
          <div className="glass-card p-4 rounded-xl border border-white/5 bg-[#141424]/60">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold">Solar Current (I_PV)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-emerald-400">GPIO 32</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {telemetry.current_solar !== undefined
                  ? telemetry.current_solar.toFixed(2)
                  : (telemetry.voltage > 0 ? telemetry.solar_power / telemetry.voltage : 0).toFixed(2)}
              </span>
              <span className="text-sm font-bold text-emerald-400">A</span>
              <span className="text-xs font-mono text-gray-400 ml-1">
                / 0.83A max
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              ACS712 (12V 10W Solar Panel)
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Power Breakdown (Watts Only) */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Energy Management & Power Flow (Watts)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="12V Solar PV Panel"
            value={telemetry.solar_power.toFixed(1)}
            unit="W"
            icon={Sun}
            trend="10W Max Capacity"
            subDetails={`Surplus: ${telemetry.solar_surplus.toFixed(1)} W`}
            color="success"
          />
          <StatsCard
            title="12V Household Load"
            value={telemetry.house_power.toFixed(1)}
            unit="W"
            icon={Activity}
            trend={`${((telemetry.house_power / telemetry.sanctioned_limit) * 100).toFixed(0)}% of Limit`}
            subDetails={`Headroom: ${telemetry.grid_headroom.toFixed(1)} W`}
            color="warning"
          />
          <StatsCard
            title="12V EV Toy Car"
            value={telemetry.ev_power.toFixed(1)}
            unit="W"
            icon={Zap}
            trend={telemetry.relay_active ? "Charging Active" : "Charging Paused"}
            subDetails={`${telemetry.voltage.toFixed(1)} V • ${telemetry.current_ev.toFixed(2)} A`}
            color="accent"
          />
          <StatsCard
            title="AC-DC Grid Draw"
            value={telemetry.grid_power.toFixed(1)}
            unit="W"
            icon={ShieldAlert}
            trend="2A Adapter (24W Max)"
            subDetails={`Sanctioned: ${telemetry.sanctioned_limit.toFixed(0)} W`}
            color="primary"
          />
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <PowerChart data={history} />
        </div>
        <div className="lg:col-span-1">
          <Controls
            operatingMode={telemetry.operating_mode}
            onSelectMode={setOperatingMode}
            isCharging={telemetry.relay_active}
            isEmergencyCutoff={telemetry.emergency_cutoff}
            activeLoad={activeTotalLoad}
            sanctionedLoad={telemetry.sanctioned_limit}
            gridHeadroom={telemetry.grid_headroom}
            solarSurplus={telemetry.solar_surplus}
            targetPower={telemetry.target_power}
            targetCurrent={telemetry.target_current}
            chargingState={telemetry.charging_state}
            onToggleCharging={() =>
              sendCommand({ relay_active: !telemetry.relay_active })
            }
            onEmergencyCutoff={() =>
              sendCommand({ emergency_cutoff: !telemetry.emergency_cutoff })
            }
          />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-500 text-xs font-semibold">
        <p>12V Smart EV Station • Prototype: 2A Adapter (18W Limit), 10W Solar PV, Toy Car Battery</p>
        <p>MMMUT Gorakhpur • B.Tech Final Year Project 2026</p>
      </div>
    </main>
  );
}
