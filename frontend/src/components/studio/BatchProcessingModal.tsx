"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

export interface BatchFileItem {
  id: string;
  filename: string;
  filesize: number;
  media_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  meeting_id?: number | null;
  error?: string;
}

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
}

export function BatchProcessingModal({
  isOpen,
  onClose,
  files,
}: BatchProcessingModalProps) {
  const [jobItems, setJobItems] = useState<BatchFileItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize and queue jobs on mount
  useEffect(() => {
    if (!isOpen || files.length === 0) return;

    const initBatch = async () => {
      setIsInitializing(true);
      const items: BatchFileItem[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
        try {
          const res = await axios.post<{ job: { id: string } }>(`${getApiBaseUrl()}/api/jobs`, {
            filename: file.name,
            media_type: ext,
            filesize: file.size,
          });

          items.push({
            id: res.data.job.id,
            filename: file.name,
            filesize: file.size,
            media_type: ext,
            status: "pending",
            progress: 0,
          });
        } catch {
          items.push({
            id: `err_${Date.now()}_${Math.random()}`,
            filename: file.name,
            filesize: file.size,
            media_type: ext,
            status: "failed",
            progress: 0,
            error: "Failed to queue job",
          });
        }
      }

      setJobItems(items);
      setIsInitializing(false);
    };

    initBatch();
  }, [isOpen, files]);

  // Live polling for queue status
  useEffect(() => {
    if (!isOpen || jobItems.length === 0) return;

    const hasPending = jobItems.some((j) => j.status === "pending" || j.status === "processing");
    if (!hasPending) return;

    const pollInterval = setInterval(async () => {
      try {
        const updated = await Promise.all(
          jobItems.map(async (item) => {
            if (item.status === "completed" || item.status === "failed") return item;
            try {
              const res = await axios.get<{ status: string; progress: number; meeting_id?: number; error_message?: string }>(
                `${getApiBaseUrl()}/api/jobs/${item.id}`
              );
              return {
                ...item,
                status: res.data.status as BatchFileItem["status"],
                progress: res.data.progress || 0,
                meeting_id: res.data.meeting_id,
                error: res.data.error_message,
              };
            } catch {
              return item;
            }
          })
        );
        setJobItems(updated);
      } catch {}
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [isOpen, jobItems]);

  if (!isOpen) return null;

  const completedCount = jobItems.filter((j) => j.status === "completed").length;
  const isAllDone = jobItems.length > 0 && completedCount === jobItems.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Batch Queue Processing</h3>
              <p className="text-[11px] text-slate-400">
                {isAllDone
                  ? "All batch items processed successfully!"
                  : `Processing ${jobItems.length} queued recordings concurrently`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Overview Header */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${!isAllDone ? "animate-spin" : ""}`} />
            <span>Progress: {completedCount} / {jobItems.length} completed</span>
          </span>
          <span className="font-mono font-bold text-purple-300">
            {jobItems.length > 0 ? Math.round((completedCount / jobItems.length) * 100) : 0}%
          </span>
        </div>

        {/* Job Queue List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {jobItems.map((job) => (
            <div
              key={job.id}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200 truncate max-w-[240px]">
                    {job.filename}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {(job.filesize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {job.status === "completed" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Done</span>
                  </span>
                ) : job.status === "processing" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-semibold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Processing</span>
                  </span>
                ) : job.status === "failed" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    <span>Failed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>Queued</span>
                  </span>
                )}
              </div>
            </div>
          ))}

          {isInitializing && (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">
              Queuing items into background batch worker...
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </Button>

          {isAllDone && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose();
                window.location.href = "/dashboard/history";
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <span>View in Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
