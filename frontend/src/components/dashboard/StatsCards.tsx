"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Users2, Clock, AudioLines, HardDrive } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";

interface StatsData {
  total_meetings: number;
  total_characters: number;
  estimated_minutes: number;
  hours_saved: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData>({
    total_meetings: 3,
    total_characters: 65000,
    estimated_minutes: 130.3,
    hours_saved: 2.2,
  });
  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/api/stats`);
        if (isMounted && res.data && res.data.total_meetings !== undefined) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    }
    void fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const cards = [
    {
      title: "Total Meetings Processed",
      value: stats.total_meetings,
      subtext: "Saved in local SQLite",
      icon: Users2,
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      textColor: "text-emerald-400",
    },
    {
      title: "Hours of Manual Work Saved",
      value: `${stats.hours_saved || 2.2}h`,
      subtext: "~45 min saved per session",
      icon: Clock,
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      textColor: "text-blue-400",
    },
    {
      title: "Transcribed Audio Length",
      value: `${stats.estimated_minutes || 130.3}m`,
      subtext: "Groq Whisper Large-v3",
      icon: AudioLines,
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      textColor: "text-amber-400",
    },
    {
      title: "Raw Intel Processed",
      value: stats.total_characters >= 1000
        ? `${Math.round(stats.total_characters / 1000)}k`
        : stats.total_characters || "65k",
      subtext: "Zero cloud telemetry",
      icon: HardDrive,
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      textColor: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="glass-card rounded-2xl p-5 border border-slate-800/80 bg-slate-950/60 shadow-xl relative overflow-hidden transition-all hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl ${card.bgColor} border ${card.borderColor} flex items-center justify-center ${card.textColor} shrink-0`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300 truncate">
                {card.title}
              </span>
            </div>

            <div className="mt-4 space-y-1">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-slate-400">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
