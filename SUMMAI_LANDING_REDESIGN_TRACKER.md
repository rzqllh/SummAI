# SummAI Landing Redesign — Tracker

Status: **LOCKED, ready for execution**
Owner: Hafizh
Executor: Antigravity (Gemini 3 Flash High)
Reviewer: Claude (senior review pass after execution)

This is the source of truth for *why* the change is happening and *what is in/out of scope*.
`SUMMAI_LANDING_REDESIGN_EXECUTOR.md` is the source of truth for *how* to implement it, file by file.
Do not re-derive design direction from scratch. Everything below was already decided.

---

## 1. Why this exists

The current landing (`frontend/src/components/landing/*`) was audited against `anti-slop` rules. Diagnosis:

- Every section repeats the same shape: pill eyebrow → centered heading → centered subtext → card grid. This is the "uniform section rhythm" pattern the anti-slop filter flags (R-05).
- Feature/privacy sections used identical card size/icon/padding regardless of content (R-14).
- `.glass-card` / `.glow-emerald` / `.gradient-text` utility classes stacked glassmorphism + glow across navbar, cards, and CTA simultaneously (R-10, R-13).
- Fonts were Geist Sans/Mono only — the Next.js/Vercel default, no typographic identity of its own (R-06).
- `ActiveJobCard.tsx` used `<RefreshCw className="animate-spin" />` as its only processing indicator — decorative motion with no relationship to the actual pipeline stage.

None of this is being changed because "AI slop is bad" in the abstract. Each change below has a one-line reason (anti-slop R-31 requirement) — see Section 4.

---

## 2. Design Read (declared, do not re-derive)

> Reading this as: B2B/prosumer devtool landing for PMOs and engineers running bilingual (Indonesian/English) meetings, in a technical-editorial visual language, dial **ENERGY 2 / RHYTHM 3 / MOTION 2**.

- **ENERGY 2** — confident, Stripe/Vercel-adjacent, not agency-flashy. Copy sells on proof (real product screenshot, real demo transform), not hype language.
- **RHYTHM 3** — sections are deliberately NOT uniform. Capabilities is asymmetric (sticky diagram + row list). Privacy is a typographic strip, not cards. Workflow keeps a 3-step shape because it is a real, literal pipeline sequence, not a template default.
- **MOTION 2** — scroll-reveal + a small number of *functional* state-driven transitions. No parallax, no scroll-pinning, no decorative floating/bounce.

---

## 3. Brand tokens (carried over, locked)

Source: `frontend/src/app/globals.css` (existing `:root` block). **Do not change these values.**

```
--background: #020617   (slate-950, navy)
--card:       #0f172a   (slate-900, surface)
--primary:    #10b981   (emerald/teal — SummAI brand color across dashboard + studio)
--foreground: #f8fafc
--muted-fg:   #94a3b8
--border:     #1e293b
```

Reason these stay fixed: this teal + navy pairing is already the identity across Dashboard, Studio, and Library — changing it on the landing page only would break brand continuity between "the page that sells it" and "the product it's selling."

### What IS changing at the token level

- **Typography**: add `Fraunces` (variable, serif, display weights 400–700) for headings, alongside existing `Geist` (body) and `Geist Mono` (data/labels). Reason: serif display gives the landing an editorial voice distinct from generic sans-only devtool defaults, while `Geist` staying for body keeps continuity with the in-app UI.
- **Effect classes**: `.glass-card`, `.glass-card-hover`, `.glow-emerald`, `.glow-cyan`, `.gradient-text-emerald`, `.gradient-text-glow` in `globals.css` are **not deleted** (Studio/Dashboard components still use them — verify with grep before touching `globals.css`). Landing components simply **stop consuming them**. New landing-specific styles are scoped, not global overrides.

---

## 4. Scope: what changes, what doesn't, and why

