"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  LogOut,
  Shield,
  ChevronDown,
  LogIn,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

export function UserNav() {
  const { user, isLoggedIn, openAuthModal, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isDefault = user.email === "default";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all duration-150 focus:outline-none focus:border-slate-700"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name}
            width={18}
            height={18}
            className="w-4.5 h-4.5 rounded-full object-cover border border-slate-700 shrink-0"
          />
        ) : (
          <div className="w-4.5 h-4.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <User className="w-2.5 h-2.5" />
          </div>
        )}

        <div className="text-left hidden sm:block max-w-[110px] truncate">
          <div className="font-medium text-slate-200 text-xs truncate leading-tight">
            {isDefault ? "Personal" : user.name}
          </div>
        </div>

        <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
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

            {/* Custom Modal Triggers */}
            <div className="space-y-1.5 pt-1">
              <Button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openAuthModal();
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isLoggedIn ? "Switch Account / Workspace" : "Select Workspace Account"}</span>
              </Button>

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 text-left rounded-xl hover:bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2 transition-colors mt-1"
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
