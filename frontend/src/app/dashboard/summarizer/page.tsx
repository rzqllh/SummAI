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
import { SynthesisProgressCard } from "@/components/studio/SynthesisProgressCard";
import { SummaryExporter } from "@/components/studio/SummaryExporter";
import { TranscriptTips } from "@/components/studio/TranscriptTips";
import { RecentJobsWidget } from "@/components/studio/RecentJobsWidget";
import { ActiveJobCard } from "@/components/studio/ActiveJobCard";
import { AudioPlayerWidget } from "@/components/studio/AudioPlayerWidget";
import { MicrophoneRecorder } from "@/components/studio/MicrophoneRecorder";
import { getApiBaseUrl } from "@/lib/api";

export default function SummarizerStudioPage() {
  const [currentStep, setCurrentStep] = useState<StudioStep>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StudioStep>(1);

  // File upload & metadata state
  const [file, setFile] = useState<File | null>(null);
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

  const handleFileUpload = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFilename(selectedFile.name);
    setFilesize(formatBytes(selectedFile.size));
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "mp4";
    setMediaType(ext);

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    // Save controller for cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await axios.post(
        `${getApiBaseUrl()}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              // Max 90% during actual upload, 100% when server responds
              setUploadProgress(Math.min(percent, 90));
            }
          },
        }
      );

      setTranscript(res.data.transcript || "");
      setSttProvider(res.data.provider_used || "Groq Whisper Large-v3");
      setSttFallback(res.data.fallback_applied || false);
      setUploadProgress(100);

      // Auto advance to Step 2
      setTimeout(() => {
        setIsUploading(false);
        setCurrentStep(2);
        setMaxReachedStep((prev) => Math.max(prev, 2) as StudioStep);
      }, 500);
    } catch (err: unknown) {
      if (axios.isCancel(err) || (err as Error).name === "CanceledError") {
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
      setIsUploading(false);
      setUploadProgress(0);
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const msg =
        axiosErr.response?.data?.detail ||
        axiosErr.message ||
        "Upload failed. Please check your backend connection.";
      setErrorMessage(msg);
    }
  }, []);

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleSummarize = async (overridePrompt?: string) => {
    if (!transcript) return;
    setIsSummarizing(true);
    setErrorMessage("");

    // Step 3 to show progress
    setCurrentStep(3);

    const promptToSend = overridePrompt || customPrompt;

    try {
      const res = await axios.post(
        `${getApiBaseUrl()}/api/summarize`,
        {
          raw_transcript: transcript,
          filename: filename || "Pasted-Transcript.txt",
          media_type: mediaType || "txt",
          custom_prompt: promptToSend || null,
        }
      );

      setSummary(res.data.summary);
      setLlmProvider(res.data.provider_used || "Google Gemini Flash");
      setLlmFallback(res.data.fallback_applied || false);

      // Advance to Step 4
      setTimeout(() => {
        setIsSummarizing(false);
        setCurrentStep(4);
        setMaxReachedStep(4);
      }, 300);
    } catch (err: unknown) {
      setIsSummarizing(false);
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const msg =
        axiosErr.response?.data?.detail ||
        axiosErr.message ||
        "Synthesis failed. Please verify your API Key in Settings.";
      setErrorMessage(msg);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setMaxReachedStep(1);
    setFile(null);
    setFilename("");
    setFilesize("");
    setTranscript("");
    setCustomPrompt("");
    setSummary("");
    setErrorMessage("");
    setSttProvider("");
    setSttFallback(false);
    setLlmProvider("");
    setLlmFallback(false);
  };

  const handleSelectRecentJob = (job: {
    id: number;
    filename: string;
    media_type: string;
    raw_transcript: string;
    summary: string;
  }) => {
    setFilename(job.filename);
    setMediaType(job.media_type);
    setTranscript(job.raw_transcript);
    setSummary(job.summary);
    setCurrentStep(4);
    setMaxReachedStep(4);
  };

  const handleStepClick = (step: StudioStep) => {
    if (step <= maxReachedStep) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 4-Step Indicator */}
      <StepIndicator
        currentStep={currentStep}
        maxReachedStep={maxReachedStep}
        onStepClick={handleStepClick}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <span className="font-semibold text-rose-200">Pipeline Notice</span>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
          <Link href="/dashboard/settings">
            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 shrink-0"
            >
              <Settings className="w-3 h-3" />
              <span>Configure Keys</span>
            </Button>
          </Link>
        </div>
      )}

      {/* STEP 1: Upload Media & Transcribe */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Dropzone & Direct Mic (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  New meeting
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
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

              {/* In-Browser Direct Voice Recording */}
              <MicrophoneRecorder
                onAudioRecorded={(recordedFile) => void handleFileUpload(recordedFile)}
                disabled={isUploading}
              />
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

      {/* STEP 2: Review Raw Transcript & Audio Player */}
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

          {/* Interactive Audio Player if media was uploaded */}
          {file && (
            <AudioPlayerWidget audioFile={file} filename={filename} />
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

      {/* STEP 3: Select Synthesis Preset or View Progress */}
      {currentStep === 3 && (
        isSummarizing ? (
          <SynthesisProgressCard
            isSynthesizing={isSummarizing}
            presetTitle={customPrompt ? "Selected Preset" : "Corporate MoM"}
          />
        ) : (
          <PresetSelector
            customPrompt={customPrompt}
            onCustomPromptChange={(val) => setCustomPrompt(val)}
            onGenerate={handleSummarize}
            onBack={() => setCurrentStep(2)}
            isGenerating={isSummarizing}
          />
        )
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
            rawTranscript={transcript}
            filename={filename}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
