---
name: itsm-ui-design
description: >
  Design guardian and UX/a11y auditor for the ITSM Dashboard Kit: the dashboard page and the agent web app.
  Enforces the build order reference → mockup on real data → closed decisions → build in tokens → live
  measurement → report with numbers, the dashboard design rules, and the MagicPath CLI workflow
  ("local = workshop, MagicPath = showcase"). Use whenever changing the look of the dashboard template or the app
  UI, when the user says "ładniejszy wygląd", "redesign", "better UI", "MagicPath", "ux audit", "a11y", or asks
  about tokens, contrast, touch targets or layout of the ITSM dashboard.
argument-hint: "[build <what> | audit [wcag|design-system|heuristic|all]]"
metadata:
  version: "0.1.0"
  origin: "adapted from the author's fly4adventure-design and magicpath-parity skills (Trip Now project)"
---

# ITSM UI design — guardian for building and auditing

Every new screen, panel or component must look as if the same designer built it. History of the source project:
4–5 rejected iterations came from building without this knowledge. Do not guess — read the references.

## Setup (always)
1. Read `references/design-rules.md` (rules that filter every UI proposal) and `itsm-dashboard-design` (KPI page rules).
2. Decide the mode: **BUILD** (build or change UI) or **AUDIT** (`/ux-audit`, review). Unclear → ask one sentence.
3. Decide where the code lives: the dashboard template (`itsm-html-builder/templates/dashboard.html`), the app UI
   (`app/web/`), or a MagicPath canvas component. Rule: **local = workshop, MagicPath = showcase** — iterate locally,
   submit to MagicPath only at milestones (`references/magicpath-workflow.md`).

## BUILD — order is not negotiable
1. **Reference.** Establish the visual reference: an existing element (sibling look) or the user's reference
   (screenshot, MagicPath design). Analyse facts vs interpretation, what to adapt, what NOT to copy (`itsm-design-reference`).
2. **Mockup before code.** Show a mockup on the user's REAL (or realistic synthetic) data, desktop 1280 + mobile 430.
   Fastest path: a MagicPath canvas component (`code start → code submit --wait`) or an HTML mockup. Wait for approval.
3. **Close decisions before code.** Proportions, what goes in a card, what opens on click, responsiveness — ask first.
4. **Build.** Tokens only (`references/tokens.md`), shared components, no improvised colours; numbers still come
   from the engine — the design never changes how values are computed.
5. **Verify live** with `references/measurement.md`: contrast by canvas, real Tab focus, 44×44 targets, click-through,
   screenshots at 430 and 1280. Run `npm test` (app) and the self-test (plugin) — the numbers must stay identical.
6. **Report** what was built and measured, with numbers.

## AUDIT (`/ux-audit`)
Say which reference you measure against — they carry different weight:
1. **wcag** — objective WCAG 2.1 AA thresholds (4.5:1 text, 3:1 UI/large text, 44 px targets), methods from measurement.md only.
2. **design-system** — internal consistency: hard-coded colours bypassing tokens, re-typed classes, off-scale spacing.
3. **heuristic** — expert judgement (hierarchy, cognitive load, copy) — always labelled as opinion.
Findings with weight (Critical / Major / Minor) and evidence. Fix low-risk ones immediately and re-measure; ask before risky ones (palette, restructuring).

## Invariants (short)
Colours only from tokens · status colours only for status, series colours only for identity · text on accent ≥ 4.5:1 ·
focus ring ≠ accent · interactive ≥ 44×44 · one primary action per view · change of a UI pattern = grep all
occurrences before submit · every clickable element shows a pointer · mockup before code · verify what is live.

| Reference | When |
|---|---|
| `references/design-rules.md` | always at start |
| `references/tokens.md` | before using any colour, font, radius, spacing |
| `references/measurement.md` | before any measurement or verification |
| `references/magicpath-workflow.md` | before working with MagicPath (login, canvas, code start/submit, parity) |
