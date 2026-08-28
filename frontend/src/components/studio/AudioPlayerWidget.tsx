"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerWidgetProps {
  audioFile?: File | null;
  audioUrl?: string | null;
  filename?: string;
  seekTime?: number;
  onTimeChange?: (currentTime: number) => void;
}

export function AudioPlayerWidget({
  audioFile,
  audioUrl,
  filename,
  seekTime,
  onTimeChange,
}: AudioPlayerWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isWaveReady, setIsWaveReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const localUrl = useMemo(() => {
    if (audioFile) {
      return URL.createObjectURL(audioFile);
    }
    return audioUrl || null;
  }, [audioFile, audioUrl]);

  useEffect(() => {
    return () => {
      if (localUrl && audioFile) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [localUrl, audioFile]);

  // Initialize WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current || !localUrl) return;

    setIsWaveReady(false);
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#334155",
      progressColor: "#10b981",
      cursorColor: "#34d399",
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 44,
      url: localUrl,
      normalize: true,
    });

    ws.on("ready", () => {
      setDuration(ws.getDuration());
      setIsWaveReady(true);
    });

    ws.on("audioprocess", (time) => {
      setCurrentTime(time);
      onTimeChange?.(time);
    });

    ws.on("seeking", (time) => {
      setCurrentTime(time);
      onTimeChange?.(time);
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [localUrl, onTimeChange]);

  // Handle external seek requests
  useEffect(() => {
    if (seekTime !== undefined && wavesurferRef.current && isWaveReady && duration > 0) {
      const clamped = Math.max(0, Math.min(seekTime, duration));
      wavesurferRef.current.setTime(clamped);
      setCurrentTime(clamped);
    }
  }, [seekTime, isWaveReady, duration]);

  const togglePlay = useCallback(() => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(nextRate);
    }
  }, [playbackRate]);

  const toggleMute = useCallback(() => {
    if (!wavesurferRef.current) return;
    const nextMuted = !isMuted;
    wavesurferRef.current.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  if (!localUrl) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium truncate max-w-[260px]">
          <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{filename || audioFile?.name || "Meeting Audio Recording"}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span className="text-emerald-400 font-semibold">{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Waveform Container */}
      <div className="relative rounded-xl bg-slate-950/80 p-2.5 border border-slate-800/80 min-h-[58px] flex items-center justify-center">
        {!isWaveReady && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-500 text-xs font-mono bg-slate-950/60 backdrop-blur-xs rounded-xl z-10">
            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Rendering acoustic waveform...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full cursor-pointer" />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={togglePlay}
            className="h-8.5 w-8.5 p-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (wavesurferRef.current) {
                wavesurferRef.current.setTime(0);
                setCurrentTime(0);
              }
            }}
            className="h-8.5 w-8.5 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMute}
            className="h-8.5 w-8.5 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* Speed button */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono font-semibold text-emerald-400 hover:border-emerald-500/40 transition-colors"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
