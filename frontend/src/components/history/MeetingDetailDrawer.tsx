"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  X,
  FileText,
  Calendar,
  Clock,
  Copy,
  CheckCircle2,
  Download,
  Trash2,
  Bot,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToPdf, exportToDocx } from "@/lib/exportUtils";
import { MeetingChatDrawer } from "@/components/studio/MeetingChatDrawer";

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
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!meeting) return null;

  const handleCopy = (type: "summary" | "transcript" | "text") => {
    let content = "";
    if (type === "summary") {
      content = meeting.summary;
    } else if (type === "transcript") {
      content = meeting.raw_transcript;
    } else if (type === "text") {
      content = meeting.summary.replace(/[#*`_~[\]|]/g, "").replace(/\n\s*-\s*/g, "\n• ");
    }

    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === "summary" ? meeting.summary : meeting.raw_transcript;
    const ext = activeTab === "summary" ? "md" : "txt";
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${meeting.filename || "meeting"}-${activeTab}.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {meeting.media_type.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: #{meeting.id}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight truncate max-w-md">
                {meeting.filename}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-mono pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(meeting.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(meeting.id)}
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader: Tabs & Actions */}
          <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* View switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "summary"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Executive MoM
              </button>
              <button
                onClick={() => setActiveTab("transcript")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "transcript"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Raw Transcript
              </button>
            </div>

            {/* Quick Export Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsChatOpen(true)}
                className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs h-8 px-2.5 rounded-lg flex items-center gap-1"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Chat</span>
              </Button>

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
                    onClick={() => exportToDocx(meeting.filename, meeting.summary)}
                    className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                    <span>DOCX</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportToPdf(meeting.filename, meeting.summary)}
                    className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
                  >
                    <FileCode className="w-3.5 h-3.5 mr-1 text-rose-400" />
                    <span>PDF</span>
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
                      <span>Copy Text</span>
                    </>
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "summary" ? (
              <div className="prose prose-invert prose-emerald prose-sm max-w-none">
                <ReactMarkdown>{meeting.summary}</ReactMarkdown>
              </div>
            ) : (
              <div className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800">
                {meeting.raw_transcript}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grounded Chat with Meeting Drawer */}
      <MeetingChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rawTranscript={meeting.raw_transcript}
        summary={meeting.summary}
        meetingTitle={meeting.filename}
      />
    </div>
  );
}
