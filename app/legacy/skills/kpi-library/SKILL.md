---
name: kpi-library
description: Catalogue of PREDEFINED Service Desk KPI modules and dashboard templates (monthly, weekly, warnings). Use when proposing what to show, adding or removing a dashboard element, or choosing a view — never invent a KPI type that is not in the catalogue.
---

# KPI library: predefined modules and templates

The dashboard is assembled from **predefined modules** only. Each module follows the Lab 2 method:
**business question → KPI → query → widget → filter → validation**, with design tokens (widget size S 3×2,
M 6×3, L 12×4 on a 12-column grid; status colours critical / warning / met / pending / neutral) and a defined
empty state. The live catalogue is returned by the tool `list_modules`. Use it; do not describe modules from memory.

| Module | Business question | Size | Shown in |
|---|---|---|---|
| `attention` | Are we on target, and what needs my attention first? | L | all modes (strip; full list in *warnings*) |
| `fcr` | How many incidents are solved at first contact? | L | monthly, warnings |
| `sla` | Are P3/P4 resolved within SLA? | L | monthly, warnings |
| `csat` | Are users satisfied? | L | monthly, warnings |
| `atRisk` | Which open incidents breach or are about to? | L | all modes |
| `weekly` | How did the last 8 weeks go? | L | weekly |
| `backlog` | Where is open work piling up? | M | weekly |
| `volume` | How much do we resolve, through which channels? | M | monthly, weekly |

## Templates (default view; the user can switch modes in the dashboard header)
- **monthly**: management view; the reference layout plus the attention strip. Default.
- **weekly**: operations; last 8 weeks, at-risk, backlog, volume. The monthly panels are hidden.
- **warnings**: only what needs attention, with the reason; panels ordered worst first.

Mapping from the manager phrase *“current IT weekly, IT support monthly, support identify warnings”*:
weekly → `weekly`, monthly → `monthly`, warnings → `warnings`.

## Rules
1. Propose a template in one sentence with a default (“I suggest *monthly* because the audience is management — OK?”) and set it with `choose_template`.
2. Add or remove modules with `update_dashboard` `{op:"show"|"hide", target:"module:<id>"}` (or `panel:<id>`, `atRisk`).
3. If a module needs data that is missing (e.g. no survey file → CSAT), say so and keep the module with its empty state rather than removing it silently.
4. Status thresholds used by the attention strip:
   - **critical** = below target;
   - **warning** = within 2 pp of the target (0.1 for CSAT) or falling ≥ 3 pp vs the previous month (0.2 for CSAT);
   - **info** = low volume or a data notice.
