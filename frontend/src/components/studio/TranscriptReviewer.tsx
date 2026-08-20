"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Copy,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TranscriptReviewerProps {
  transcript: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
  filename: string;
}

export function TranscriptReviewer({
  transcript,
  onChange,
  onNext,
  onBack,
  filename,
}: TranscriptReviewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    return transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  }, [transcript]);

  const charCount = transcript.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-5 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Whisper STT Complete
            </span>
            <span className="text-xs text-slate-400 font-mono truncate max-w-[280px]">
              {filename}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Review & Refine Raw Transcript
          </h2>
        </div>

        {/* Metrics & Copy Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{charCount.toLocaleString()} chars</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs h-9 px-3.5 rounded-xl transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search filter inside transcript */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter or search keywords in transcript..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900/70 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Editable Area with Scrollable Parent Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Transcript Editor (Editable before synthesis)</span>
          <span className="text-[11px] font-mono text-slate-500">Scrollable view</span>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-1">
          <Textarea
            value={transcript}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[400px] max-h-[50vh] overflow-y-auto bg-transparent border-0 rounded-lg p-4 font-mono text-xs text-slate-200 leading-relaxed focus:ring-0 focus:outline-none resize-none"
            placeholder="Transcript text will appear here..."
          />
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload Another File</span>
        </Button>

        <Button
          onClick={onNext}
          disabled={!transcript.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <span>Select Summary Preset</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
