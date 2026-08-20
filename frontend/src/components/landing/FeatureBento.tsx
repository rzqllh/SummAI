"use client";

import { useState } from "react";
import { ChevronRight, Mic, AudioWaveform, FileText, CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function FeatureBento() {
  const [activePreset, setActivePreset] = useState<string>("Jira Action Items");
  const shouldReduceMotion = useReducedMotion();

  const presets = [
    "Executive Summary",
    "Jira Action Items",
    "Sprint Retro",
    "Custom Prompt",
  ];

  return (
    <motion.section
      id="capabilities"
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-20 border-t border-slate-800/80 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider font-mono">
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
            Engineered for High-Velocity Teams
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Eliminate manual meeting synthesis with specialized speech-to-text inference and structured LLM pipelines.
          </p>
        </div>

        {/* Asymmetric 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sticky Pipeline Diagram & Stats */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  Pipeline Architecture
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Groq Whisper + Gemini Flash
                </h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Real-time audio processing to structured markdown in a continuous, low-latency pipeline.
                </p>
              </div>

              {/* 4-Node Horizontal Pipeline Strip */}
              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3.5">
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-300">
                  <div className="flex flex-col items-center gap-1 text-center flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate w-full text-[10px]">Audio</span>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

                  <div className="flex flex-col items-center gap-1 text-center flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                      <AudioWaveform className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate w-full text-[10px]">Waveform</span>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

                  <div className="flex flex-col items-center gap-1 text-center flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate w-full text-[10px]">Transcript</span>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

                  <div className="flex flex-col items-center gap-1 text-center flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate w-full text-[10px]">Structured</span>
                  </div>
                </div>
              </div>

              {/* Stat Rows as Label/Value Pairs */}
              <div className="divide-y divide-slate-800/80 border-t border-slate-800/80 pt-1 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Throughput</span>
                  <span className="text-emerald-400 font-mono font-semibold">~350 words / sec</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Models</span>
                  <span className="text-slate-200 font-mono text-right">Whisper Large v3 + Gemini Flash</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Language handling</span>
                  <span className="text-slate-200 font-mono text-right">Indonesian & English mixed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Numbered Pipeline Steps */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 01: Input Formats */}
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                  01 / INPUT FORMATS
                </span>
                <span className="text-[11px] font-mono text-slate-400">FFmpeg Extraction</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Direct Video & Audio Stream Extraction
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  Drop recordings directly without pre-converting. SummAI extracts audio streams natively via FFmpeg and handles chunking automatically for long meetings.
                </p>
              </div>

              {/* Supported Format Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {["MP4", "MOV", "MP3", "WAV", "M4A", "TXT"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 font-medium"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Step 02: Prompt Presets */}
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                  02 / SYNTHESIS PRESETS
                </span>
                <span className="text-[11px] font-mono text-slate-400">Zero Prompt Fatigue</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Preset Chooser with Tailored Schemas
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  Switch output formatting instantly based on the meeting type. Get strict Jira tables, bulleted executive briefs, or custom engineering agendas.
                </p>
              </div>

              {/* Clickable Preset Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setActivePreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      activePreset === preset
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 03: Local Storage Fact */}
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                  03 / LOCAL PERSISTENCE
                </span>
                <span className="text-[11px] font-mono text-slate-400">Zero Cloud Sync</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Local SQLite Database
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  All meeting records, word-for-word transcripts, and generated markdown summaries are stored locally in your SQLite database file. No external telemetry, no remote session storage, and no vendor lock-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
