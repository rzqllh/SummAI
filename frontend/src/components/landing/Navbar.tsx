"use client";

import Link from "next/link";
import { AudioWaveform, ArrowRight, Sparkles, Shield, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <AudioWaveform className="w-5 h-5 font-bold" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              SummAI
            </span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Open Studio
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a
            href="#features"
            className="hover:text-emerald-400 transition-colors"
          >
            Features
          </a>
          <a
            href="#before-after"
            className="hover:text-emerald-400 transition-colors"
          >
            Interactive Demo
          </a>
          <a
            href="#workflow"
            className="hover:text-emerald-400 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#privacy"
            className="hover:text-emerald-400 transition-colors"
          >
            Privacy & Architecture
          </a>
        </nav>

        {/* Call to Action */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 text-xs px-4 h-9 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
