"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  LogOut,
  Shield,
  Check,
  ChevronDown,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

export function UserNav() {
  const { user, isLoggedIn, loginWithGoogle, logout, setUserWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const isDefault = user.email === "default";

  const handleManualSwitch = () => {
    if (customInput.trim()) {
      setUserWorkspace(customInput.trim());
      setCustomInput("");
      setShowManualInput(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 transition-all duration-150 focus:outline-none focus:border-emerald-500/50"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name}
            width={22}
            height={22}
            className="w-5.5 h-5.5 rounded-full object-cover border border-emerald-500/30"
          />
        ) : (
          <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <User className="w-3 h-3" />
          </div>
        )}

        <div className="text-left hidden sm:block max-w-[130px] truncate">
          <div className="font-semibold text-slate-200 truncate leading-tight">
            {isDefault ? "Guest Workspace" : user.name}
          </div>
          <div className="text-[10px] text-slate-400 truncate font-mono">
            {isDefault ? "Local Isolation" : user.email}
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl p-3.5 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
            {/* Header info */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-white truncate">{user.name}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
              <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                <Shield className="w-3 h-3" />
                <span>Isolated SQLite Database Session</span>
              </div>
            </div>

            {/* Google Login / Account switch */}
            <div className="space-y-1.5 pt-1">
              <Button
                onClick={() => {
                  loginWithGoogle();
                  setIsOpen(false);
                }}
                className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
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
                <span>{isLoggedIn ? "Switch Google Account" : "Sign in with Google"}</span>
              </Button>

              {/* Manual Email Workspace Switcher */}
              {!showManualInput ? (
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="w-full py-2 px-3 text-left rounded-xl hover:bg-slate-900 text-slate-300 text-xs flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Switch Email Workspace</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Custom</span>
                </button>
              ) : (
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    Enter Workspace Email:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="email"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="e.g. user@telkom.co.id"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <Button
                      size="sm"
                      onClick={handleManualSwitch}
                      className="h-8 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 text-left rounded-xl hover:bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Reset to Guest</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
