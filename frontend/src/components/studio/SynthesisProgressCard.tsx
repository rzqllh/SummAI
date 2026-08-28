"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Bot,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SynthesisProgressCardProps {
  isSynthesizing: boolean;
  presetTitle?: string;
  onCancel?: () => void;
}

const PHASES = [
  { label: "Ingesting Transcript & Context", targetPercent: 25 },
  { label: "Analyzing Discussion & Arguments", targetPercent: 55 },
  { label: "Structuring Decisions & Action Items", targetPercent: 82 },
  { label: "Finalizing Formatted Markdown", targetPercent: 95 },
];

const ROTATING_TIPS = [
  "Enforcing anti-hallucination guardrails and grounded facts...",
  "Formatting conditional decisions and explicit follow-up tasks...",
  "Preserving technical acronyms and domain terminology...",
  "Extracting clear PICs and target dates into tables...",
];

export function SynthesisProgressCard({
  isSynthesizing,
  presetTitle = "Corporate MoM",
  onCancel,
}: SynthesisProgressCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!isSynthesizing) {
      setElapsed(0);
      setPhaseIndex(0);
      setProgress(15);
      return;
    }

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % ROTATING_TIPS.length);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, [isSynthesizing]);

  useEffect(() => {
    if (!isSynthesizing) return;

    if (elapsed < 2) {
      setPhaseIndex(0);
      setProgress(25);
    } else if (elapsed < 5) {
      setPhaseIndex(1);
      setProgress(55);
    } else if (elapsed < 8) {
      setPhaseIndex(2);
      setProgress(80);
    } else {
      setPhaseIndex(3);
      setProgress(94);
    }
  }, [elapsed, isSynthesizing]);

  const formatElapsed = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-emerald-500/30 bg-slate-950/80 shadow-2xl shadow-emerald-500/10 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Synthesizing Intelligence
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Applying preset: <span className="text-slate-200 font-semibold">{presetTitle}</span>
            </p>
          </div>
        </div>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8 px-3 rounded-xl border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-rose-400 text-xs flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </Button>
        )}
      </div>

      {/* Progress Bar & Stage Label */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {PHASES[phaseIndex].label}
          </span>
          <span className="font-mono font-bold text-emerald-400">{progress}%</span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-md shadow-emerald-500/50 relative"
            style={{ width: `${progress}%` }}
          >
            <span className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Multi-Step Pipeline Visualizer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {PHASES.map((p, idx) => {
          const isDone = idx < phaseIndex;
          const isCurrent = idx === phaseIndex;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-[11px] transition-all flex items-center gap-2 ${
                isCurrent
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : isDone
                  ? "bg-slate-900/40 border-slate-800 text-slate-400"
                  : "bg-slate-950/40 border-slate-900 text-slate-600"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
              )}
              <span className="truncate">{p.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Live Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Elapsed
          </span>
          <span className="font-mono font-bold text-slate-200">{formatElapsed(elapsed)}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            Inference
          </span>
          <span className="font-semibold text-slate-200 truncate ml-2">Google Gemini Flash</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Format
          </span>
          <span className="font-semibold text-slate-200">Structured Markdown</span>
        </div>
      </div>

      {/* Dynamic Tip / Guardrail note */}
      <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/60 flex items-center gap-2.5 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="truncate">{ROTATING_TIPS[tipIndex]}</span>
      </div>
    </div>
  );
}
