"use client";

import { Check } from "lucide-react";

export type StudioStep = 1 | 2 | 3 | 4;

interface StepIndicatorProps {
  currentStep: StudioStep;
  onStepClick?: (step: StudioStep) => void;
  maxReachedStep: StudioStep;
}

export function StepIndicator({
  currentStep,
  onStepClick,
  maxReachedStep,
}: StepIndicatorProps) {
  const steps = [
    {
      number: 1,
      title: "Upload Media",
      subtitle: "Add recording or transcript",
    },
    {
      number: 2,
      title: "Review Transcript",
      subtitle: "Validate & edit text",
    },
    {
      number: 3,
      title: "Select Preset",
      subtitle: "Choose summary style",
    },
    {
      number: 4,
      title: "Export Summary",
      subtitle: "Generate & download",
    },
  ];

  return (
    <div className="w-full glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 bg-slate-950/60 shadow-xl relative overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isAccessible = step.number <= maxReachedStep;

          return (
            <div
              key={step.number}
              onClick={() => isAccessible && onStepClick?.(step.number as StudioStep)}
              className={`flex items-center gap-3.5 relative pb-3 transition-all ${
                isAccessible ? "cursor-pointer group" : "cursor-not-allowed opacity-60"
              }`}
            >
              {/* Step Circle */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                  isCurrent
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50"
                    : isCompleted
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-900/90 text-slate-400 border border-slate-800"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step Text Details */}
              <div className="min-w-0 space-y-0.5">
                <div
                  className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                    isCurrent
                      ? "text-white"
                      : isCompleted
                      ? "text-slate-200 group-hover:text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate hidden sm:block">
                  {step.subtitle}
                </div>
              </div>

              {/* Active Step Accent Underline */}
              {isCurrent && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full animate-in fade-in duration-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
