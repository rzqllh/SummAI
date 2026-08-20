# SummAI Landing Redesign — Executor

Read `SUMMAI_LANDING_REDESIGN_TRACKER.md` first. It defines *why* and *what's in/out of scope*. This file defines *how*, file by file. If anything here conflicts with the Tracker, the Tracker wins — stop and flag it, don't guess.

Reference implementation: `frontend/design-reference/landing-preview.html`. Read it before touching any component. It is the ground truth for markup structure, spacing values, and interaction logic (the toggle behavior, the workflow step selection, the ActiveJobCard stage progression). Translate it into React/TSX idiomatically for this codebase — don't literally copy inline `<style>`/`<script>` blocks, port the *behavior*.

---

## 0. Setup

```bash
cd frontend
npm install motion morphicons
```

Add the display font in `frontend/src/app/layout.tsx` alongside the existing `Geist`/`Geist_Mono` imports:

```ts
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
```

Add `fraunces.variable` to the `className` on `<html>` next to the existing font variables. Do not remove `geistSans` / `geistMono` — they're still used by Dashboard/Studio.

In `globals.css`, add (do not replace existing rules):

```css
.font-display {
  font-family: var(--font-fraunces), Georgia, serif;
}
```

---

## 1. `landing/Hero.tsx`

**Keep**: the overall two-part structure (headline block, then the product mockup panel below it). The mockup content (waveform, transcript sample, action items) is a real product representation — do not add floating cards, glow orbs, or gradient blobs around it (Tracker Section 4).

**Change**:
- Headline: replace the "Turn X into Y" formula with something that names the actual pain (meetings in mixed Indonesian/English, notes that lag behind the conversation). See reference file's `<h1 class="hero-head">` for the target tone — adapt wording, don't paste verbatim; write it in your own words but keep the same specificity level (concrete pain, not abstract "productivity").
- Apply `.font-display` (Fraunces) to the headline, keep body copy on the default sans.
- Mockup chrome: replace the red/yellow/green browser dots with a neutral 3-dot pattern using `var(--border)`, not stoplight colors (stoplight dots imply "this is a browser window" which is a cliché this component doesn't need since it's not literally simulating Safari/Chrome chrome).
- CTA copy: primary button should name the actual action ("Start a Summary" or equivalent), not "Get Started". Secondary CTA should not say "View Dashboard" as a new-visitor's first option — reference file uses "See a Live Example"; pick working copy that fits an existing route in this app, confirm the route exists before linking it (R-24).

**Reason for every above change must trace back to Tracker Section 4 row 1.**

---

## 2. `landing/FeatureBento.tsx`

This is the biggest structural change. Replace the 2x2 card grid entirely.

**New structure** (see reference `#capabilities` section):
- Two-column layout (`grid-template-columns: 0.9fr 1.1fr` at desktop, single column under 860px).
- **Left column** (sticky on scroll at desktop): the Groq Whisper pipeline, shown as a 4-node horizontal strip (Audio → Waveform → Transcript → Structured) with connecting arrows, not icon cards. Below it, 3 stat rows (Throughput, Model, Language handling) as label/value pairs, not badges.
- **Right column**: a vertical list of numbered rows (01/02/03), each one a real pipeline step: (1) input formats — render the actual supported extensions (MP4, MOV, MP3, WAV, M4A, TXT) as small inline chips, not a card; (2) preset selector — render as an actual set of clickable pills (Executive Summary / Jira Action Items / Sprint Retro / Custom prompt) with one active state, matching what `PresetSelector.tsx` in Studio already does if that component's pattern can be reused; (3) local SQLite storage fact — plain text row, no icon needed here (per anti-slop R-04: if no genuinely relevant icon exists, use none).

**Do not** re-introduce a card grid, do not give all three right-column rows the same visual weight as the left column's pipeline diagram — the asymmetry is intentional (Tracker Section 2, RHYTHM 3).

---

## 3. `landing/BeforeAfterShowcase.tsx`

**Keep**: the Indonesian transcript demo content exactly as it exists in the current component. Do not translate it, do not shorten it.

**Add**: a real toggle (two buttons, one active state at a time) that swaps the panel content between "Raw transcript" and "Structured output" — see reference `#comparison` section for the interaction shape. The icon inside each toggle button should transition using `morphicons` when the active state changes (transcript-lines icon ⇄ checklist/structured icon). This is one of the four sanctioned motion points in Tracker Section 5 — don't add motion anywhere else in this component.

Panel header text ("125 words · 4 speaker turns" / "Preset: Jira & Action Items · ready to export") should reflect real word counts from the actual transcript content used, not placeholder numbers.

---

## 4. `landing/WorkflowSteps.tsx`

**Keep** the 3-step structure — this is a justified use of numbered steps because it's the actual backend sequence (upload → preset selection → export), not a decorative "How It Works" template.

