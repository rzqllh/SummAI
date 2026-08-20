"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import {
  UploadCloud,
  AlertCircle,
  FolderOpen,
  Settings,
  Sparkles,
  Zap,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator, StudioStep } from "@/components/studio/StepIndicator";
import { TranscriptReviewer } from "@/components/studio/TranscriptReviewer";
import { PresetSelector } from "@/components/studio/PresetSelector";
import { SummaryExporter } from "@/components/studio/SummaryExporter";
import { TranscriptTips } from "@/components/studio/TranscriptTips";
import { RecentJobsWidget } from "@/components/studio/RecentJobsWidget";
import { ActiveJobCard } from "@/components/studio/ActiveJobCard";

export default function SummarizerStudioPage() {
  const [currentStep, setCurrentStep] = useState<StudioStep>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StudioStep>(1);

  // File upload & metadata state
  const [, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [filesize, setFilesize] = useState("");
  const [duration, setDuration] = useState("00:15:00");
  const [mediaType, setMediaType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Studio payload state
  const [transcript, setTranscript] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Provider tracking state
  const [sttProvider, setSttProvider] = useState("");
  const [sttFallback, setSttFallback] = useState(false);
  const [llmProvider, setLlmProvider] = useState("");
  const [llmFallback, setLlmFallback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return mb.toFixed(1) + " MB";
  };

  // Extract duration from audio/video
  const extractMediaDuration = (selectedFile: File) => {
    try {
      const url = URL.createObjectURL(selectedFile);
      const isVideo = selectedFile.type.startsWith("video") || ["mp4", "mov", "mkv", "avi", "webm"].includes(selectedFile.name.split(".").pop()?.toLowerCase() || "");
      const mediaEl = document.createElement(isVideo ? "video" : "audio");
      mediaEl.preload = "metadata";
      mediaEl.src = url;
      mediaEl.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const secs = Math.round(mediaEl.duration);
        if (secs && !isNaN(secs) && isFinite(secs)) {
          const hrs = Math.floor(secs / 3600);
          const mins = Math.floor((secs % 3600) / 60);
          const s = secs % 60;
          setDuration(
            `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
          );
        }
      };
    } catch {
      setDuration("00:25:30");
    }
  };

  const handleFileUpload = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFilename(selectedFile.name);
    setFilesize(formatBytes(selectedFile.size));
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "mp4";
    setMediaType(ext);
    extractMediaDuration(selectedFile);

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage("");

    // Setup abort controller for cancel button
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const formData = new FormData();
    formData.append("file", selectedFile);

    // Progress simulation interval for backend processing
    let simProgress = 10;
    const progressInterval = setInterval(() => {
      if (simProgress < 90) {
        simProgress += Math.floor(Math.random() * 8) + 3;
        setUploadProgress(Math.min(simProgress, 92));
      }
    }, 1200);

    try {
      const savedGroqKey = localStorage.getItem("SUMMAI_GROQ_KEY") || "";
      const savedCfToken = localStorage.getItem("SUMMAI_CF_TOKEN") || "";

      const headers: Record<string, string> = { "Content-Type": "multipart/form-data" };
      if (savedGroqKey) headers["x-groq-api-key"] = savedGroqKey;
      if (savedCfToken) headers["x-cf-api-token"] = savedCfToken;

      const res = await axios.post("http://localhost:8000/api/upload", formData, {
        headers,
        signal: controller.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 45) / progressEvent.total);
            setUploadProgress(Math.max(percent, simProgress));
          }
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSttProvider(res.data.provider_used || "Speech Recognition");
      setSttFallback(Boolean(res.data.fallback_applied));

      // Short delay for smooth transition to step 2
      setTimeout(() => {
        setTranscript(res.data.transcript || "");
        setCurrentStep(2);
        setMaxReachedStep((prev) => (prev < 2 ? 2 : prev));
        setIsUploading(false);
      }, 400);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setIsUploading(false);

      const axiosErr = err as AxiosError<{ detail?: string }>;

      if (axios.isCancel(err) || (err as Error).name === "CanceledError") {
        setErrorMessage("Upload and transcription canceled.");
        return;
      }

      console.error("Upload error", err);
      if (axiosErr.message === "Network Error" || axiosErr.code === "ERR_CONNECTION_REFUSED") {
        setErrorMessage("Backend is offline. Please make sure FastAPI is running on port 8000.");
      } else {
        const detail = axiosErr.response?.data?.detail || axiosErr.message;
        setErrorMessage("Failed to process media file: " + detail);
      }
    }
  }, []);

  // Auto-pickup pending file from QuickDropzone
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as { __PENDING_SUMMARIZER_FILE__?: File | null };
      if (win.__PENDING_SUMMARIZER_FILE__) {
        const pendingFile = win.__PENDING_SUMMARIZER_FILE__;
        win.__PENDING_SUMMARIZER_FILE__ = null;
        const timer = setTimeout(() => {
          void handleFileUpload(pendingFile);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [handleFileUpload]);

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setErrorMessage("");

    try {
      const savedGeminiKey = localStorage.getItem("SUMMAI_GEMINI_KEY") || "";
      const savedGroqKey = localStorage.getItem("SUMMAI_GROQ_KEY") || "";
      const savedCfToken = localStorage.getItem("SUMMAI_CF_TOKEN") || "";

      const headers: Record<string, string> = {};
      if (savedGeminiKey) headers["x-gemini-api-key"] = savedGeminiKey;
      if (savedGroqKey) headers["x-groq-api-key"] = savedGroqKey;
      if (savedCfToken) headers["x-cf-api-token"] = savedCfToken;

      const res = await axios.post(
        "http://localhost:8000/api/summarize",
        {
          raw_transcript: transcript,
          filename: filename || "Manual Upload",
          media_type: mediaType || "txt",
          custom_prompt: customPrompt,
        },
        { headers }
      );

      setSummary(res.data.summary || "");
      setLlmProvider(res.data.provider_used || "AI Synthesis");
      setLlmFallback(Boolean(res.data.fallback_applied));

      setCurrentStep(4);
      setMaxReachedStep(4);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      console.error("Summarize error", err);
      if (axiosErr.message === "Network Error" || axiosErr.code === "ERR_CONNECTION_REFUSED") {
        setErrorMessage("Backend is offline. Please make sure FastAPI is running on port 8000.");
      } else {
        const detail = axiosErr.response?.data?.detail || axiosErr.message;
        setErrorMessage("Failed to synthesize summary: " + detail);
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFilename("");
    setFilesize("");
    setDuration("00:15:00");
    setMediaType("");
    setTranscript("");
    setCustomPrompt("");
    setSummary("");
    setSttProvider("");
    setSttFallback(false);
    setLlmProvider("");
    setLlmFallback(false);
    setCurrentStep(1);
    setMaxReachedStep(1);
    setErrorMessage("");
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleSelectRecentJob = (job: { filename: string; media_type?: string; raw_transcript?: string; summary?: string }) => {
    setFilename(job.filename);
    setMediaType(job.media_type || "mp4");
    setTranscript(job.raw_transcript || "");
    setSummary(job.summary || "");
    setCurrentStep(4);
    setMaxReachedStep(4);
  };

  const isKeyError =
    errorMessage.toLowerCase().includes("key") ||
    errorMessage.toLowerCase().includes("groq") ||
    errorMessage.toLowerCase().includes("gemini");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stepper Indicator */}
      <StepIndicator
        currentStep={currentStep}
        maxReachedStep={maxReachedStep}
        onStepClick={(step) => setCurrentStep(step)}
      />

      {/* Error alert toast */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isKeyError && (
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[11px] font-medium transition-colors"
              >
                <Settings className="w-3 h-3" />
                <span>Configure Keys</span>
              </Link>
            )}
            <button
              onClick={() => setErrorMessage("")}
              className="text-rose-400 hover:text-rose-200 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Upload Media & Active Job Workspace */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Left Section: Upload Dropzone & Active Job (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* New Meeting Dropzone Card */}
            <div className="glass-card rounded-2xl p-6 sm:p-7 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-5">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white tracking-tight">
                  New meeting
                </h2>
                <p className="text-xs text-slate-400">
                  Upload a meeting recording or transcript to get started. No API keys required (auto-routes through free pool).
                </p>
              </div>

              {/* Dotted Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    void handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-500/10 shadow-inner"
                    : "border-slate-800/90 hover:border-emerald-500/40 bg-slate-950/40 hover:bg-slate-900/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      void handleFileUpload(e.target.files[0]);
                    }
                  }}
                  accept=".mp3,.wav,.m4a,.mp4,.mov,.mkv,.webm,.txt"
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-3.5">
                  {/* Clean Upload Icon in Outline Frame */}
                  <div className="w-12 h-12 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-center text-emerald-400 shadow-sm">
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">
                      Drag and drop file here
                    </p>
                    <p className="text-xs text-slate-400 font-mono">or</p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs h-9 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span>Browse files</span>
                  </Button>

                  <p className="text-[11px] text-slate-400 font-mono pt-2">
                    Supports: MP3, WAV, M4A, MP4, MOV, TXT • Max 2GB
                  </p>
                </div>
              </div>
            </div>

            {/* Active Job Processing Card (Shown when uploading/transcribing) */}
            {isUploading && (
              <ActiveJobCard
                filename={filename}
                filesize={filesize}
                duration={duration}
                filetype={mediaType}
                progress={uploadProgress}
                onCancel={handleCancelUpload}
                isProcessing={isUploading}
              />
            )}
          </div>

          {/* Right Sidebar: Transcript Tips & Recent Jobs (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <TranscriptTips />
            <RecentJobsWidget onSelectMeeting={handleSelectRecentJob} />
          </div>
        </div>
      )}

      {/* STEP 2: Review Raw Transcript */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {sttProvider && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Transcribed using: <strong className="text-slate-200">{sttProvider}</strong></span>
              {sttFallback && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px]">
                  Auto-Fallback Active
                </span>
              )}
            </div>
          )}
          <TranscriptReviewer
            transcript={transcript}
            onChange={(val) => setTranscript(val)}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            filename={filename}
          />
        </div>
      )}

      {/* STEP 3: Select Synthesis Preset */}
      {currentStep === 3 && (
        <PresetSelector
          customPrompt={customPrompt}
          onCustomPromptChange={(val) => setCustomPrompt(val)}
          onGenerate={handleSummarize}
          onBack={() => setCurrentStep(2)}
          isGenerating={isSummarizing}
        />
      )}

      {/* STEP 4: Export & Download Summary */}
      {currentStep === 4 && (
        <div className="space-y-4">
          {llmProvider && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Synthesized using: <strong className="text-slate-200">{llmProvider}</strong></span>
              {llmFallback && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  Auto-Fallback Active
                </span>
              )}
            </div>
          )}
          <SummaryExporter
            summary={summary}
            filename={filename}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
