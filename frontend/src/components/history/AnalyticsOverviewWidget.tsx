"use client";

import { HistoryMeeting } from "./MeetingDetailDrawer";
import {
  FileText,
  Clock,
  CheckCircle2,
  Cpu,
} from "lucide-react";

interface ActionItem {
  id: number;
  status: "open" | "in_progress" | "done" | "cancelled";
}

interface AnalyticsOverviewWidgetProps {
  meetings: HistoryMeeting[];
  actionItems: ActionItem[];
}

export function AnalyticsOverviewWidget({
  meetings,
  actionItems,
}: AnalyticsOverviewWidgetProps) {
  // 1. Total Meetings
  const totalMeetings = meetings.length;

  // 2. Cumulative Audio Duration (in minutes)
  const totalSeconds = meetings.reduce((acc, m) => acc + (m.duration_seconds || 900), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  // 3. Action Items Completion Rate
  const totalActions = actionItems.length;
  const completedActions = actionItems.filter((a) => a.status === "done").length;
  const completionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  // 4. Provider Breakdown
  const geminiCount = meetings.filter((m) => m.provider_llm?.toLowerCase().includes("gemini")).length;
  const groqCount = meetings.filter((m) => m.provider_llm?.toLowerCase().includes("groq")).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Metric 1 */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Meetings Processed</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white font-mono">{totalMeetings}</div>
        <p className="text-[11px] text-slate-500 font-mono">SQLite Isolated Records</p>
      </div>

      {/* Metric 2 */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Audio Analyzed</span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white font-mono">{totalHours} <span className="text-sm text-slate-400 font-sans">hrs</span></div>
        <p className="text-[11px] text-slate-500 font-mono">16kHz Acoustic Stream</p>
      </div>

      {/* Metric 3 */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Action Completion</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white font-mono">{completionRate}%</div>
        <p className="text-[11px] text-slate-500 font-mono">{completedActions} of {totalActions} tasks done</p>
      </div>

      {/* Metric 4 */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Primary Intelligence</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-sm font-bold text-white font-mono truncate">
          {totalMeetings === 0 ? "Hybrid" : geminiCount >= groqCount ? "Gemini Flash" : "Groq Llama"}
        </div>
        <p className="text-[11px] text-slate-500 font-mono">Multi-Provider Fallback</p>
      </div>
    </div>
  );
}
