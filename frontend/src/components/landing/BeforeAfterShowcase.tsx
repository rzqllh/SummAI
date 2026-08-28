"use client";

import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { MorphIcon, IconNode } from "morphicons/react";
import { motion, useReducedMotion } from "motion/react";

const ICON_RAW_NODE: IconNode = [
  ["path", { d: "M4 6h16M4 12h16M4 18h10" }],
];

const ICON_STRUCTURED_NODE: IconNode = [
  ["path", { d: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" }],
];

export function BeforeAfterShowcase() {
  const [activeView, setActiveView] = useState<"raw" | "structured">("structured");
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const rawTranscript = `[00:01:12] Dimas: Halo semuanya, sorry agak telat tadi internet drop. Jadi gimana status sprint 24?
[00:01:25] Sarah: Iya Mas, frontend udah selesai 80%, tapi masih nunggu API docs auth dari backend team.
[00:02:00] Budi: Oh auth API ya? Itu sebenarnya endpoint /api/auth/v2 udah deploy di staging, cuma memang Swagger docs-nya belum diupdate karena kemarin fokus fix bug payment gateway.
[00:03:15] Dimas: Oke, Budi tolong prioritasin update docs auth itu hari ini ya, biar Sarah bisa lanjut integrasi besok pagi. Deadline release tetap Jumat depan.
[00:04:10] Sarah: Siap Mas. Terus gimana soal migration DB SQLite ke PostgreSQL?
[00:04:45] Budi: Script migration udah gw buat pakai Alembic, tapi butuh backup dump data production dulu sebelum dijalankan. Gw schedule hari Kamis malam jam 23:00 WIB biar pas low traffic.
[00:05:30] Dimas: Good idea. Pastiin Mas Dimas di-notify pas backup selesai. Ada kendala lain?
[00:06:00] Sarah: Dari frontend aman, tinggal nunggu docs itu aja.
[00:06:20] Dimas: Mantap, meeting kelar ya. Semangat semuanya!`;

  const structuredMarkdown = `📌 Ringkasan Eksekutif
Sinkronisasi status Sprint 24: Integrasi Frontend Auth menunggu update dokumentasi Swagger dari backend. Migrasi database PostgreSQL dijadwalkan Kamis malam.

🎯 Keputusan Final
- Target rilis production tetap dipertahankan pada hari Jumat depan.
- Eksekusi migration database dijalankan Kamis 23:00 WIB (low traffic).

📝 Action Items & To-Do List
| Task | PIC | Deadline |
| --- | --- | --- |
| Update Swagger Docs Auth v2 | Budi | Hari ini |
| Integrasi Auth API ke Frontend | Sarah | Besok pagi |
| Database Migration Script Execution | Budi | Kamis 23:00 WIB |`;

  const handleCopy = () => {
    navigator.clipboard.writeText(structuredMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.section
      id="comparison"
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-20 border-t border-slate-800/80 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider font-mono">
            <span>Interactive Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
            From Messy Discussions to Structured Action Plans
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Never scroll through 10 pages of unstructured transcript text again.
          </p>
        </div>

        {/* Morphing Toggle Controls (Motion Point #3) */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveView("raw")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                activeView === "raw"
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MorphIcon
                icon={activeView === "raw" ? ICON_RAW_NODE : ICON_STRUCTURED_NODE}
                size={14}
                color={activeView === "raw" ? "#f8fafc" : "#94a3b8"}
                reducedMotion="user"
              />
              <span>Raw transcript</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("structured")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                activeView === "structured"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MorphIcon
                icon={activeView === "structured" ? ICON_STRUCTURED_NODE : ICON_RAW_NODE}
                size={14}
                color={activeView === "structured" ? "#020617" : "#94a3b8"}
                reducedMotion="user"
              />
              <span>Structured output</span>
            </button>
          </div>
        </div>

        {/* Panel Container */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          {activeView === "raw" ? (
            <div className="flex flex-col">
              <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 font-mono">
                  Raw Transcript (Unstructured & Verbose)
                </span>
                <span className="font-mono text-slate-400 text-[11px]">
                  125 words • 4 speaker turns
                </span>
              </div>
              <div className="p-6 bg-slate-950/80 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[420px] whitespace-pre-wrap">
                {rawTranscript}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-400">
                    Preset: Action Items & Tasks • Ready to export
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-300 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1 bg-slate-800/60 border border-slate-700/60"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px] font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px]">Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-6 bg-slate-950/80 text-xs space-y-5 overflow-y-auto max-h-[420px]">
                {/* Executive Summary */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
                    📌 Ringkasan Eksekutif
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Sinkronisasi status Sprint 24: Integrasi Frontend Auth menunggu update dokumentasi Swagger dari backend. Migrasi database PostgreSQL dijadwalkan Kamis malam.
                  </p>
                </div>

                {/* Key Decisions */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    🎯 Keputusan Final
                  </div>
                  <ul className="list-disc list-inside text-slate-300 space-y-1 text-xs pl-1">
                    <li>Target rilis production tetap dipertahankan pada hari Jumat depan.</li>
                    <li>Eksekusi migration database dijalankan Kamis 23:00 WIB (low traffic).</li>
                  </ul>
                </div>

                {/* Action Items Table */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                    📝 Action Items & To-Do List
                  </div>
                  <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/60">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 font-mono">
                        <tr>
                          <th className="p-2.5">Task</th>
                          <th className="p-2.5">PIC</th>
                          <th className="p-2.5">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                        <tr>
                          <td className="p-2.5 font-sans text-slate-200">Update Swagger Docs Auth v2</td>
                          <td className="p-2.5 text-emerald-400 font-semibold">Budi</td>
                          <td className="p-2.5 text-slate-400">Hari ini</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-sans text-slate-200">Integrasi Auth API ke Frontend</td>
                          <td className="p-2.5 text-cyan-400 font-semibold">Sarah</td>
                          <td className="p-2.5 text-slate-400">Besok pagi</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-sans text-slate-200">Database Migration Script Execution</td>
                          <td className="p-2.5 text-emerald-400 font-semibold">Budi</td>
                          <td className="p-2.5 text-slate-400">Kamis 23:00 WIB</td>
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
    </motion.section>
  );
}
