"use client";

import { useState, useEffect, useRef } from "react";
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
  ListTodo,
  CheckSquare,
  Square,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistorySearchFilter } from "@/components/history/HistorySearchFilter";
import {
  MeetingDetailDrawer,
  HistoryMeeting,
} from "@/components/history/MeetingDetailDrawer";
import { getApiBaseUrl } from "@/lib/api";

interface ActionItem {
  id: number;
  meeting_id: number;
  task: string;
  owner?: string;
  target_date?: string;
  status: "open" | "in_progress" | "done" | "cancelled";
  created_at: string;
  meeting_title: string;
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<"meetings" | "action_items">("meetings");
  const [meetings, setMeetings] = useState<HistoryMeeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedMeeting, setSelectedMeeting] = useState<HistoryMeeting | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced meeting search with AbortController
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(() => {
      setLoading(true);
      axios
        .get(`${getApiBaseUrl()}/api/history`, {
          params: {
            q: searchQuery,
            type: selectedType === "all" ? "" : selectedType,
          },
          signal: controller.signal,
        })
        .then((res) => {
          setMeetings(res.data.meetings || res.data || []);
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            console.error("Failed to load meetings", err);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, selectedType]);

  // Load Action Items
  const loadActionItems = () => {
    axios
      .get(`${getApiBaseUrl()}/api/action-items`)
      .then((res) => {
        setActionItems(res.data.action_items || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (activeTab === "action_items") {
      loadActionItems();
    }
  }, [activeTab]);

  const toggleActionItemStatus = async (item: ActionItem) => {
    const nextStatus = item.status === "done" ? "open" : "done";
    try {
      await axios.patch(`${getApiBaseUrl()}/api/action-items/${item.id}`, {
        status: nextStatus,
      });
      setActionItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a))
      );
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this meeting record from local SQLite?")) {
      return;
    }
    try {
      await axios.delete(`${getApiBaseUrl()}/api/history/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (selectedMeeting?.id === id) {
        setSelectedMeeting(null);
      }
    } catch (err) {
      console.error("Failed to delete meeting", err);
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
      return "8/28/2026";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Meeting Library</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Isolated local SQLite workspace for meeting transcripts, MoMs, and action plans.
          </p>
        </div>

        {/* View Switcher: Meetings vs Action Items */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("meetings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "meetings"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Meetings ({meetings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("action_items")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "action_items"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Action Tracker</span>
          </button>
        </div>
      </div>

      {activeTab === "meetings" ? (
        <>
          {/* Search & Filter Component */}
          <HistorySearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
          />

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
                      type="button"
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
        </>
      ) : (
        /* ACTION ITEMS TRACKER VIEW */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-white">Action Items & Deliverables</h3>
              <p className="text-xs text-slate-400">
                Track deliverables, assignees, and deadlines derived from your synthesized meetings.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {actionItems.filter((a) => a.status === "open").length} Open Tasks
            </span>
          </div>

          {actionItems.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3 border border-slate-800 bg-slate-950/60">
              <ListTodo className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No action items found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Generate meetings with the &quot;Corporate MoM&quot; or &quot;Action Items &amp; Tasks&quot; preset to automatically populate this tracker.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleActionItemStatus(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    item.status === "done"
                      ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                      : "bg-slate-900/90 border-slate-800 hover:border-emerald-500/40 shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 text-emerald-400 shrink-0"
                  >
                    {item.status === "done" ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1">
                    <p
                      className={`text-xs leading-relaxed ${
                        item.status === "done" ? "line-through text-slate-500" : "text-slate-200 font-medium"
                      }`}
                    >
                      {item.task}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                      {item.owner && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          PIC: {item.owner}
                        </span>
                      )}
                      {item.target_date && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" />
                          <span>{item.target_date}</span>
                        </span>
                      )}
                      <span className="text-slate-500 truncate max-w-[200px]">
                        From: {item.meeting_title}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
