"use client";

import { Search, Filter, Video, Headphones, FileText, X } from "lucide-react";

interface HistorySearchFilterProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
}

export function HistorySearchFilter({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
}: HistorySearchFilterProps) {
  const filterPills = [
    { id: "all", label: "All Formats", icon: Filter },
    { id: "audio", label: "Audio Only", icon: Headphones },
    { id: "video", label: "Video Only", icon: Video },
    { id: "txt", label: "Text Transcripts", icon: FileText },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 glass-card rounded-2xl p-3 sm:p-4 border border-slate-800/80 bg-slate-950/60 shadow-xl">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by meeting title, speaker, or keywords..."
          className="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {filterPills.map((pill) => {
          const Icon = pill.icon;
          const isSelected = selectedType === pill.id;

          return (
            <button
              key={pill.id}
              onClick={() => onTypeChange(pill.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
