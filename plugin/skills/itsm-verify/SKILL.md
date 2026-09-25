---
name: itsm-verify
description: >
  Independently re-counts every KPI of an ITSM dashboard with a separate implementation and compares it with the
  dashboard values and, optionally, with an official reference report (e.g. the managed-service provider's monthly
  SLA Excel), producing verify.md with ✓/✗ per KPI and month. Use after every build, when the user asks
  "are these numbers right", "czy liczby się zgadzają", "compare with the Excel report", or before presenting.
metadata:
  version: "0.1.0"
---

# Verification

Green tests alone are not proof; agreement between independent calculations and with an external reference is.

## Levels
1. **In-page** (automatic): the page recomputes in JavaScript and compares with the build script → header badge
   "✓ numbers consistent (N checks)".
2. **Independent re-count** (this skill):
   `python ${CLAUDE_PLUGIN_ROOT}/skills/itsm-verify/scripts/verify_kpis.py --spec itsm-workspace/spec.json --results itsm-workspace/kpi_results.json --data itsm-workspace/data --out itsm-workspace/verify.md`
   > With tools available (web app, MCP `itsm-engine`) call the `itsm_*` tool instead; with Node use `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs …` (see the table in `itsm-dashboard`). Same engine, same results.

3. **External reference** (when the user has an official report): create `reference.csv` with `kpi,month,value`
   (values from the report, typed by the **user** or read from their file — never from memory) and add
   `--reference reference.csv --tolerance 0.1`.
4. **Spot check**: open 3 records per KPI in the Details table and confirm with the user that the flag/score is read
   as intended (e.g. "Missed" really means breached).

## Rules
- Exit code 1 or any ✗ → do not present the dashboard as final. Explain each mismatch: filter, month column,
  excluded values, duplicates, snapshot date, rounding.
- Report in one line when all match: "Verified: 65 of 65 values match an independent re-count."
- Keep `verify.md` next to the dashboard; mention it when sharing.
