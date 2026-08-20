"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();

  const getPageInfo = () => {
    if (pathname === "/dashboard") {
      return {
        title: "Overview",
        description: "Analytics & quick meeting upload",
      };
    }
    if (pathname.startsWith("/dashboard/summarizer")) {
      return {
        title: "Summarizer Studio",
        description: "4-step AI transcription and structured synthesis",
      };
    }
    if (pathname.startsWith("/dashboard/history")) {
      return {
        title: "Meeting Library",
        description: "Search, review, and export previous meetings",
      };
    }
    if (pathname.startsWith("/dashboard/settings")) {
      return {
        title: "Settings & Presets",
        description: "Configure API credentials and custom prompt templates",
      };
    }
    return {
      title: "Dashboard",
      description: "Meeting Intelligence Workspace",
    };
  };

  const { title, description } = getPageInfo();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${title} | SummAI`;
    }
  }, [title]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-slate-400 rounded-lg md:hidden hover:text-white hover:bg-slate-900 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {/* Action buttons & system health */}
      <div className="flex items-center gap-3">
        {/* Engine status indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Local SQLite <span className="text-slate-600">|</span> Groq STT
          </span>
        </div>

        <Link href="/dashboard/summarizer">
          <Button
            size="sm"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/20 text-xs px-3.5 h-9 rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 font-bold" />
            <span>New Summary</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
