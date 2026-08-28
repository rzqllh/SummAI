"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import {
  FileText,
  Calendar,
  ArrowRight,
  Copy,
  CheckCircle2,
  Music,
  Video,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

interface MeetingItem {
  id: number;
  filename: string;
  media_type: string;
  raw_transcript: string;
  summary: string;
  created_at: string;
}

export function RecentMeetingsList() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/api/history`);
        if (isMounted) {
          const list = res.data.meetings || res.data || [];
          setMeetings(list.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to load recent meetings", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopySummary = (id: number, summaryText: string) => {
    navigator.clipboard.writeText(summaryText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBadge = (type: string) => {
    const t = type?.toLowerCase() || "txt";
    if (["mp4", "mov", "mkv", "video"].includes(t)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Video className="w-3 h-3" />
          <span>MP4</span>
        </span>
      );
    }
    if (["mp3", "wav", "m4a", "audio"].includes(t)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Music className="w-3 h-3" />
          <span>MP3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
        <FileText className="w-3 h-3" />
        <span>TXT</span>
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return "8/20/2026";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Recent Meeting Syntheses</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Latest processed audio and transcripts
          </p>
        </div>
        <Link
          href="/dashboard/history"
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors hover:underline"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          Loading recent meetings...
        </div>
      ) : meetings.length === 0 ? (
        <div className="py-10 text-center space-y-3 bg-slate-950/40 rounded-xl border border-slate-900">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-xs text-slate-400">
            No meetings recorded yet. Start by dropping a file above!
          </div>
          <Link href="/dashboard/summarizer">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 rounded-lg"
            >
              Start First Meeting
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3 group"
            >
              {/* Top Row: Badge & Title */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {getBadge(m.media_type)}
                <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                  {m.filename || `Meeting #${m.id}`}
                </h4>
              </div>

              {/* Summary snippet preview */}
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                {m.summary?.replace(/[#*`_]/g, "").substring(0, 220)}...
              </p>

              {/* Bottom Row: Date on Left, Action Buttons on Right */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(m.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySummary(m.id, m.summary)}
                    className="border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === m.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setSelectedMeeting(m)}
                    className="bg-slate-900/90 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 text-xs h-8 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Bottom Link */}
          <div className="pt-2">
            <Link
              href="/dashboard/history"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors hover:underline"
            >
              <span>View all syntheses in Meeting Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">
                  {selectedMeeting.filename}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                Close (ESC)
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {selectedMeeting.summary}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMeeting(null)}
                className="text-xs border-slate-700 text-slate-300 rounded-xl"
              >
                Done
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(selectedMeeting.summary);
                  setSelectedMeeting(null);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Copy Markdown
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
