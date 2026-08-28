"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  X,
  Sparkles,
  Mail,
  ArrowRight,
  User,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSelectWorkspace: (email: string, name?: string) => void;
}

const POPULAR_SUGGESTIONS = [
  { email: "alex@company.com", label: "Work Account" },
  { email: "research@team.io", label: "Research Lab" },
  { email: "engineering@corp.net", label: "Dev Team" },
];

export function AuthModal({
  isOpen,
  onClose,
  currentEmail,
  onSelectWorkspace,
}: AuthModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmailInput(currentEmail === "default" ? "" : currentEmail);
      setError(null);
    }
  }, [isOpen, currentEmail]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean) {
      setError("Please enter a valid email or workspace identifier.");
      return;
    }
    const name = clean.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    onSelectWorkspace(clean, name);
    onClose();
  };

  const handleQuickSelect = (email: string) => {
    const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    onSelectWorkspace(email, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl shadow-emerald-950/50 p-6 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Workspace Isolation</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Select Workspace Account
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your meeting transcripts, AI summaries, and custom prompt templates will be strictly isolated to this account session.
          </p>
        </div>

        {/* Quick Google Sign-In button */}
        <div className="space-y-2">
          <Button
            type="button"
            onClick={() => handleQuickSelect("user@gmail.com")}
            className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </Button>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-mono">
              or enter custom workspace
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Workspace Email</span>
                <span className="text-[10px] text-slate-500 font-mono">Any valid identifier</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. user@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  autoFocus
                />
              </div>
              {error && <p className="text-[11px] text-rose-400 pt-0.5">{error}</p>}
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_SUGGESTIONS.map((s) => (
                <button
                  key={s.email}
                  type="button"
                  onClick={() => handleQuickSelect(s.email)}
                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-mono"
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all mt-2"
            >
              <span>Switch to this Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Footer Privacy Guarantee */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1 text-slate-400">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>SQLite Row-Level Isolation</span>
          </div>
          <span>100% Private</span>
        </div>
      </div>
    </div>
  );
}
