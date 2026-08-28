"use client";

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Play,
  Copy,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Hero() {
  const [copied, setCopied] = useState(false);

  const copyHeroSummary = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Groq Whisper Turbo + Gemini Flash Engine</span>
          </div>

          {/* Main Title with Fraunces font-display */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15] font-display">
            Bilingual discussions move fast. Your meeting notes{" "}
            <span className="text-emerald-400 font-normal italic">
              shouldn&apos;t lag behind.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Drop raw audio, video (MP4/MOV), or text transcripts. Get structured
            Corporate MoM, Action Items, and Executive Summaries in seconds
            with zero subscription lock-in.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/dashboard/summarizer" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-7 h-12 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Start a Summary</span>
              </Button>
            </Link>

            <Link href="#before-after" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 px-6 h-12 rounded-xl"
              >
                <span>See Output Examples</span>
              </Button>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sub-Second Whisper Transcription</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Direct MP4/Video Processing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Local SQLite Storage</span>
            </div>
          </div>
        </div>

        {/* Product Preview Mockup */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl p-px bg-slate-800/80 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden">
            {/* Mockup Window Bar - neutral dots */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  sprint-retrospective-q3.mp4 • Synthesized via Gemini Flash
                </span>
              </div>
              <button
                type="button"
                onClick={copyHeroSummary}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>

            {/* Mockup Content Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Audio Wave & Extracted Transcript */}
              <div className="md:col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      Audio Source
                    </span>
                    <span className="font-mono text-emerald-400">00:42:15</span>
                  </div>
                  {/* Waveform visual simulation */}
                  <div className="h-10 flex items-center justify-between gap-1 px-1">
                    {[40, 65, 30, 85, 95, 45, 70, 50, 80, 100, 60, 40, 75, 90, 35, 60, 80, 95, 40, 70, 50, 85, 30, 60, 45].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-full"
                          style={{ height: `${h}%` }}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 space-y-2">
                  <div className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>Raw Transcript Sample</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Whisper Large v3</span>
                  </div>
                  <p className="line-clamp-4 leading-relaxed font-mono text-[11px] text-slate-400">
                    &quot;...kita sepakat untuk deploy microservice baru di cluster staging hari Kamis. PIC backend mas Rizki, tolong make sure migration script SQLite ke PostgreSQL selesai sebelum jam 3 sore...&quot;
                  </p>
                </div>
              </div>

              {/* Right Column: AI Output preview */}
              <div className="md:col-span-7 p-5 rounded-xl bg-slate-900/60 border border-slate-800/90 text-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Preset: Corporate MoM & Action Plan
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Ready to export</span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 📌 Ringkasan Eksekutif
                    </h4>
                    <p className="text-slate-300 mt-1">
                      Finalisasi timeline migrasi cluster staging ke production dan pembagian PIC untuk sinkronisasi database script.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-cyan-400 flex items-center gap-1.5 text-xs">
                      <ListTodo className="w-3.5 h-3.5" /> 📝 Action Items & To-Do List
                    </h4>
                    <div className="mt-2 space-y-1.5">
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-200">Migration script SQLite review</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Rizki • Kamis 15:00</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-200">Load test endpoint /api/summarize</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">QA Team • Jumat</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
