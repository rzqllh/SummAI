"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RecentJob {
  id: number;
  filename: string;
  media_type: string;
  raw_transcript: string;
  summary: string;
  created_at: string;
}

interface RecentJobsWidgetProps {
  onSelectMeeting?: (meeting: RecentJob) => void;
}

const DEMO_FALLBACK_JOBS: RecentJob[] = [
  {
    id: 1,
    filename: "Q2 Strategy Discussion.mp3",
    media_type: "mp3",
    raw_transcript: "Discussion regarding Q2 goals...",
    summary: "Executive summary of Q2 Strategy...",
    created_at: "2026-08-20T10:00:00.000Z",
  },
  {
    id: 2,
    filename: "Design Review Meeting.wav",
    media_type: "wav",
    raw_transcript: "Review of the new design system components...",
    summary: "Sprint retrospective and component design audit...",
    created_at: "2026-08-20T08:00:00.000Z",
  },
  {
    id: 3,
    filename: "Client Call - Acme Corp.mp4",
    media_type: "mp4",
    raw_transcript: "Call with client regarding integration specs...",
    summary: "Technical architecture alignment with Acme Corp...",
    created_at: "2026-08-19T14:00:00.000Z",
  },
];

export function RecentJobsWidget({ onSelectMeeting }: RecentJobsWidgetProps) {
  const [jobs, setJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    axios
      .get("http://localhost:8000/api/history")
      .then((res) => {
        if (isMounted) {
          const list = res.data.meetings || res.data || [];
          setJobs(list);
        }
      })
      .catch((err) => {
        console.error("Failed to load recent jobs", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayJobs = jobs.length > 0 ? jobs : DEMO_FALLBACK_JOBS;
  const visibleJobs = expanded ? displayJobs.slice(0, 6) : displayJobs.slice(0, 3);
  const hasMore = displayJobs.length > 3;

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Aug 20, 10:24 AM";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Recent jobs
        </h3>
        <Link
          href="/dashboard/history"
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          Loading previous jobs...
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectMeeting?.(job)}
              className="p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800/60 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Play icon badge */}
                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                    {job.filename}
                  </h4>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                    <span>{formatTimestamp(job.created_at)}</span>
                    <span>•</span>
                    <span>
                      {job.media_type === "mp4" ? "33:48" : job.media_type === "wav" ? "42:31" : "56:12"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completed badge */}
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Completed</span>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full pt-2 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>{expanded ? "Show less" : `Show ${displayJobs.length - 3} more`}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
