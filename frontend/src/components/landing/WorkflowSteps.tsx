"use client";

import { useState, useEffect, useRef } from "react";
import { MorphIcon, IconNode } from "morphicons/react";
import { motion, useReducedMotion } from "motion/react";

const INACTIVE_ICONS: IconNode[] = [
  [["path", { d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" }]], // Upload cloud
  [["path", { d: "M4 21v-7m0-4V3m8 21v-9m0-4V3m8 21v-5m0-4V3M1 14h6m2-6h6m2 8h6" }]], // Sliders
  [["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" }]], // Clipboard
];

const ACTIVE_ICONS: IconNode[] = [
  [["path", { d: "M2 10v3 M6 6v11 M10 3v18 M14 8v7 M18 5v13 M22 10v3" }]], // Waveform
  [["path", { d: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z M19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" }]], // Sparkles
  [["path", { d: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" }]], // Checkbox check
];

export function WorkflowSteps() {
  const [activeStep, setActiveStep] = useState(0);
  const pausedRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  const steps = [
    {
      number: "01",
      badge: "WHISPER + FFMPEG",
      title: "Drop Media or Transcript",
      description:
        "Upload any .mp3, .wav, .m4a, or .mp4 video recording up to 2GB. Text transcripts and pastes are also supported.",
    },
    {
      number: "02",
      badge: "CUSTOM PRESETS",
      title: "Select Synthesis Preset",
      description:
        "Inspect the word-for-word transcript with word counts. Choose from Executive, Jira, Retro, or custom prompts.",
    },
    {
      number: "03",
      badge: "1-CLICK COPY",
      title: "Export to Notion & Jira",
      description:
        "Get instant Markdown outputs with action item tables, formatted assignees, and ready-to-paste Jira markup.",
    },
  ];

  // Auto-advance timer that pauses on user interaction
  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setActiveStep((prev) => (prev + 1) % steps.length);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [steps.length]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    pausedRef.current = true;
  };

  return (
    <motion.section
      id="workflow"
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-20 border-t border-slate-800/80 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider font-mono">
            <span>Seamless Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
            From Audio File to Jira Tasks in 3 Steps
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Engineered to remove friction and save over 45 minutes on every single meeting.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => handleStepClick(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleStepClick(idx);
                  }
                }}
                className={`text-left rounded-2xl p-7 relative transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 ${
                  isActive
                    ? "bg-slate-900/90 border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/30"
                    : "bg-slate-900/30 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span
                    className={`text-3xl font-mono font-bold transition-colors duration-150 ${
                      isActive ? "text-emerald-400" : "text-slate-600"
                    }`}
                  >
                    {step.number}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border transition-colors duration-150 ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    {step.badge}
                  </span>
                </div>

                {/* Morphing Step Icon (Motion Point #2) */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-150 ${
                    isActive
                      ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                      : "bg-slate-950 border border-slate-800 text-slate-400"
                  }`}
                >
                  <MorphIcon
                    icon={isActive ? ACTIVE_ICONS[idx] : INACTIVE_ICONS[idx]}
                    size={20}
                    color={isActive ? "#34d399" : "#94a3b8"}
                    reducedMotion="user"
                  />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
