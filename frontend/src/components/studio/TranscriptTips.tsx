"use client";

import { AudioLines, MessageSquare, FileText, Sparkles } from "lucide-react";

export function TranscriptTips() {
  const tips = [
    {
      icon: AudioLines,
      title: "Record in a quiet environment",
      description: "Clear audio improves transcription accuracy.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      icon: MessageSquare,
      title: "Multiple speakers",
      description: "Place speakers clearly and try to minimize overlap.",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      icon: FileText,
      title: "File quality & size",
      description: "Use high quality recordings. Max file size is 2GB.",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <span>Transcript tips</span>
        </h3>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
          Best Practice
        </span>
      </div>

      <div className="space-y-3.5">
        {tips.map((tip, idx) => {
          const Icon = tip.icon;
          return (
            <div key={idx} className="flex items-start gap-3 group">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${tip.bgColor} ${tip.borderColor} ${tip.color} transition-transform group-hover:scale-105`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs font-semibold text-slate-200">
                  {tip.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
