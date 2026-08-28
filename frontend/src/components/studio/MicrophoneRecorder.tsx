"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MicrophoneRecorderProps {
  onAudioRecorded: (file: File) => void;
  disabled?: boolean;
}

export function MicrophoneRecorder({
  onAudioRecorded,
  disabled,
}: MicrophoneRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const file = new File([audioBlob], `Live-Recording-${timestamp}.webm`, {
          type: "audio/webm",
        });
        onAudioRecorded(file);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      setPermissionError(
        "Microphone access denied or unavailable. Please enable mic permissions in your browser."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              isRecording
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Direct Voice Recording</h4>
            <p className="text-[11px] text-slate-400">
              {isRecording ? "Recording live meeting discussion..." : "Record in-browser via microphone"}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 font-mono text-xs text-rose-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>{formatTime(elapsed)}</span>
          </div>
        )}
      </div>

      {/* Visualizer animation when recording */}
      {isRecording && (
        <div className="h-8 flex items-center justify-center gap-1 px-4 bg-slate-950/80 rounded-xl border border-slate-800">
          {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70, 85, 40, 65].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-full animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${(i * 0.08).toFixed(2)}s`,
                animationDuration: "0.8s",
              }}
            />
          ))}
        </div>
      )}

      {permissionError && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      <div>
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="w-full h-9 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Start Mic Recording</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            className="w-full h-9 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop & Process Recording</span>
          </Button>
        )}
      </div>
    </div>
  );
}
