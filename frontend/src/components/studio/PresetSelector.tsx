"use client";

import { useState } from "react";
import {
  FileText,
  ListTodo,
  RotateCcw,
  Cpu,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PresetSelectorProps {
  customPrompt: string;
  onCustomPromptChange: (val: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

export function PresetSelector({
  customPrompt,
  onCustomPromptChange,
  onGenerate,
  onBack,
  isGenerating,
}: PresetSelectorProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("jira");

  const presets = [
    {
      id: "exec",
      title: "Executive Summary",
      icon: FileText,
      description:
        "High-level strategic briefing with key outcomes and essential decisions.",
      prompt:
        "Provide a high-level executive summary in Markdown format with key takeaways, strategic decisions, and overall meeting outcomes.",
      color: "emerald",
    },
    {
      id: "jira",
      title: "Action Items & Jira Tasks",
      icon: ListTodo,
      description:
        "Extract explicit tasks into a structured table with assignees, deadlines, and Jira markup.",
      prompt:
        "Extract all action items, assignees, and deadlines into a clear Markdown table, followed by formatted Jira-ready task tickets.",
      color: "cyan",
    },
    {
      id: "retro",
      title: "Sprint Retrospective",
      icon: RotateCcw,
      description:
        "Categorize discussion into What Went Well, What Could Be Improved, and Next Action Points.",
      prompt:
        "Structure the meeting notes in Sprint Retrospective format: 1. What Went Well, 2. What Could Be Improved / Blockers, 3. Concrete Action Points for Next Sprint.",
      color: "amber",
    },
    {
      id: "tech",
      title: "Technical Architecture Review",
      icon: Cpu,
      description:
        "Summarize engineering tradeoffs, system design choices, and architectural decisions.",
      prompt:
        "Summarize technical decisions, engineering constraints, database/API design choices, and system architecture specs discussed in the meeting.",
      color: "purple",
    },
    {
      id: "custom",
      title: "Custom Prompt Template",
      icon: Terminal,
      description:
        "Write your own specialized synthesis instructions for Gemini.",
      prompt: customPrompt,
      color: "slate",
    },
  ];

  const handleSelectPreset = (id: string, promptText: string) => {
    setSelectedPresetId(id);
    if (id !== "custom") {
      onCustomPromptChange(promptText);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Step 3 of 4
          </span>
          <span className="text-xs text-slate-400">Gemini Flash Prompt Engine</span>
        </div>
        <h2 className="text-lg font-bold text-white mt-1">
          Select Output Format & Synthesis Preset
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Choose a tailored preset or define your custom engineering output instructions.
        </p>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedPresetId === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id, preset.prompt)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-900 text-slate-300 border border-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {preset.title}
                  </h3>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {preset.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Custom Prompt Box */}
      {selectedPresetId === "custom" && (
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-slate-300">
            Custom Prompt Instructions:
          </label>
          <Textarea
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            rows={4}
            placeholder="e.g. Focus exclusively on database schema changes and list all required SQL migrations..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:border-emerald-500/50"
          />
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isGenerating}
          className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-10 px-4 rounded-xl flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transcript</span>
        </Button>

        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs h-10 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
              <span>Synthesizing with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Generate AI Summary</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
