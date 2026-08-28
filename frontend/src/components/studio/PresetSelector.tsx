"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  FileEdit,
  FileText,
  ListTodo,
  RotateCcw,
  Cpu,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl } from "@/lib/api";

interface PresetItem {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  custom?: boolean;
}

interface PresetSelectorProps {
  customPrompt: string;
  onCustomPromptChange: (val: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

const DEFAULT_BUILTIN_PRESETS: PresetItem[] = [
  {
    id: "mom",
    title: "Corporate MoM",
    description:
      "Convert raw meeting transcripts into structured corporate Minutes of Meeting with grounded discussion points, decisions, and action plans.",
    prompt: `ROLE
You are a corporate Minutes of Meeting editor.

Your task is to transform raw meeting transcripts, meeting notes, and optional user context into a clean, professional Minutes of Meeting document while preserving the actual substance of the meeting.

SOURCE OF TRUTH
Use only:
1. The supplied transcript
2. User-provided notes/context
3. User-provided reference/template, if any

Never invent information that is not supported by those sources.

CORE RULES
- Do NOT hallucinate decisions, PICs, deadlines, dates, participants, technical values, or conclusions.
- Do NOT convert an unresolved discussion into a confirmed decision.
- Distinguish clearly between:
  - information/background
  - discussion/concern
  - proposal
  - agreement/decision
  - action item
- If wording is unclear because of ASR/transcription errors, infer only when the surrounding technical context makes the correction highly reliable.
- If an important term, number, owner, deadline, or decision remains uncertain, mark it:
  [CONFIRM: ...]
- Never silently fill missing metadata.
- If Date, Time, Venue, Attendees, PIC, or Due Date are unavailable, use "TBC" or leave them explicitly unresolved.
- Preserve domain terminology such as BNG, PE-HSI, Metro, NGN, NeuCentrIX, DCPDB, Sarpen, Sartel, O&M, VLAN, OLT, etc.
- Do not over-explain obvious technical terms.
- Do not write the output as speaker-by-speaker transcript.
- Do not use generic phrases such as "the meeting discussed several topics" when the actual topic can be stated directly.
- Keep corporate wording concise, neutral, and operational.
- Avoid repetitive points.
- Do not polish the text so aggressively that meaning changes.

IMPORTANT DECISION RULE
A statement such as:
"if the PKS confirms NGN, installation can continue"
MUST NOT become:
"installation will continue in NGN"
Conditional statements must remain conditional.

OUTPUT FORMAT

# MINUTE OF MEETING

## [Meeting Title]

| Item | Detail |
|---|---|
| Date | ... |
| Time | ... |
| Venue | ... |
| Meeting called by | ... |
| Note Taker | ... |
| Facilitator | ... |
| Attendees | ... |

## URAIAN

### Pembahasan
Write a short 1–2 paragraph background explaining why the discussion was conducted.

### Discussion Point
1. ...
2. ...
3. ...

Discussion Points should follow the logical flow of the actual meeting:
background/problem → stakeholder clarification → technical/business constraints → options → agreement/remaining issue.

### Kesepakatan
Only include this section when explicit agreements or decisions exist.
1. ...
2. ...
Do not create this section merely because a topic was discussed.

### Action Plan
| No. | Task | Person in Charge | Target |
|---|---|---|---|
| 1 | ... | ... | ... |

Only create an action item when an actual follow-up activity exists in the meeting.
If PIC or target is not available: use TBC.

### Need Confirmation
Only show this section when there are material ambiguities.
- [CONFIRM: ...]
- [CONFIRM: ...]
Do not clutter this section with trivial transcription noise.`,
    custom: false,
  },
  {
    id: "cleanup",
    title: "Transcript Cleanup",
    description:
      "Clean noisy ASR transcripts while preserving the full discussion, speaker intent, technical details, and chronology.",
    prompt: `ROLE
You are a transcript editor, NOT a meeting summarizer.

GOAL
Convert noisy/raw ASR meeting transcription into readable transcript form without removing substantive discussion.

RULES
- Preserve chronology.
- Preserve arguments, objections, clarifications, decisions, and technical details.
- Remove filler words only when they provide no meaning.
- Remove duplicated ASR fragments.
- Fix obvious ASR errors only when context makes the intended term highly reliable.
- Preserve speaker attribution when reasonably identifiable.
- If speaker identity is uncertain, use neutral labels such as:
  "Tim DWS", "Tim Area", "Telkomsel", "TIF", "Speaker", etc.
- Never invent speaker names.
- Do NOT summarize.
- Do NOT collapse long discussion into bullet-point conclusions.
- Do NOT remove disagreement or unresolved discussion.
- Do NOT turn proposals into decisions.
- Preserve numbers exactly when reliable.
- If a technical number is unclear, use:
  [UNCLEAR: possible value ...]
- Prefer terminology already established elsewhere in the transcript.
- Normalize obvious technical ASR mistakes where confidence is high.

Example:
"new century / new centric" → "NeuCentrIX"
"NJN / NGL" → "NGN"
"DC PDB / DCPDD" → "DCPDB"
Only perform these corrections when context supports them.

OUTPUT:

# Cleaned Transcript

**[Speaker / Team]:**
...

**[Speaker / Team]:**
...

At the end add:

## Transcription Notes
Only list meaningful corrections or unresolved ambiguities, for example:
- "new century" normalized to "NeuCentrIX" based on context.
- [UNCLEAR] Power requirement sounded like either 2×200A or 3×200A.

Do not add a meeting summary.`,
    custom: false,
  },
  {
    id: "exec",
    title: "Executive Summary",
    description:
      "High-level strategic briefing with key outcomes and essential decisions.",
    prompt:
      "Provide a high-level executive summary in Markdown format with key takeaways, strategic decisions, and overall meeting outcomes.",
    custom: false,
  },
  {
    id: "jira",
    title: "Action Items & Jira Tasks",
    description:
      "Extract explicit tasks into a structured table with assignees, deadlines, and Jira markup.",
    prompt:
      "Extract all action items, assignees, and deadlines into a clear Markdown table, followed by formatted Jira-ready task tickets.",
    custom: false,
  },
  {
    id: "retro",
    title: "Sprint Retrospective",
    description:
      "Categorize discussion into What Went Well, What Could Be Improved, and Next Action Points.",
    prompt:
      "Structure the meeting notes in Sprint Retrospective format: 1. What Went Well, 2. What Could Be Improved / Blockers, 3. Concrete Action Points for Next Sprint.",
    custom: false,
  },
  {
    id: "tech",
    title: "Technical Architecture Review",
    description:
      "Summarize engineering tradeoffs, system design choices, and architectural decisions.",
    prompt:
      "Summarize technical decisions, engineering constraints, database/API design choices, and system architecture specs discussed in the meeting.",
    custom: false,
  },
];

function getPresetIcon(id: string) {
  switch (id) {
    case "mom":
      return FileSpreadsheet;
    case "cleanup":
      return FileEdit;
    case "exec":
      return FileText;
    case "jira":
      return ListTodo;
    case "retro":
      return RotateCcw;
    case "tech":
      return Cpu;
    case "custom":
      return Terminal;
    default:
      return FileText;
  }
}

export function PresetSelector({
  customPrompt,
  onCustomPromptChange,
  onGenerate,
  onBack,
  isGenerating,
}: PresetSelectorProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("mom");
  const [presetList, setPresetList] = useState<PresetItem[]>(DEFAULT_BUILTIN_PRESETS);
  const [rawCustomPrompt, setRawCustomPrompt] = useState<string>("");

  // Optional Context Support (Section 4)
  const [showOptionalContext, setShowOptionalContext] = useState(false);
  const [meetingContext, setMeetingContext] = useState("");
  const [referenceStyle, setReferenceStyle] = useState("");

  useEffect(() => {
    let isMounted = true;
    axios
      .get<{ presets?: PresetItem[] }>(`${getApiBaseUrl()}/api/presets`)
      .then((res) => {
        if (isMounted && res.data.presets && res.data.presets.length > 0) {
          setPresetList(res.data.presets);
        }
      })
      .catch(() => {
        // use default builtins
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update composed prompt whenever selection or optional context changes
  useEffect(() => {
    let basePrompt = "";
    if (selectedPresetId === "custom") {
      basePrompt = rawCustomPrompt;
    } else {
      const active = presetList.find((p) => p.id === selectedPresetId);
      basePrompt = active ? active.prompt : DEFAULT_BUILTIN_PRESETS[0].prompt;
    }

    let composed = basePrompt;
    if (meetingContext.trim()) {
      composed += `\n\nADDITIONAL MEETING CONTEXT (Supporting User Context - Do NOT override contradictory transcript evidence):\n${meetingContext.trim()}`;
    }
    if (referenceStyle.trim()) {
      composed += `\n\nREFERENCE OUTPUT STYLE & TEMPLATE (Imitate structure, level of detail, terminology, and formatting style only; do NOT copy unrelated facts):\n${referenceStyle.trim()}`;
    }

    onCustomPromptChange(composed);
  }, [selectedPresetId, rawCustomPrompt, meetingContext, referenceStyle, presetList, onCustomPromptChange]);

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
  };

  const allPresetsWithCustom: PresetItem[] = [
    ...presetList,
    {
      id: "custom",
      title: "Custom Prompt Template",
      description: "Write your own specialized synthesis instructions for the LLM.",
      prompt: rawCustomPrompt,
      custom: false,
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Step 3 of 4
          </span>
          <span className="text-xs text-slate-400">Synthesis Engine & Presets</span>
        </div>
        <h2 className="text-lg font-bold text-white mt-1">
          Select Output Format & Synthesis Preset
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Choose a tailored preset or define your custom engineering output instructions.
        </p>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {allPresetsWithCustom.map((preset) => {
          const Icon = getPresetIcon(preset.id);
          const isSelected = selectedPresetId === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-tight">
                        {preset.title}
                      </h3>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description || (preset.prompt ? preset.prompt.slice(0, 100) + "..." : "")}
                </p>
              </div>

              {preset.custom && (
                <div className="pt-2">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/20">
                    custom
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Prompt Box */}
      {selectedPresetId === "custom" && (
        <div className="space-y-2 pt-1 animate-in fade-in">
          <label className="text-xs font-semibold text-slate-300">
            Custom Prompt Instructions:
          </label>
          <Textarea
            value={rawCustomPrompt}
            onChange={(e) => setRawCustomPrompt(e.target.value)}
            rows={4}
            maxLength={10000}
            placeholder="e.g. Focus exclusively on database schema changes and list all required SQL migrations..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:border-emerald-500/50"
          />
        </div>
      )}

      {/* Optional Context & Reference Style Accordion */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowOptionalContext(!showOptionalContext)}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>Additional Meeting Context & Reference Style</span>
            <span className="text-[10px] font-normal text-slate-500 font-mono">(Optional)</span>
          </span>
          {showOptionalContext ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showOptionalContext && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 animate-in fade-in text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 block">
                Additional Meeting Context
              </label>
              <p className="text-[11px] text-slate-400 leading-normal">
                Supporting background information. The model will not override contradictory transcript evidence.
              </p>
              <Textarea
                value={meetingContext}
                onChange={(e) => setMeetingContext(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Example: This discussion is about BNG placement at STO Kebayoran. PKS wording is still being verified."
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 block">
                Reference Output Style
              </label>
              <p className="text-[11px] text-slate-400 leading-normal">
                Paste an existing MoM or reference output. The model will imitate formatting, structure, and depth without copying unrelated facts.
              </p>
              <Textarea
                value={referenceStyle}
                onChange={(e) => setReferenceStyle(e.target.value)}
                rows={3}
                maxLength={6000}
                placeholder="Paste an existing corporate MoM or reference template for style and format imitation..."
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}
      </div>

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
              <span>Synthesizing intelligence...</span>
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

