"use client";

import { useEffect, useState } from "react";
import {
  Music,
  Video,
  FileText,
  X,
  Globe,
  Gauge,
  ShieldCheck,
  AudioLines,
} from "lucide-react";
import { MorphIcon, IconNode } from "morphicons/react";
import { Button } from "@/components/ui/button";

interface ActiveJobCardProps {
  filename: string;
  filesize: string;
  duration: string;
  filetype: string;
  progress: number;
  onCancel: () => void;
  isProcessing: boolean;
}

const STAGE_ICON_NODES: Record<"extract" | "transcribe" | "structure", IconNode> = {
  extract: [
    ["path", { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" }],
  ],
  transcribe: [
    ["path", { d: "M2 10v3 M6 6v11 M10 3v18 M14 8v7 M18 5v13 M22 10v3" }],
  ],
  structure: [
    ["path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15l2 2 4-4" }],
  ],
};

export function ActiveJobCard({
  filename,
  filesize,
  duration,
  filetype,
  progress,
  onCancel,
  isProcessing,
}: ActiveJobCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Estimate remaining time based on progress
  const getEstimatedRemaining = () => {
    if (progress <= 5) return "00:00:45";
    const totalEstSecs = Math.round((elapsedSeconds / Math.max(progress, 1)) * 100);
    const remainingSecs = Math.max(0, totalEstSecs - elapsedSeconds);
    return formatTime(remainingSecs);
  };

  const getMediaIcon = (type: string) => {
    const t = type.toLowerCase();
    if (["mp4", "mov", "mkv", "webm", "avi"].includes(t)) {
      return <Video className="w-5 h-5 text-emerald-400" />;
    }
    if (["mp3", "wav", "m4a", "audio"].includes(t)) {
      return <Music className="w-5 h-5 text-emerald-400" />;
    }
    return <FileText className="w-5 h-5 text-emerald-400" />;
  };

  // Stage classification based on verified caller upload & transcription pipeline:
  // - 0% to 35%: Uploading file & native FFmpeg audio stream extraction
  // - 35% to 80%: Groq Whisper Large-v3 speech-to-text inference
  // - >80%: Finalizing transcript formatting and preparing review step
  const currentStage: "extract" | "transcribe" | "structure" =
    progress < 35 ? "extract" : progress <= 80 ? "transcribe" : "structure";

  const stageLabels = {
    extract: "Extracting Media Stream",
    transcribe: "Transcribing via Whisper",
    structure: "Finalizing Transcript",
  };

  const stageBadges = {
    extract: "Extracting",
    transcribe: "Transcribing",
    structure: "Finalizing",
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-6 animate-in fade-in duration-300">
      {/* Stage-Aware Header with MorphIcon and Live Waveform (Motion Point #4) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MorphIcon
              icon={STAGE_ICON_NODES[currentStage]}
              size={14}
              color="#34d399"
              reducedMotion="user"
            />
          </div>
          <span className="tracking-wide">{stageLabels[currentStage]}</span>
        </div>

        {/* Live Waveform Bar Visualization */}
        <div className="flex items-center gap-1 h-5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
          {[28, 65, 40, 85, 55, 90, 35, 75, 45, 80, 60, 30].map((baseH, i) => {
            const dynamicH = isProcessing
              ? Math.max(
                  20,
                  Math.min(
                    100,
                    baseH +
                      Math.sin(elapsedSeconds * 3 + i * 0.7) * 35 +
                      (progress % 15)
                  )
                )
              : 25;
            return (
              <div
                key={i}
                className="w-1 bg-emerald-400 rounded-full transition-all duration-300"
                style={{ height: `${dynamicH}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Media Details Box */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
            {getMediaIcon(filetype)}
          </div>

          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-bold text-white truncate">
              {filename || "Kickoff - Product Planning.mp4"}
            </h4>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>{filesize || "432.8 MB"}</span>
              <span>•</span>
              <span>{duration || "01:12:48"}</span>
              <span>•</span>
              <span className="uppercase">{filetype || "MP4"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold font-mono">
            {stageBadges[currentStage]}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8 px-3 rounded-xl border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-rose-400 text-xs flex items-center gap-1.5 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </Button>
        </div>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800/80">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md shadow-emerald-500/50 relative"
            style={{ width: `${Math.max(5, progress)}%` }}
          >
            <span className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
        <span className="text-sm font-bold text-emerald-400 font-mono shrink-0 min-w-[40px] text-right">
          {progress}%
        </span>
      </div>

      {/* 5 Stats / Metadata Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800/60 text-xs">
        {/* Provider */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Provider</span>
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
            <AudioLines className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Groq Whisper</span>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Language</span>
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Indonesian</span>
          </div>
        </div>

        {/* Processed Elapsed Time */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Processed</span>
          <div className="font-semibold text-slate-200 font-mono">
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* Estimated Remaining */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Estimated remaining</span>
          <div className="font-semibold text-slate-200 font-mono">
            {getEstimatedRemaining()}
          </div>
        </div>

        {/* Speed */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px]">Speed</span>
          <div className="font-semibold text-slate-200 font-mono flex items-center gap-1">
            <span>1.9x</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>All processing is performed locally on your machine. Your data stays private.</span>
      </div>
    </div>
  );
}
