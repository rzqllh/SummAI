"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Lock,
  Calendar,
  Copy,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingMarkdown } from "@/components/markdown/MeetingMarkdown";
import { getApiBaseUrl } from "@/lib/api";

function SharedMeetingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchSharedMeeting = (pw?: string) => {
    if (!token) {
      setError("No share token provided in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    axios
      .get(`${getApiBaseUrl()}/api/share/${token}`, {
        params: pw ? { password: pw } : {},
      })
      .then((res) => {
        if (res.data.password_required) {
          setPasswordRequired(true);
        } else if (res.data.error) {
          setError(res.data.error);
        } else {
          setMeeting(res.data);
          setPasswordRequired(false);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Shared meeting link is invalid or expired.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSharedMeeting();
  }, [token]);

  const handleCopy = () => {
    if (meeting?.summary) {
      navigator.clipboard.writeText(meeting.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-xs font-mono text-slate-400 animate-pulse">
          Loading secure shared meeting...
        </div>
      </div>
    );
  }

  if (passwordRequired && !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-white text-sm">Password Protected Meeting</h3>
            <p className="text-xs text-slate-400">
              Enter access password to view this meeting summary.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchSharedMeeting(password);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 rounded-xl"
            >
              Unlock Meeting
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3 rounded-2xl bg-slate-900 border border-slate-800 p-8">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Access Denied</h3>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified SummAI Report</span>
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {meeting?.title || meeting?.filename || "Meeting Summary"}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(meeting?.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleCopy}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shrink-0"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Copied MD</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </>
            )}
          </Button>
        </div>

        {/* Content Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          <MeetingMarkdown content={meeting?.summary || ""} />
        </div>

        {/* Raw Transcript (if permitted) */}
        {meeting?.raw_transcript && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Raw Audio Transcript
            </h3>
            <div className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800/80 max-h-80 overflow-y-auto">
              {meeting.raw_transcript}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="text-xs font-mono text-slate-400 animate-pulse">
            Loading...
          </div>
        </div>
      }
    >
      <SharedMeetingContent />
    </Suspense>
  );
}
