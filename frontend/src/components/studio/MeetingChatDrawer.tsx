"use client";

import { useState, useRef } from "react";
import axios from "axios";
import {
  Send,
  Sparkles,
  Bot,
  User,
  X,
  RefreshCw,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

export interface TranscriptSegmentData {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  evidence?: TranscriptSegmentData[];
}

interface MeetingChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rawTranscript: string;
  summary?: string;
  meetingTitle?: string;
  segments?: TranscriptSegmentData[];
  onSeekAudio?: (timeSeconds: number) => void;
}

const QUICK_QUESTIONS = [
  "What are the agreed action items and deadlines?",
  "Who are the assigned PICs and their tasks?",
  "Were there any technical blockers or constraints discussed?",
  "What decisions remain conditional or unresolved?",
];

export function MeetingChatDrawer({
  isOpen,
  onClose,
  rawTranscript,
  summary,
  meetingTitle,
  segments,
  onSeekAudio,
}: MeetingChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const msgCounter = useRef(0);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    msgCounter.current += 1;
    const userMsg: Message = {
      id: `user-${msgCounter.current}`,
      role: "user",
      content: q,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${getApiBaseUrl()}/api/chat-meeting`, {
        raw_transcript: rawTranscript,
        summary: summary,
        question: q,
        segments: segments || [],
      });

      msgCounter.current += 1;
      const aiMsg: Message = {
        id: `ai-${msgCounter.current}`,
        role: "assistant",
        content: res.data.answer || "No response received.",
        timestamp: "Just now",
        evidence: res.data.evidence || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errorText = axios.isAxiosError(err) && err.response?.data?.error?.message
        ? String(err.response.data.error.message)
        : "Failed to get an answer. Please try again.";

      msgCounter.current += 1;
      const errorMsg: Message = {
        id: `err-${msgCounter.current}`,
        role: "assistant",
        content: `⚠️ ${errorText}`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Chat with Meeting</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Grounded
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {meetingTitle || "Meeting Transcript & Summary Context"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="font-semibold text-white text-sm">Ask anything about this meeting</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Answers are factually grounded exclusively in the transcript and structured MoM without hallucination.
                </p>
              </div>

              {/* Quick Questions */}
              <div className="w-full space-y-1.5 pt-2 text-left">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-emerald-400" />
                  <span>Suggested queries:</span>
                </span>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/40 text-slate-300 hover:text-white text-left text-xs transition-all flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{q}</span>
                    <Send className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed space-y-1.5 ${
                    m.role === "user"
                      ? "bg-emerald-500 text-slate-950 font-medium"
                      : "bg-slate-950 border border-slate-800 text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {m.evidence && m.evidence.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Evidence Citations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {m.evidence.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onSeekAudio?.(ev.start)}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={`Jump to ${Math.floor(ev.start / 60)}:${Math.floor(ev.start % 60).toString().padStart(2, '0')}: "${ev.text}"`}
                          >
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>
                              {Math.floor(ev.start / 60)}:{(Math.floor(ev.start % 60)).toString().padStart(2, "0")}
                            </span>
                            {ev.speaker && <span className="text-slate-400">({ev.speaker})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span
                    className={`block text-[10px] text-right font-mono ${
                      m.role === "user" ? "text-slate-900/70" : "text-slate-500"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Analyzing transcript and reasoning answer...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about decisions, PICs, dates..."
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-9 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