**Add**:
- Click-to-select: clicking a step sets it active (visually, via border/icon color per reference `.wf-step.active`), and an optional auto-advance timer (see reference `setInterval` on `wfAuto`) is acceptable to keep but must pause on user interaction — don't fight the visitor's click with an immediate auto-revert.
- Icon transition on the active step using `morphicons` (this is motion point #2 from Tracker Section 5).
- Each step's eyebrow tag (`WHISPER + FFMPEG`, `CUSTOM PRESETS`, `1-CLICK COPY`) should name the real mechanism being used at that step, not a generic label.

---

## 5. `landing/PrivacyGrid.tsx`

Replace the 4-card grid entirely with a typographic list-strip: one large `.font-display` statement line at top (see reference `.privacy-head-line`), then 4 label/description rows below it (`LOCAL SQLITE`, `BRING YOUR OWN KEYS`, `NO SUBSCRIPTION`, `SELF-HOSTABLE`), each row a two-column grid (label left, description right), separated by hairline borders — not cards, not icons, not badges.

Copy for each row must describe what's actually true in this codebase (local SQLite file, user-supplied Groq/Gemini keys, no SaaS tier, FastAPI+Next.js self-hostable) — do not add compliance claims ("SOC 2", "encrypted at rest") that aren't verifiably true of the current implementation (anti-slop R-36).

---

## 6. `landing/Navbar.tsx` / `landing/Footer.tsx`

Minimal changes only:
- Confirm every `<a href="#...">` in the navbar resolves to a section `id` that actually exists on the rebuilt page (`#capabilities`, `#comparison` or similar, `#workflow`, `#privacy`). If a nav link currently points to a section that gets renamed or removed during this pass, update the `href` to match — don't leave a dead link (anti-slop R-24/R-26).
- CTA button copy only, no structural change.

---

## 7. `studio/ActiveJobCard.tsx`

**Remove**: `<RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />` and the header text `"Uploading & Transcribing"` as a static label.

**Replace with**:
- A stage-aware icon (mic/audio-source icon → waveform icon → document/structured icon) that transitions via `morphicons` as `progress` crosses thresholds (suggested: <34% = extracting, 34–66% = transcribing, >66% = structuring — confirm against how `progress` is actually populated by the calling code before hardcoding thresholds; if the real pipeline reports discrete stage names instead of a 0–100 number, key off the actual stage value instead of inventing thresholds).
- A small waveform-style bar visualization (see reference `.live-waveform` / `#liveWave` for the shape) that reflects real progress, not a decorative infinite loop. If no per-frame amplitude data exists from the backend, a deterministic pseudo-random pattern seeded by `elapsedSeconds` is acceptable — do not fabricate a "live audio levels" claim in any label text if the bars aren't driven by real audio data.
- Keep everything else in this component unchanged (the 5-column stats row, the privacy note, the cancel button, the progress bar) — this task is scoped to the icon/motion treatment only, not a redesign of `ActiveJobCard`.

---

## 8. Acceptance gate (run before declaring this done)

This mirrors the anti-slop Delivery Gate. Every line must be checked with actual evidence, not assumed.

**Hard checks (all must be true):**
- [ ] No em dash (`—`) in any new or edited copy
- [ ] `npm run build` completes with no errors
- [ ] `npm run lint` passes
- [ ] No horizontal overflow or clipped content at 375px viewport width, tested on: Hero, FeatureBento, BeforeAfterShowcase, WorkflowSteps, PrivacyGrid
- [ ] Every button/link added or changed has real behavior (`href` to an existing route/anchor, or a real `onClick` state change) — nothing is a dead control
- [ ] Every nav link resolves to a section that exists on the page
- [ ] No fabricated statistics, testimonials, or compliance claims anywhere in new copy
- [ ] All interactive elements (toggle, workflow steps, nav) are reachable via Tab and operable via Enter/Space, with a visible focus outline
- [ ] Dark mode is the only mode shipped (intentional, per Tracker) — verify nothing assumes a light-mode fallback and breaks

**Purpose checks (each new visual technique has a one-line reason, from Tracker Section 4 — don't invent new techniques not listed there):**
- [ ] FeatureBento asymmetry matches the reason given in Tracker Section 4
- [ ] WorkflowSteps numbering matches the justified-sequence exception, not a generic template
- [ ] Motion is limited to exactly the four points in Tracker Section 5 — no additional scroll-reveal-everything, no fade-up-on-every-element

**Report format when done:**

```
EXECUTION COMPLETE

Files changed:
<list, with one line per file on what changed>

Files touched outside the Tracker's listed scope (should be empty):
<list, or "none">

Delivery gate: PASS / FAIL (list any FAIL line with evidence)

Judgment calls made (anywhere this file was ambiguous and a decision was made without asking):
<list, or "none">
```

Stop there. Do not proceed to further changes without this being reviewed.
