"use client";

import { useState } from "react";
import { FileX, FileCheck, ArrowRight, CheckCircle2, Copy, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BeforeAfterShowcase() {
  const [activeTab, setActiveTab] = useState<"side-by-side" | "raw" | "ai">("side-by-side");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawTranscript = `[00:01:12] Dimas: Halo semuanya, sorry agak telat tadi internet drop. Jadi gimana status sprint 24?
[00:01:25] Sarah: Iya Mas, frontend udah selesai 80%, tapi masih nunggu API docs auth dari backend team.
[00:02:00] Budi: Oh auth API ya? Itu sebenarnya endpoint /api/auth/v2 udah deploy di staging, cuma memang Swagger docs-nya belum diupdate karena kemarin fokus fix bug payment gateway.
[00:03:15] Dimas: Oke, Budi tolong prioritasin update docs auth itu hari ini ya, biar Sarah bisa lanjut integrasi besok pagi. Deadline release tetap Jumat depan.
[00:04:10] Sarah: Siap Mas. Terus gimana soal migration DB SQLite ke PostgreSQL?
[00:04:45] Budi: Script migration udah gw buat pakai Alembic, tapi butuh backup dump data production dulu sebelum dijalankan. Gw schedule hari Kamis malam jam 23:00 WIB biar pas low traffic.
[00:05:30] Dimas: Good idea. Pastiin Mas Dimas di-notify pas backup selesai. Ada kendala lain?
[00:06:00] Sarah: Dari frontend aman, tinggal nunggu docs itu aja.
[00:06:20] Dimas: Mantap, meeting kelar ya. Semangat semuanya!`;

  return (
    <section id="before-after" className="py-20 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Interactive Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            See the Magic: Raw Audio vs AI Synthesis
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Never scroll through 10 pages of messy meeting transcripts again.
          </p>
        </div>

        {/* View switcher buttons for small screens */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab("side-by-side")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "side-by-side"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "raw"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Raw Transcript Only
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "ai"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              AI Structured Summary
            </button>
          </div>
        </div>

        {/* Side by Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Raw Transcript */}
          {(activeTab === "side-by-side" || activeTab === "raw") && (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileX className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-slate-300">
                    Raw Transcript (Unstructured & Verbose)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  125 Words • 4 Speaker turns
                </span>
              </div>
              <div className="p-5 flex-1 bg-slate-950/60 font-mono text-xs text-slate-400 leading-relaxed overflow-y-auto max-h-[380px] whitespace-pre-wrap">
                {rawTranscript}
              </div>
            </div>
          )}

          {/* Right: Structured AI Output */}
          {(activeTab === "side-by-side" || activeTab === "ai") && (
            <div className="glass-card rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-500/5 overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    Synthesized Summary (Notion & Jira Format)
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-300 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 flex-1 bg-slate-950/40 text-xs space-y-4 overflow-y-auto max-h-[380px]">
                {/* Executive Summary */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    📌 Ringkasan Eksekutif
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Sinkronisasi status Sprint 24: Integrasi Frontend Auth menunggu update dokumentasi Swagger dari backend. Migrasi database PostgreSQL dijadwalkan Kamis malam.
                  </p>
                </div>

                {/* Key Decisions */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    🎯 Keputusan Final
                  </div>
                  <ul className="list-disc list-inside text-slate-300 space-y-1 text-xs pl-1">
                    <li>Target rilis production tetap dipertahankan pada hari Jumat depan.</li>
                    <li>Eksekusi migration database dijalankan Kamis 23:00 WIB (low traffic).</li>
                  </ul>
                </div>

                {/* Action Items Table */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    📝 Action Items & To-Do List
                  </div>
                  <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/60">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="p-2">Task</th>
                          <th className="p-2">PIC</th>
                          <th className="p-2">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr>
                          <td className="p-2">Update Swagger Docs Auth v2</td>
                          <td className="p-2 font-mono text-emerald-400">Budi</td>
                          <td className="p-2 font-mono text-slate-400">Hari ini</td>
                        </tr>
                        <tr>
                          <td className="p-2">Integrasi Auth API ke Frontend</td>
                          <td className="p-2 font-mono text-cyan-400">Sarah</td>
                          <td className="p-2 font-mono text-slate-400">Besok pagi</td>
                        </tr>
                        <tr>
                          <td className="p-2">Database Migration Script Execution</td>
                          <td className="p-2 font-mono text-emerald-400">Budi</td>
                          <td className="p-2 font-mono text-slate-400">Kamis 23:00 WIB</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
