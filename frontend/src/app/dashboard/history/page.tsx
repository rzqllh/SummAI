"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import {
  FileText,
  Calendar,
  Trash2,
  Eye,
  Copy,
  CheckCircle2,
  Music,
  Video,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistorySearchFilter } from "@/components/history/HistorySearchFilter";
import {
  MeetingDetailDrawer,
  HistoryMeeting,
} from "@/components/history/MeetingDetailDrawer";

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<HistoryMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedMeeting, setSelectedMeeting] = useState<HistoryMeeting | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    axios
      .get("http://localhost:8000/api/history", {
        params: {
          q: searchQuery,
          type: selectedType === "all" ? "" : selectedType,
        },
      })
      .then((res) => {
        if (isMounted) {
          setMeetings(res.data.meetings || res.data || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load meetings", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedType]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this meeting summary from local SQLite?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/history/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (selectedMeeting?.id === id) {
        setSelectedMeeting(null);
      }
    } catch (err) {
      console.error("Failed to delete meeting", err);
      alert("Failed to delete meeting. Please check backend status.");
    }
  };

  const handleCopySummary = (id: number, summaryText: string) => {
    navigator.clipboard.writeText(summaryText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBadge = (type: string) => {
    const t = type?.toLowerCase() || "txt";
    if (["mp4", "mov", "mkv", "video"].includes(t)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Video className="w-3.5 h-3.5" />
          <span>MP4</span>
        </span>
      );
    }
    if (["mp3", "wav", "m4a", "audio"].includes(t)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Music className="w-3.5 h-3.5" />
          <span>MP3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
        <FileText className="w-3.5 h-3.5" />
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search & Filter Component */}
      <HistorySearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono text-slate-400">
          Showing {meetings.length} meeting {meetings.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Meetings Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          Loading library...
        </div>
      ) : meetings.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4 border border-slate-800/80 bg-slate-950/60 shadow-xl">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              No meeting records found
            </h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? "Try adjusting your search terms or format filters."
                : "Your SQLite meeting library is currently empty."}
            </p>
          </div>
          <Link href="/dashboard/summarizer">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 rounded-xl inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 font-bold" />
              <span>Create New Summary</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="glass-card rounded-2xl p-5 border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 flex flex-col justify-between space-y-4 shadow-xl group transition-all"
            >
              <div className="space-y-2.5">
                {/* Top row: Media badge and Date */}
                <div className="flex items-center justify-between gap-2">
                  {getBadge(meeting.media_type)}

                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(meeting.created_at)}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {meeting.filename || `Meeting #${meeting.id}`}
                </h3>

                {/* Snippet */}
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {meeting.summary?.replace(/[#*`_]/g, "").substring(0, 260)}...
                </p>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => handleDelete(meeting.id)}
                  className="text-xs text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySummary(meeting.id, meeting.summary)}
                    className="border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === meeting.id ? (
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
                    onClick={() => setSelectedMeeting(meeting)}
                    className="bg-slate-900/90 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 text-xs h-8 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Drawer / Modal */}
      <MeetingDetailDrawer
        meeting={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
