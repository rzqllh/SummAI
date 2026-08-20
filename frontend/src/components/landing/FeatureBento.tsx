"use client";

import { Zap, Video, Terminal, Database, Sparkles, Cpu, Layers, HardDrive } from "lucide-react";

export function FeatureBento() {
  return (
    <section id="features" className="py-20 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered for Developers & Fast-Paced Teams
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Eliminate hours of manual note-taking with cutting-edge open-weights
            and multimodal LLM architectures.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Groq Whisper STT (Span 7) */}
          <div className="md:col-span-7 glass-card rounded-2xl p-7 flex flex-col justify-between glass-card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Sub-Second Audio Ingestion
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Groq Whisper Large-v3 Pipeline
                </h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Transcribe hour-long recordings in seconds with ultra-low latency
                LPU inference. Handles complex jargon, multi-speaker Indonesian &
                English mixing, and technical vocabulary effortlessly.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Throughput speed:</span>
              <span className="text-emerald-400 font-bold">~350 words / sec</span>
            </div>
          </div>

          {/* Card 2: Multimodal MP4 Video Support (Span 5) */}
          <div className="md:col-span-5 glass-card rounded-2xl p-7 flex flex-col justify-between glass-card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors" />
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Direct Media Extraction
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Video & Audio Multi-Format
                </h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Drop `.mp4`, `.mov`, `.mkv`, or raw audio files. Automatically
                extracts audio streams via native FFmpeg and chunks large files.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["MP4", "MOV", "MP3", "WAV", "M4A", "TXT"].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* Card 3: Custom Prompt Engine (Span 5) */}
          <div className="md:col-span-5 glass-card rounded-2xl p-7 flex flex-col justify-between glass-card-hover relative overflow-hidden group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Zero Prompt Fatigue
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Dynamic Prompt Presets
                </h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Switch between Executive Briefings, Jira task tables, Sprint
                Retros, or enter custom prompts tailored to your team&apos;s style.
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Executive Summary</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Jira Tasks & Action Items</span>
              </div>
            </div>
          </div>

          {/* Card 4: Local Storage Privacy (Span 7) */}
          <div className="md:col-span-7 glass-card rounded-2xl p-7 flex flex-col justify-between glass-card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Local-First Security
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Private SQLite Storage
                </h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your company discussions stay under your control. Meetings, raw
                transcripts, and synthesized summaries are saved locally in SQLite
                with zero third-party telemetry or cloud database lock-in.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-cyan-400 font-bold">Local SQLite (Zero Cloud Sync)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
