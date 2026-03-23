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
}

interface PowerChartProps {
    data: PowerSnapshot[];
}

export const PowerChart = ({ data }: PowerChartProps) => {
    return (
        <div className="glass-card h-[400px w-full]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white tracking-wide">Energy Flow Monitor</h3>
                <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow"></span>
                        Solar
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        Grid
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        EV Load
                    </span>
                </div>
            </div>

            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                            unit=" kW"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#11111b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
                            }}
                            itemStyle={{ fontSize: "12px", fontWeight: "600" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="solar"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSolar)"
                        />
                        <Area
                            type="monotone"
                            dataKey="grid"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorGrid)"
                        />
                        <Area
                            type="monotone"
                            dataKey="ev"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorEV)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
