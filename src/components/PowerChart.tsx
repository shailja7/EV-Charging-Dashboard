"use client";

import React from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface PowerSnapshot {
    time: string;
    solar: number;
    grid: number;
    ev: number;
    house?: number;
}

interface PowerChartProps {
    data: PowerSnapshot[];
}

export const PowerChart = ({ data }: PowerChartProps) => {
    return (
        <div className="glass-card w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-wide">Energy Flow Monitor</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">12V Hardware Prototype Live Telemetry (Watts)</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow"></span>
                        12V Solar PV
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        12V EV Car
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        12V House Load
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        Grid Draw
                    </span>
                </div>
            </div>

            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorHouse" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                            unit=" W"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#11111b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
                            }}
                            itemStyle={{ fontSize: "12px", fontWeight: "600" }}
                            formatter={(value) => [`${Number(value ?? 0).toFixed(1)} W`]}
                        />
                        <Area
                            type="monotone"
                            dataKey="solar"
                            name="12V Solar PV"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSolar)"
                        />
                        <Area
                            type="monotone"
                            dataKey="ev"
                            name="12V EV Car"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorEV)"
                        />
                        <Area
                            type="monotone"
                            dataKey="house"
                            name="12V House Load"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorHouse)"
                        />
                        <Area
                            type="monotone"
                            dataKey="grid"
                            name="Grid Draw"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorGrid)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
