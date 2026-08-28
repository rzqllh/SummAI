"use client";

import { useState } from "react";
import axios from "axios";
import {
  Share2,
  Copy,
  CheckCircle2,
  Lock,
  X,
  Globe,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: number;
  meetingTitle?: string;
}

export function ShareLinkModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
}: ShareLinkModalProps) {
  const [allowTranscript, setAllowTranscript] = useState(true);
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post(`${getApiBaseUrl()}/api/share`, {
        meeting_id: meetingId,
        allow_transcript: allowTranscript,
        password: password.trim() || null,
      });

      const token = res.data.share_token;
      const origin = typeof window !== "undefined" ? window.location.origin : "https://summai.rzqllh-labs.workers.dev";
      const fullUrl = `${origin}/share?token=${token}`;
      setShareUrl(fullUrl);
    } catch (err) {
      console.error("Failed to generate share link", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Share Meeting Report</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                {meetingTitle || `Meeting #${meetingId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!shareUrl ? (
          <div className="space-y-4 text-xs">
            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200 block">Include Raw Transcript</span>
                  <span className="text-[11px] text-slate-400 block">
                    Allow recipients to view full word-for-word audio transcript.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowTranscript}
                  onChange={(e) => setAllowTranscript(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </label>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Optional Access Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for public access"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Secure Link...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Create Shareable Link</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Link created! Anyone with this link can view this meeting.</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-xs text-slate-200 flex-1 outline-none font-mono"
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-7 px-3 rounded-lg flex items-center gap-1 shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
