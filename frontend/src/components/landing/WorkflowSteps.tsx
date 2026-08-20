"use client";

import { UploadCloud, Sliders, FileText, CheckCircle2 } from "lucide-react";

export function WorkflowSteps() {
  const steps = [
    {
      number: "01",
      title: "Drop Media or Transcript",
      description:
        "Upload any `.mp3`, `.wav`, `.m4a`, or `.mp4` video recording up to 2GB. Text transcripts and pastes are also supported.",
      icon: UploadCloud,
      badge: "Whisper & FFmpeg",
    },
    {
      number: "02",
      title: "Review & Choose Output Format",
      description:
        "Inspect the word-for-word transcript with word counts. Choose from Executive, Jira, Retro, or custom prompts.",
      icon: Sliders,
      badge: "Custom Presets",
    },
    {
      number: "03",
      title: "Export to Notion & Jira in 1 Click",
      description:
        "Get instant Markdown outputs with action item tables, formatted assignees, and ready-to-paste Jira markup.",
      icon: FileText,
      badge: "1-Click Copy",
    },
  ];

  return (
    <section id="workflow" className="py-20 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            <span>Seamless Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            From Audio File to Jira Tasks in 3 Steps
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Engineered to remove friction and save over 45 minutes on every single meeting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="glass-card rounded-2xl p-7 border border-slate-800 relative glass-card-hover group"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-extrabold font-mono text-slate-700 group-hover:text-emerald-400 transition-colors">
                    {step.number}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400">
                    {step.badge}
                  </span>
                </div>

                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 mb-4 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
