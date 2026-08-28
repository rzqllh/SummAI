"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/auth/UserNav";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();

  const getPageInfo = () => {
    if (pathname === "/dashboard") {
      return {
        title: "Overview",
        description: "Analytics & meeting library",
      };
    }
    if (pathname.startsWith("/dashboard/summarizer")) {
      return {
        title: "Summarizer Studio",
        description: "4-step AI transcription & structured synthesis",
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
        description: "Configure API credentials and prompt templates",
      };
    }
    return {
      title: "Dashboard",
      description: "Meeting Intelligence Workspace",
    };
  };

  const { title, description } = getPageInfo();
  const isSummarizer = pathname.startsWith("/dashboard/summarizer");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${title} | SummAI`;
    }
  }, [title]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-8 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md transition-all">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 -ml-1 text-slate-400 rounded-lg md:hidden hover:text-white hover:bg-slate-900 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {/* Action controls & User Navigation */}
      <div className="flex items-center gap-2.5">
        {/* User Account / Workspace Pill */}
        <UserNav />

        {/* Primary Action Button (hidden when already on Summarizer page to reduce noise) */}
        {!isSummarizer && (
          <Link href="/dashboard/summarizer">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-sm text-xs px-3 h-8 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Summary</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
