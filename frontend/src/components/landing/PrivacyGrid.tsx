"use client";

import { ShieldCheck, Key, HardDrive, DollarSign } from "lucide-react";

export function PrivacyGrid() {
  const highlights = [
    {
      icon: HardDrive,
      title: "100% Local SQLite Database",
      desc: "All meeting logs, raw audio transcripts, and synthesized markdown files are stored in your local SQLite DB. Zero telemetry.",
    },
    {
      icon: Key,
      title: "Bring Your Own API Keys",
      desc: "Direct integration with your Groq and Gemini API keys. No middleware proxy reading or retaining your corporate IP.",
    },
    {
      icon: DollarSign,
      title: "Zero SaaS Subscription Cost",
      desc: "Forget $30/month per seat AI meeting tools. Groq Whisper and Gemini Flash provide pennies-per-hour transcription efficiency.",
    },
    {
      icon: ShieldCheck,
      title: "Self-Hostable Architecture",
      desc: "FastAPI backend and Next.js frontend runs completely standalone on your local machine or private VPC cluster.",
    },
  ];

  return (
    <section id="privacy" className="py-20 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            <span>Security & Cost Efficiency</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Built for Privacy-First Engineering Teams
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Never compromise sensitive roadmap discussions or internal retrospectives.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3 glass-card-hover"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
