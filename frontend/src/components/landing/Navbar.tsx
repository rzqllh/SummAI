"use client";

import { useState } from "react";
import Link from "next/link";
import { AudioWaveform, ArrowRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const navLinks = [
    { href: "#capabilities", label: "Capabilities" },
    { href: "#comparison", label: "Interactive Demo" },
    { href: "#workflow", label: "How It Works" },
    { href: "#privacy", label: "Privacy & Architecture" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-lg p-1 transition-transform duration-150 ease-out hover:-translate-y-px"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <AudioWaveform className="w-4 h-4 font-bold" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              SummAI
            </span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Studio
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors duration-150 ease-out hover:text-emerald-400 focus:outline-none focus:text-emerald-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right CTA & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/summarizer" className="hidden sm:block">
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 text-xs px-4 h-9 rounded-xl flex items-center gap-2 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors duration-150"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown with AnimatePresence & motion (Motion Point #1) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-2 pb-6 space-y-3"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-emerald-400 transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2">
              <Link
                href="/dashboard/summarizer"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button
                  size="sm"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs h-10 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
                >
                  <span>Launch Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