| Component | Change | One-line reason |
|---|---|---|
| `landing/Hero.tsx` | Copy rewrite (headline, subhead, CTA labels), mockup chrome cleanup. Structure/layout kept as-is. | Real product screenshot in the mockup is already credible; the copy formula ("Turn X into Y") and generic browser-dot chrome were the actual slop, not the composition. |
| `landing/FeatureBento.tsx` | Full restructure: sticky pipeline diagram (left) + numbered row list (right), preset selector as real pill toggle, file formats as inline chips. Replaces the 2x2 icon-card grid. | Four features have four different natures (a pipeline, a format list, a preset chooser, a storage fact) — forcing them into identical cards was the R-14 violation. |
| `landing/BeforeAfterShowcase.tsx` | Add a functional Raw ⇄ Structured toggle with an icon transition tied to the state change. Content (the Indonesian transcript demo) stays. | This section was already the strongest part of the page — keep it, make the toggle real instead of two static panels. |
| `landing/WorkflowSteps.tsx` | Keep the 3-step shape (it's a literal backend sequence, not a template default), add click-to-select active step + icon transition on the active step. | Anti-slop flags "How It Works always 3 steps" as a default pattern — but this genuinely is a 3-step pipeline, so the numbering earns its place per the frontend-design skill's own carve-out. |
| `landing/PrivacyGrid.tsx` | Full restructure: typographic list-strip (label + description rows), not 4 icon cards. | Local-first/BYOK/no-subscription/self-hostable is SummAI's real differentiator against every hosted competitor — it was undersold by being visually identical to generic benefit cards. |
| `landing/Navbar.tsx` / `Footer.tsx` | Light touch: verify every nav link resolves to a real section id present on the page (R-24), CTA label change only. | These weren't the slop source; don't restructure what isn't broken. |
| `studio/ActiveJobCard.tsx` | Replace `<RefreshCw animate-spin />` with a stage-aware icon (extract → transcribe → structure) + a waveform-style progress visualization driven by the real `progress` prop. | User-requested: the spinner communicates nothing about pipeline state; audio products should use audio-native motion. This is a Studio component, not Landing, but is in scope for this pass. |

### Explicitly out of scope (do not touch)

- Dashboard shell, `dashboard/*` components, `history/*` components
- Global `globals.css` token values (only additive changes allowed — new classes, not edits to existing ones)
- Backend (`backend/*`) — this is a frontend-only visual pass
- Any new sections not listed above (no pricing table, no testimonials, no FAQ — none of these exist in the current page and none should be invented; anti-slop R-18/R-28 forbid fabricated testimonials/generic FAQs)
- Light mode / theme toggle — dark is the existing, intentional default across the whole app (developer tool identity), not being revisited in this pass

---

## 5. Motion: where and why (locked, do not expand)

Per anti-slop R-19 (animation needs a stated UX purpose) and the earlier discussion, motion is scoped to exactly these:

1. **Nav menu open/close** (mobile) — standard, functional.
2. **Workflow step active-state transition** — the icon changes when a step becomes active; this represents a real state (which pipeline stage is being explained), not decoration.
3. **Raw ⇄ Structured toggle** — the icon transition represents the actual transform the product performs; it's the literal theme of the section.
4. **ActiveJobCard stage icon** — transitions between extract/transcribe/structure icons as `progress` crosses real thresholds, replacing the meaningless spinner.

Everything else (hero, feature rows, privacy list) uses scroll-reveal at most. No parallax, no pinning, no floating/bounce on load.

**Library**: `motion` (Framer Motion, npm package name `motion`) for scroll-reveal and state-driven transitions. `morphicons` for the four icon-transition points above. Do not introduce GSAP — no scroll-pinning/scrubbing is planned, so it would be unused weight.

---

## 6. Reference artifact

A static HTML preview implementing the visual direction above (all sections, functional toggle, functional workflow steps, and the ActiveJobCard motion concept) is provided as ground truth.

**Before running the executor prompt**, copy the reference file into the repo at:

```
frontend/design-reference/landing-preview.html
```

The executor treats this file as the visual/behavioral spec — markup structure, spacing, and interaction logic should be read from it and translated into the actual React components, not reinvented.

---

## 7. Language

- Landing shell (nav, headline, CTAs, section copy): **English**.
- Product demo content (the transcript sample in Hero + BeforeAfterShowcase): **stays Indonesian**, verbatim — this is the actual differentiator (bilingual meeting handling), shown rather than claimed.

---

## 8. Status log

| Date | Note |
|---|---|
| 2026-08-20 | Design direction locked via chat interview + anti-slop audit. Reference HTML preview built and approved for handoff. Tracker + Executor authored. Not yet executed. |
