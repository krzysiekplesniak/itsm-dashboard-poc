---
name: itsm-learn
description: >
  Captures what a dashboard session taught — corrections the owner made, rules clarified, layout preferences,
  data quirks — into ORG_PROFILE.md and LEARNINGS.md so the next run starts smarter, and proposes updates to the
  kit's skills when a lesson is general. This is how the kit is "trained" on an organisation's data without
  fine-tuning. Use at the end of a session, after the owner corrects the dashboard, or when the user says
  "remember this for next time", "zapisz to", "learn from this", "update the skill".
metadata:
  version: "0.1.0"
---

# Learn — close the loop

"Training" = several real sessions on the owner's data, each ending with the lessons written down where the next
session reads them. No model is changed; the knowledge is.

## At the end of a session
1. List what changed between the first dashboard and the accepted one: spec diffs (targets, filters, panels,
   labels), answers from the interview, verify mismatches and their causes, questions the owner asked that the
   dashboard could not answer.
2. Classify each lesson:
   - **Organisation-specific** (their targets, their SLA prefix, their layout) → `itsm-workspace/ORG_PROFILE.md`
     ("Learned rules", with date and reason).
   - **General ITSM / dashboard lesson** (e.g. "SLA files often contain other teams' SLAs") → propose an edit to the
     relevant skill file of this kit (show the exact text); the kit owner applies it in the plugin repository.
   - **Missing capability** (weekly view, raw timestamps) → `itsm-workspace/LEARNINGS.md` → backlog of the kit.
3. Append to `itsm-workspace/LEARNINGS.md`: date · lesson · where it was saved · evidence.
4. Tell the user in 3 lines what will be different next time.

## Next session
`itsm-dashboard` reads `ORG_PROFILE.md` first, so the owner is not asked the same questions again and the first
dashboard already follows their rules. Check "Learned rules" before choosing defaults.

## Never
Save personal data, raw ticket text, or opinions about people. Save rules, not records.
