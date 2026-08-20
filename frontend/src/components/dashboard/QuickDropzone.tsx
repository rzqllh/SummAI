"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Music, Video, FileText } from "lucide-react";

export function QuickDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (typeof window !== "undefined") {
      (window as any).__PENDING_SUMMARIZER_FILE__ = file;
    }
    // Redirect to summarizer studio
    router.push("/dashboard/summarizer");
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <UploadCloud className="w-4 h-4 text-emerald-400" />
          <span>Quick Media Dropzone</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Drop audio, video, or text transcript to start a new synthesis.
        </p>
      </div>

      {/* Dotted Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10 shadow-inner"
            : "border-slate-800 hover:border-emerald-500/40 bg-slate-950/40 hover:bg-slate-900/30"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".mp3,.wav,.m4a,.mp4,.mov,.mkv,.webm,.txt"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">
              Drag and drop your meeting file here,
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              or <span className="text-emerald-400 hover:underline font-medium">browse files</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Supports MP3, WAV, M4A, MP4, MOV, and TXT (Max 2GB)
            </p>
          </div>

          {/* Format pills */}
          <div className="flex items-center gap-2.5 pt-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <Music className="w-3 h-3 text-emerald-400" /> Audio
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <Video className="w-3 h-3 text-cyan-400" /> Video MP4
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <FileText className="w-3 h-3 text-amber-400" /> Text Transcript
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
