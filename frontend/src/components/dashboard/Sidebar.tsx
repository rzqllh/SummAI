"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wand2,
  History,
  Settings,
  ArrowLeft,
  AudioWaveform,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: "Summarizer Studio",
      href: "/dashboard/summarizer",
      icon: Wand2,
      badge: "AI",
    },
    {
      label: "Meeting Library",
      href: "/dashboard/history",
      icon: History,
      badge: null,
    },
    {
      label: "Settings & Presets",
      href: "/dashboard/settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800/80">
          <Link
            href="/"
            className="flex items-center gap-3 group transition-colors"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <AudioWaveform className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  SummAI
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Meeting Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>

          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-emerald-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* System Status & Return to Home */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {/* Quick Engine Status Card */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Inference
              </span>
              <span className="text-emerald-400 font-semibold text-[11px]">Active</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Groq Whisper</span>
              <span className="text-slate-400 font-mono">v3 Turbo</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Gemini Flash</span>
              <span className="text-slate-400 font-mono">3.6</span>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors border border-slate-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Landing Page</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
