"use client";

import React from "react";
import { ShieldAlert, Zap, Globe, Sun, Layers } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { OperatingMode } from "@/hooks/useESP32";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ControlsProps {
    operatingMode?: OperatingMode;
    onSelectMode?: (mode: OperatingMode) => void;
    isCharging?: boolean;
    isEmergencyCutoff?: boolean;
    onToggleCharging?: () => void;
    onEmergencyCutoff?: () => void;
    activeLoad?: number;          // in Watts
    sanctionedLoad?: number;      // in Watts (e.g. 18W)
    gridHeadroom?: number;        // in Watts
    solarSurplus?: number;        // in Watts
    targetPower?: number;         // in Watts
    targetCurrent?: number;       // in Amps
    chargingState?: "OPTIMAL" | "THROTTLED" | "PAUSED_OVERLOAD" | "OFF" | "EMERGENCY";
}

export const Controls = ({
    operatingMode = "hybrid",
    onSelectMode,
    isCharging = true,
    isEmergencyCutoff = false,
    onToggleCharging,
    onEmergencyCutoff,
    activeLoad = 13.8,
    sanctionedLoad = 18.0,
    gridHeadroom = 16.2,
    solarSurplus = 4.2,
    targetPower = 12.0,
    targetCurrent = 1.0,
    chargingState = "OPTIMAL",
}: ControlsProps) => {
    const loadPercentage = Math.min(100, Math.max(0, (activeLoad / sanctionedLoad) * 100));

    const stateBadges = {
        OPTIMAL: { label: "OPTIMAL: Full Charge", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
        THROTTLED: { label: "THROTTLED: Partial Power", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
        PAUSED_OVERLOAD: { label: "PAUSED: Overload / Low P", color: "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" },
        OFF: { label: "Station Standby", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
        EMERGENCY: { label: "EMERGENCY CUTOFF", color: "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse" },
    };

    const currentBadge = stateBadges[chargingState] || stateBadges.OPTIMAL;

    return (
        <div className="glass-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">DLM Controller</h3>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">12V, 2A Prototype Engine</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border ${currentBadge.color}`}>
                    {currentBadge.label}
                </span>
            </div>

            {/* DLM Real-time Equation Indicators */}
            <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 text-center font-mono">
                <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Headroom</span>
                    <span className="text-xs font-bold text-purple-300">{gridHeadroom.toFixed(1)} W</span>
                </div>
                <div className="border-x border-white/10 px-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Solar Surplus</span>
                    <span className="text-xs font-bold text-emerald-300">{solarSurplus.toFixed(1)} W</span>
                </div>
                <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Target EV</span>
                    <span className="text-xs font-bold text-indigo-300">
                        {targetPower !== undefined ? `${targetPower.toFixed(1)}W` : `${targetCurrent.toFixed(2)}A`}
                    </span>
                </div>
            </div>

            {/* 3-Way Operating Mode Selector (from Image 2) */}
            <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block px-0.5">
                    Operating Mode Selection
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => onSelectMode && onSelectMode("grid")}
                        className={cn(
                            "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all",
                            operatingMode === "grid"
                                ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        title="Mode 1: Uses available grid headroom only (no priority to PV)"
                    >
                        <Globe size={14} className="mb-0.5" />
                        <span className="text-[11px] font-semibold leading-tight">1. Grid</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectMode && onSelectMode("solar")}
                        className={cn(
                            "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all",
                            operatingMode === "solar"
                                ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        title="Mode 2: Uses only solar surplus for EV charging (stops if PV < house)"
                    >
                        <Sun size={14} className="mb-0.5" />
                        <span className="text-[11px] font-semibold leading-tight">2. Solar</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectMode && onSelectMode("hybrid")}
                        className={cn(
                            "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all",
                            operatingMode === "hybrid"
                                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        title="Mode 3: Uses solar surplus first, then remaining grid headroom"
                    >
                        <Layers size={14} className="mb-0.5" />
                        <span className="text-[11px] font-semibold leading-tight">3. Hybrid</span>
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 px-1 font-mono">
                    {operatingMode === "grid" && "P_target = min(Headroom, 12W) [Grid only]"}
                    {operatingMode === "solar" && "P_target = min(Solar_Surplus, 12W) [Pure green]"}
                    {operatingMode === "hybrid" && "P_target = min(Headroom + Surplus, 12W) [Default]"}
                </p>
            </div>

            {/* Actuation Controls */}
            <div className="space-y-2 pt-1">
                <button
                    onClick={() => onToggleCharging && onToggleCharging()}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                        isCharging && !isEmergencyCutoff
                            ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                            : "bg-white/5 border-white/10 text-gray-500 grayscale"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <div className={cn("p-1.5 rounded-lg", isCharging ? "bg-black/20" : "bg-white/5")}>
                            <Zap size={18} />
                        </div>
                        <span className="font-semibold text-xs">12V EV Toy Car Relay</span>
                    </div>
                    <div className={cn("w-2 h-2 rounded-full", isCharging && !isEmergencyCutoff ? "bg-indigo-400 animate-pulse" : "bg-gray-700")} />
                </button>

                <button
                    onClick={() => onEmergencyCutoff && onEmergencyCutoff()}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                        isEmergencyCutoff
                            ? "text-red-400 bg-red-500/20 border-red-500/40 shadow-lg shadow-red-500/20 animate-pulse"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <div className={cn("p-1.5 rounded-lg", isEmergencyCutoff ? "bg-red-900/40" : "bg-white/5")}>
                            <ShieldAlert size={18} />
                        </div>
                        <span className="font-semibold text-xs">{isEmergencyCutoff ? "System Locked (Click to Reset)" : "Emergency Cutoff"}</span>
                    </div>
                    <div className={cn("w-2 h-2 rounded-full", isEmergencyCutoff ? "bg-red-500" : "bg-gray-700")} />
                </button>
            </div>

            {/* Load Capacity Bar */}
            <div className="mt-1 space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-gray-400">Sanctioned Limit (P_limit)</span>
                    <span className="text-white font-mono font-bold">{sanctionedLoad.toFixed(1)} W</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                        className={cn(
                            "h-full transition-all duration-700",
                            loadPercentage >= 100 ? "bg-red-500 animate-pulse" : loadPercentage > 80 ? "bg-amber-500" : "bg-purple-500"
                        )}
                        style={{ width: `${loadPercentage}%` }} 
                    />
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-gray-400">
                    <span>0 W</span>
                    <span className={cn(
                        loadPercentage >= 100 ? "text-red-400 font-bold" : "text-purple-300"
                    )}>
                        {activeLoad.toFixed(1)} W Active ({loadPercentage.toFixed(0)}%)
                    </span>
                    <span>{sanctionedLoad.toFixed(0)} W</span>
                </div>
            </div>
        </div>
    );
};
