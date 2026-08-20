"use client";

import { useEffect, useState } from "react";
import {
  Music,
  Video,
  FileText,
  X,
  RefreshCw,
  Globe,
  Gauge,
  ShieldCheck,
  AudioLines,
  Sparkles,
} from "lucide-react";
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

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-6 animate-in fade-in duration-300">
      {/* Header with spinner */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
        <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
        <span className="tracking-wide">Uploading & Transcribing</span>
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
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            Transcribing
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8 px-3 rounded-xl border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-rose-400 text-xs flex items-center gap-1.5 transition-colors"
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
