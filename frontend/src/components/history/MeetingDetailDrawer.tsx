"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  X,
  FileText,
  Copy,
  CheckCircle2,
  Download,
  Trash2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryMeeting {
  id: number;
  filename: string;
  media_type: string;
  raw_transcript: string;
  summary: string;
  created_at: string;
}

interface MeetingDetailDrawerProps {
  meeting: HistoryMeeting | null;
  onClose: () => void;
  onDelete: (id: number) => void;
}

export function MeetingDetailDrawer({
  meeting,
  onClose,
  onDelete,
}: MeetingDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!meeting) return null;

  const handleCopy = (type: "summary" | "transcript" | "jira") => {
    let text = "";
    if (type === "summary") text = meeting.summary;
    if (type === "transcript") text = meeting.raw_transcript;
    if (type === "jira") {
      text = meeting.summary
        .replace(/^### (.*$)/gim, "h3. $1")
        .replace(/^## (.*$)/gim, "h2. $1")
        .replace(/^# (.*$)/gim, "h1. $1")
        .replace(/\*\*(.*?)\*\*/g, "*$1*");
    }

    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([meeting.summary], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${meeting.filename || "meeting"}-summary.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {meeting.filename || `Meeting #${meeting.id}`}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>{new Date(meeting.created_at || "2026-08-20T00:00:00.000Z").toLocaleString()}</span>
                <span>•</span>
                <span className="uppercase">{meeting.media_type || "txt"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(meeting.id)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete from database"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Export Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === "summary"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Synthesized Summary
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === "transcript"
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Raw Transcript
            </button>
          </div>

          {/* Quick Export Actions */}
          <div className="flex items-center gap-2">
            {activeTab === "summary" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy("summary")}
                  className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
                >
                  {copiedType === "summary" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      <span>Copy MD</span>
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy("jira")}
                  className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
                >
                  {copiedType === "jira" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mr-1" />
                      <span className="text-cyan-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      <span>Copy Jira</span>
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  <span>Download .md</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy("transcript")}
                className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
              >
                {copiedType === "transcript" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy Raw Transcript</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40">
          {activeTab === "summary" ? (
            <div className="prose prose-invert prose-emerald prose-sm max-w-none">
              <ReactMarkdown>{meeting.summary}</ReactMarkdown>
            </div>
          ) : (
            <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {meeting.raw_transcript}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
