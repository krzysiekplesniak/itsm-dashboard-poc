---
name: itsm-anonymize
description: >
  Scans ITSM CSV files for personal data before any analysis and produces anonymised copies: drops names,
  e-mails, phones, free-text descriptions; hashes logins/assignees; puts uncertain columns ON HOLD until the user
  decides keep / hash / drop. Use whenever ITSM or Service Desk data files are provided, when the user asks
  "is there personal data", "anonimizacja", "RODO/GDPR check", or asks what was removed.
metadata:
  version: "0.1.0"
---

# Anonymisation gate

**Hard rule:** do not open, quote or analyse values of a file before this scan. Even "already anonymised" files
are scanned — the check is cheap and the owner may have missed a column.

## Steps
1. Run: `python ${CLAUDE_PLUGIN_ROOT}/skills/itsm-anonymize/scripts/pii_scan.py <files…> --out-dir itsm-workspace/data --report itsm-workspace/pii_report.md`
   > With tools available (web app, MCP `itsm-engine`) call the `itsm_*` tool instead; with Node use `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs …` (see the table in `itsm-dashboard`). Same engine, same results.

2. Read `pii_report.md`.
   - Nothing on hold → one line to the user: "Personal data check: removed X, hashed Y, nothing on hold." Continue
     with the copies in `itsm-workspace/data/`.
   - Columns **on hold** → **GATE**: show the table *file · column · why · masked examples*; recommend **drop** unless
     a KPI needs the column; ask keep / hash / drop per column; re-run with `--keep/--hash/--drop` accordingly.
3. Record decisions in `itsm-workspace/ORG_PROFILE.md` under "Data privacy decisions" so the next run applies them.

## Classes
| Class | When | Effect |
|---|---|---|
| drop | name suggests personal data or free text; ≥ 20 % e-mails/phones/IPs/IBANs; long free text | removed |
| hash | login, assignee, owner, agent, "modified by" | `anon_xxxxxxxx` (same person → same code) |
| review | many values look like person or host names, some contact data, unknown text | ON HOLD, dropped by default |
| keep | IDs, dates, priority, group, status, SLA, score, category, channel | kept |

## Never
- Show raw personal values, even when the user pastes them ("the value you pasted").
- Keep an on-hold column "to be helpful".
- Promise perfection: say uncertain columns are held for the user's decision.
- Put real client data into a public repository or share link.
