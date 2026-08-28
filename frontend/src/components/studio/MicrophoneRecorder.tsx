"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Volume2,
} from "lucide-react";
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

  // Audio preview state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([
    10, 15, 25, 20, 35, 45, 30, 60, 40, 25, 15, 10,
  ]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Frequency spectrum sampler loop
  const updateAudioVisualizer = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Pick 12 representative bins
    const bins = 12;
    const step = Math.floor(bufferLength / bins);
    const newLevels: number[] = [];

    for (let i = 0; i < bins; i++) {
      const val = dataArray[i * step] || 0;
      // Map 0..255 to 12%..100% height
      const percent = Math.max(12, Math.min(100, Math.round((val / 255) * 100)));
      newLevels.push(percent);
    }

    setAudioLevels(newLevels);
    animFrameRef.current = requestAnimationFrame(updateAudioVisualizer);
  };

  const startRecording = async () => {
    setPermissionError(null);
    setRecordedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsPlayingPreview(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Web Audio API context for live real-time analysis
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setPreviewUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioCtx.state !== "closed") {
          audioCtx.close().catch(() => {});
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setElapsed(0);
      animFrameRef.current = requestAnimationFrame(updateAudioVisualizer);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      setPermissionError(
        "Microphone access denied or unavailable. Please enable microphone permissions in your browser."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAudioLevels([10, 15, 25, 20, 35, 45, 30, 60, 40, 25, 15, 10]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleDiscard = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setIsPlayingPreview(false);
    setElapsed(0);
  };

  const handleConfirmAndTranscribe = () => {
    if (!recordedBlob) return;
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const file = new File([recordedBlob], `Live-Recording-${timestamp}.webm`, {
      type: "audio/webm",
    });
    onAudioRecorded(file);
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                : recordedBlob
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">Direct Voice Recording</h4>
            <p className="text-[11px] text-slate-400">
              {isRecording
                ? "Capturing microphone audio..."
                : recordedBlob
                ? "Recording captured — preview or submit below"
                : "Real-time hardware microphone recorder"}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 font-mono text-xs text-rose-400 font-bold animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>{formatTime(elapsed)}</span>
          </div>
        )}
      </div>

      {/* Live Web Audio Analyser Visualizer */}
      {isRecording && (
        <div className="h-12 flex items-center justify-center gap-1.5 px-4 bg-slate-950/90 rounded-xl border border-slate-800/80 shadow-inner">
          {audioLevels.map((heightPercent, idx) => (
            <div
              key={idx}
              className="w-1.5 rounded-full transition-all duration-75 bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300"
              style={{
                height: `${heightPercent}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Audio Playback Preview Card (if recorded) */}
      {recordedBlob && previewUrl && !isRecording && (
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-3 animate-in fade-in">
          <audio
            ref={previewAudioRef}
            src={previewUrl}
            onTimeUpdate={() => {
              if (previewAudioRef.current) {
                const cur = previewAudioRef.current.currentTime;
                const dur = previewAudioRef.current.duration || 1;
                setPreviewProgress((cur / dur) * 100);
              }
            }}
            onEnded={() => {
              setIsPlayingPreview(false);
              setPreviewProgress(0);
            }}
            className="hidden"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Recorded Audio ({formatTime(elapsed)})
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {(recordedBlob.size / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePreviewPlay}
              className="h-8 w-8 p-0 rounded-full border-slate-700 bg-slate-900 text-white hover:bg-slate-800 shrink-0"
            >
              {isPlayingPreview ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </Button>

            <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-400 h-full transition-all duration-100 rounded-full"
                style={{ width: `${previewProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {permissionError && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div>
        {!isRecording && !recordedBlob ? (
          <Button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="w-full h-9 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700/60"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Start Mic Recording</span>
          </Button>
        ) : isRecording ? (
          <Button
            type="button"
            onClick={stopRecording}
            className="w-full h-9 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Finish & Review Recording</span>
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
              className="h-9 border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-record</span>
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAndTranscribe}
              className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Use & Transcribe</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
