"use client";

import React, { useState, useEffect } from "react";
import { Zap, Sun, Activity, ShieldAlert, Cpu } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { PowerChart } from "@/components/PowerChart";
import { Controls } from "@/components/Controls";

interface PowerSnapshot {
  time: string;
  solar: number;
  grid: number;
  ev: number;
}

export default function Home() {
  const [data, setData] = useState<PowerSnapshot[]>([]);
  const [stats, setStats] = useState({
    solar: 5.2,
    grid: 4.5,
    ev: 3.2,
    efficiency: 94,
  });

  // Simulate real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const lastEntry = prev[prev.length - 1] || { solar: 5.2, grid: 4.5, ev: 3.2 };

        // Dynamic Load Management Simulation
        const solarChange = (Math.random() - 0.5) * 0.4;
        const newSolar = Math.max(0, lastEntry.solar + solarChange);

        // IF solar is high, grid goes down for EV
        const newEv = 3.2 + (Math.random() - 0.5) * 0.1;
        const newGrid = Math.max(0.5, 9.7 - newSolar); // Simplified DLM logic

        const newData = [...prev.slice(-19), {
          time: newTime,
          solar: parseFloat(newSolar.toFixed(2)),
          grid: parseFloat(newGrid.toFixed(1)),
          ev: parseFloat(newEv.toFixed(1)),
        }];

        setStats({
          solar: parseFloat(newSolar.toFixed(2)),
          grid: parseFloat(newGrid.toFixed(1)),
          ev: parseFloat(newEv.toFixed(1)),
          efficiency: 92 + Math.floor(Math.random() * 6),
        });

        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            <Cpu className="text-purple-500" size={32} />
            Smart EV <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Charging Station</span>
          </h1>
          <p className="text-gray-400 mt-2 font-medium">B.Tech Final Year Project • IoT Energy Management System</p>
        </div>

        <div className="glass px-4 py-2 rounded-full border-white/5 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">ESP32: Connected</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-400" size={14} />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lat: 42ms</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Solar Generation"
          value={stats.solar.toString()}
          unit="kW"
          icon={Sun}
          trend="+12% vs last hour"
          color="success"
        />
        <StatsCard
          title="Utility Grid Draw"
          value={stats.grid.toString()}
          unit="kW"
          icon={Activity}
          trend="-5% Peak Saving"
          color="primary"
        />
        <StatsCard
          title="EV Charging Load"
          value={stats.ev.toString()}
          unit="kW"
          icon={Zap}
          color="accent"
        />
        <StatsCard
          title="System Efficiency"
          value={stats.efficiency.toString()}
          unit="%"
          icon={ShieldAlert}
          color="warning"
        />
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PowerChart data={data} />
        </div>
        <div className="lg:col-span-1">
          <Controls />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="pt-8 border-t border-white/5 flex items-center justify-between text-gray-500">
        <p className="text-xs font-semibold">Node-RED Backend Interface • MQTT Protocol v3.1</p>
        <p className="text-xs font-semibold">Group 1 • final-year-project-2026</p>
      </div>
    </main>
  );
}
