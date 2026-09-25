---
name: itsm-grill-me
description: >
  Interviews the dashboard owner (e.g. a Service Desk manager) relentlessly but efficiently — one question at a time,
  each with a recommended answer — until the dashboard's purpose, audience, KPI definitions, targets, scope rules,
  presentation and trust requirements are unambiguous, then saves the answers to ORG_PROFILE.md so they are reused
  next time. Use when the user says "grill me", "przepytaj mnie", "ask me what you need", "let's define the
  dashboard", "interview the manager", when ORG_PROFILE.md is missing for a real audience, or when a KPI rule is unclear.
metadata:
  version: "0.1.0"
  origin: "ITSM adaptation of the 'grill-me' interviewing pattern (Matt Pocock, mattpocock/skills, MIT)"
---

# Grill me — transfer the manager's knowledge into the kit

The model knows ITSM in general; only the owner knows **their** rules. This interview turns tacit knowledge into
written decisions. The result is not a chat transcript: it is `itsm-workspace/ORG_PROFILE.md`, which every other
skill reads.

## How to interview
- **One question at a time.** Always give your **recommended answer** and why, so the owner can reply "yes".
- **Walk the decision tree** (`references/question-bank.md`): resolve what other answers depend on first
  (audience → decision → KPIs → definitions → targets → presentation → trust → privacy → delivery).
- **Look before asking.** If the data profile or an earlier answer already settles it, do not ask — state it as a
  confirmed fact or an assumption.
- **Challenge vague answers** with a concrete example from their data: "Should an SLA row with *In Process* count
  as missed or be excluded? In August there are 0 such rows in your file, so it changes nothing today."
- Stop when every branch is resolved or explicitly parked as an assumption. Typical length: 8–15 questions,
  ~15 minutes. Quick mode: only the 3 questions with the biggest impact on numbers.
- Match the owner's language. Keep a running summary every ~5 answers ("So far: …").

## After the interview
1. Write/update `itsm-workspace/ORG_PROFILE.md` from `references/org-profile-template.md`: every decision with
   source ("owner, 30.09") and status (confirmed / assumption / parked).
2. Update `KPI_SPEC.md` and `spec.json` if definitions changed; rebuild and verify.
3. Show the owner a 5-line summary of what will change in the dashboard.

## Never
- Ask several questions in one message.
- Ask for personal data or raw ticket content.
- Turn assumptions into facts without the owner's answer.
