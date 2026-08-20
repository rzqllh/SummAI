"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Copy,
  CheckCircle2,
  Download,
  RotateCcw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryExporterProps {
  summary: string;
  filename: string;
  onReset: () => void;
}

export function SummaryExporter({
  summary,
  filename,
  onReset,
}: SummaryExporterProps) {
  const [copyState, setCopyState] = useState<string | null>(null);

  const handleCopy = (type: "md" | "notion" | "jira") => {
    let textToCopy = summary;

    if (type === "jira") {
      // Basic translation of Markdown headers & bullet points to Jira markup format
      textToCopy = summary
        .replace(/^### (.*$)/gim, "h3. $1")
        .replace(/^## (.*$)/gim, "h2. $1")
        .replace(/^# (.*$)/gim, "h1. $1")
        .replace(/^\* /gim, "* ")
        .replace(/\*\*(.*?)\*\*/g, "*$1*");
    }

    navigator.clipboard.writeText(textToCopy);
    setCopyState(type);
    setTimeout(() => setCopyState(null), 2000);
  };

  const handleDownloadMd = () => {
    const element = document.createElement("a");
    const file = new Blob([summary], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${filename || "meeting"}-summary.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Synthesis Saved to SQLite</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {filename}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Meeting Intelligence Export
          </h2>
        </div>

        {/* 1-Click Action Hub */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy("md")}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-9 px-3 rounded-xl"
          >
            {copyState === "md" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span className="text-emerald-400">Copied MD</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy("jira")}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-9 px-3 rounded-xl"
          >
            {copyState === "jira" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
                <span className="text-cyan-400">Copied Jira</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                <span>Copy Jira</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMd}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-9 px-3 rounded-xl"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            <span>Download .md</span>
          </Button>
        </div>
      </div>

      {/* Rendered Summary Box */}
      <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800/90 max-h-[550px] overflow-y-auto prose prose-invert prose-emerald prose-sm max-w-none">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-400">
          Saved in local history library. Access anytime from Dashboard.
        </span>

        <Button
          onClick={onReset}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Synthesis</span>
        </Button>
      </div>
    </div>
  );
}
