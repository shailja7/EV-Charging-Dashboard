"use client";

import React from "react";
import { Sun, ShieldAlert, Zap } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ControlButtonProps {
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    color: string;
}

const ControlButton = ({ label, icon: Icon, isActive, onClick, color }: ControlButtonProps) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
            isActive
                ? `${color} border-current shadow-lg shadow-current/10`
                : "bg-white/5 border-white/10 text-gray-500 grayscale"
        )}
    >
        <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", isActive ? "bg-black/20" : "bg-white/5")}>
                <Icon size={20} />
            </div>
            <span className="font-semibold text-sm">{label}</span>
        </div>
        <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-current animate-pulse" : "bg-gray-700")} />
    </button>
);

export const Controls = () => {
    const [isSolarPriority, setIsSolarPriority] = React.useState(true);
    const [isCharging, setIsCharging] = React.useState(true);

    return (
        <div className="glass-card flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-wide">System Control</h3>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em] border border-emerald-500/20">
                    Operational
                </span>
            </div>

            <div className="space-y-4">
                <ControlButton
                    label="Solar Priority Mode"
                    icon={Sun}
                    isActive={isSolarPriority}
                    onClick={() => setIsSolarPriority(!isSolarPriority)}
                    color="text-emerald-400"
                />
                <ControlButton
                    label="Smart EV Charging"
                    icon={Zap}
                    isActive={isCharging}
                    onClick={() => setIsCharging(!isCharging)}
                    color="text-indigo-400"
                />
                <ControlButton
                    label="Emergency Cutoff"
                    icon={ShieldAlert}
                    isActive={false}
                    onClick={() => { }}
                    color="text-red-400"
                />
            </div>

            <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-gray-400">Sanctioned Load</span>
                    <span className="text-white font-mono">15.0 kW</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full w-[65%] transition-all duration-1000" />
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-gray-600">
                    <span>0 kW</span>
                    <span className="text-purple-400">9.7 kW Active</span>
                    <span>15 kW</span>
                </div>
            </div>
        </div>
    );
};
