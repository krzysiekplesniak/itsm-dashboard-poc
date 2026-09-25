# Design rules (ITSM dashboard + agent app)

Adapted from 29 rules learned the hard way in the author's previous product (Trip Now / Fly4Adventure) and filtered
for a KPI dashboard used by a Service Desk manager. Numbers are stable — refer to them by number.

## Structure and navigation
1. **Fewer screens, deeper not wider.** Drill-down in a modal / details section / inline expand before a new page.
2. **Never push the user out of the app without reason.** Records open in the details table, not in another tool.
3. **Back returns where the user came from** (remember the entry point; no hard-coded return).
4. **Expanding an item = teaser leading to the full view**, not a copy of the content.

## Copy
5. **Positive, actionable copy.** "What to do now" beats warnings; errors say what happened and how to fix it.
6. **Insight titles state the finding**, not the metric name ("FCR fell 3.1 pp to 78.2 %").

## Hierarchy and layout
7. **What must be easy to reach comes first** (findings strip above panels; month selector in the header).
8. **Compact, not crowded** — the user corrects in both directions; measure spacing, do not eyeball it.
9. **Visual weight of an action = its business weight.** Solid primary button only for the one main action
   (build, export); everything else is an outlined pill, a text link or a chip.
10. **One highlighted element per view** (accent outline = "this concerns you now"); a wall of highlights means none.

## Consistency and components
11. **Colours strictly from tokens.** Purple, black or green appearing from nowhere = a bug, not a variant.
12. **Shared components by reuse**, never re-typed classes (card, chip, button, badge have one definition).
13. **One standard size per control type**; no one-off height overrides.
14. **Changing a UI pattern = grep all occurrences first**, classify (same meaning → change, different → keep and note),
    verify every changed place live.
15. **Every clickable element shows a pointer** (global CSS rule, not per element).
16. **Filters that change content variants are segmented controls**, not CTA-sized chips.

## Accessibility (WCAG 2.1 AA — hard thresholds)
17. **Text contrast ≥ 4.5:1**, large text and UI boundaries ≥ 3:1; recompute after every palette change (canvas method).
18. **Interactive targets ≥ 44×44 px** (cards, chips, table headers, filter pills).
19. **Focus ring token ≠ accent token** (a ring in the accent colour on an accent element is invisible).
20. **Every icon-only control has a visible label or aria-label**; decorative SVG is aria-hidden.

## Dashboard-specific (from itsm-dashboard-design)
21. **Red only for what needs action now**; status (critical/warning/met) never used as series colours.
22. **One y-axis per chart**; no pies; target line dashed; low volume flagged; missing data = "n/a", never 0.
23. **Numbers are never designed**: a redesign changes presentation only — `npm test` and the plugin self-test
    must return the same values before and after.

## Process
24. **Mockup before code, decisions on the mockup** — the cheapest elimination of rejected iterations.
25. **Always verify what is live** (after a MagicPath submit the working directory is stale; hosts add their own chrome).
