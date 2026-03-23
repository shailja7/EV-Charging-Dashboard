"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface StatsCardProps {
    title: string;
    value: string;
    unit: string;
    icon: LucideIcon;
    trend?: string;
    color?: "primary" | "accent" | "success" | "warning";
    className?: string;
}

const colorMap = {
    primary: "text-purple-400 group-hover:text-purple-300",
    accent: "text-indigo-400 group-hover:text-indigo-300",
    success: "text-emerald-400 group-hover:text-emerald-300",
    warning: "text-amber-400 group-hover:text-amber-300",
};

export const StatsCard = ({
    title,
    value,
    unit,
    icon: Icon,
    trend,
    color = "primary",
    className,
}: StatsCardProps) => {
    return (
        <div className={cn("glass-card group", className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-bold tracking-tight text-white group-hover:text-glow transition-all duration-300">
                            {value}
                        </h3>
                        <span className="text-sm font-semibold text-gray-500">{unit}</span>
                    </div>
                    {trend && (
                        <p className="mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1">
                            <span>↑</span> {trend}
                        </p>
                    )}
                </div>
                <div className={cn("p-3 rounded-xl bg-white/5", colorMap[color])}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
};
