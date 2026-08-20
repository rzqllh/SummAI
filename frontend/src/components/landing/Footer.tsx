"use client";

import Link from "next/link";
import { AudioWaveform, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 py-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bottom CTA Banner */}
        <div className="glass-card rounded-3xl p-8 sm:p-12 border border-emerald-500/30 mb-16 text-center max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-4 relative z-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to Accelerate Your Meeting Workflows?
            </h3>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Launch the Summarizer Studio now. No sign up required, just drop
              your audio file and get structured intelligence immediately.
            </p>
            <div className="pt-2">
              <Link href="/dashboard/summarizer">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-8 h-12 rounded-xl shadow-lg shadow-emerald-500/20 text-sm inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Summarizer Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Brand & Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-900 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <AudioWaveform className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-300">
              SummAI • Meeting Intelligence Studio
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/summarizer" className="hover:text-emerald-400 transition-colors">
              Studio
            </Link>
            <Link href="/dashboard/history" className="hover:text-emerald-400 transition-colors">
              Library
            </Link>
            <Link href="/dashboard/settings" className="hover:text-emerald-400 transition-colors">
              Settings
            </Link>
          </div>

          <div className="text-slate-400">
            Powered by Groq Whisper & Google Gemini
          </div>
        </div>
      </div>
    </footer>
  );
}
