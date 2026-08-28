"use client";

const DRAFT_KEY = "SUMMAI_STUDIO_DRAFT";

export interface StudioDraft {
  filename: string;
  transcript: string;
  customPrompt: string;
  step: number;
  updatedAt: number;
}

export function saveStudioDraft(draft: Omit<StudioDraft, "updatedAt">) {
  if (typeof window === "undefined") return;
  if (!draft.transcript && !draft.filename) {
    clearStudioDraft();
    return;
  }
  const payload: StudioDraft = {
    ...draft,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {}
}

export function getStudioDraft(): StudioDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: StudioDraft = JSON.parse(raw);
    // Only return draft if updated in the last 24 hours
    if (Date.now() - parsed.updatedAt < 24 * 60 * 60 * 1000) {
      return parsed;
    }
  } catch {}
  return null;
}

export function clearStudioDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
