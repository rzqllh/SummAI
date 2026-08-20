"use client";

import { motion, useReducedMotion } from "motion/react";

export function PrivacyGrid() {
  const shouldReduceMotion = useReducedMotion();

  const points = [
    {
      label: "LOCAL SQLITE",
      title: "Local Database File on Disk",
      description:
        "All meeting records, word-for-word transcripts, and synthesized markdown summaries are saved directly to your local SQLite database. Zero telemetry and zero remote database sync.",
    },
    {
      label: "BRING YOUR OWN KEYS",
      title: "Direct API Key Connection",
      description:
        "Direct integration with your personal Groq and Google Gemini API keys. No middleware proxy reading, caching, or training on your proprietary discussions.",
    },
    {
      label: "NO SUBSCRIPTION",
      title: "Zero Per-Seat SaaS Lock-In",
      description:
        "Forget $30/month per-seat AI meeting tools. Groq Whisper and Gemini Flash provide transcription and synthesis within generous free tiers and pennies-per-hour pay-as-you-go rates.",
    },
    {
      label: "SELF-HOSTABLE",
      title: "Standalone Python & Next.js Architecture",
      description:
        "FastAPI backend and Next.js frontend run completely standalone on your local machine or inside your private VPC cluster.",
    },
  ];

  return (
    <motion.section
      id="privacy"
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-20 border-t border-slate-800/80 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Eyebrow */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider font-mono">
            <span>Security & Cost Architecture</span>
          </div>
        </div>

        {/* Large Statement Line */}
        <div className="max-w-4xl mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-display leading-[1.2]">
            No cloud databases. No per-seat subscriptions. Your meeting records never leave your control.
          </h2>
        </div>

        {/* Typographic List-Strip with Hairline Borders */}
        <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
          {points.map((point) => (
            <div
              key={point.label}
              className="py-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline"
            >
              {/* Left Column: Monospace Category Label */}
              <div className="md:col-span-4">
                <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                  {point.label}
                </span>
                <h3 className="text-base font-semibold text-white mt-1">
                  {point.title}
                </h3>
              </div>

              {/* Right Column: Clear Factual Description */}
              <div className="md:col-span-8">
                <p className="text-slate-400 text-sm leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
