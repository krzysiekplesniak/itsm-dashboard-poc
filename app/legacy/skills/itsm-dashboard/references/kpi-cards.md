# KPI cards

Each card: definition, formula, required fields, target, provenance, status, pitfalls. Status "proposed" = from the project brief / Vendor report, **to be confirmed by the KPI owners (the KPI owners,  — SD team)**.

## FCR — First Call Resolution
- **Formula:** FCR % = successes ÷ population × 100.
- **Population:** resolved/closed incidents (resolved in the month) whose **initial assigned group = IT-Service Desk**.
- **Success:** never transferred to another group **and** resolved by IT-Service Desk in **< 30 business minutes** (minus pending).
- **Fields:** Incident ID, Submit Date, Last Resolved Date, Status, Initial Assigned Group, Assigned Group, Group Transfers (or group audit), pending duration.
- **Target:** 70 % (Vendor "MET (SLT=70%)").
- **Provenance:** Brief §5.1; Vendor Excel "ACME-SDK-SLA-06-First Call Resolution (FCR) - 30 min-", months by "Last Resolved Date".
- **Cards:** First Call Resolution (%), Missed FCR (count), Total (population).
- **Pitfalls:** export timezone (UTC vs Luxembourg) shifts the 30-minute rule; if "initial group" is missing FCR cannot be computed (n/a); sub-groups of the Service Desk must be listed.
- **Status:** proposed.

## P3 SLA / P4 SLA / P3 & P4 SLA
- **Formula:** P3 SLA % = resolved P3 within **8 business hours** ÷ all resolved P3 × 100; P4 within **16 business hours**; combined = (P3 met + P4 met) ÷ (P3 + P4) × 100.
- **Open incidents excluded.** Pending time subtracted. If BMC's own SLM flag exists, prefer it only if it matches these rules; flag discrepancies.
- **Fields:** Priority, Submit Date, Last Resolved Date, Status, pending duration (or status history).
- **Target:** 90 % (brief §5.2–5.4). Reference dashboard shows ~99 %.
- **Status:** proposed.

## CSAT — Customer satisfaction
- **KPI:** average score on a **1–5** scale over responded surveys (Vendor: rating 2–10 ÷ 2 = "Average out of 5").
- **Cards:** Sent Surveys, Responded Surveys, Response rate (responded ÷ sent × 100). Reference dashboard shows these **"This year"** (year-to-date); the brief says monthly — ask which.
- **Month assignment:** score & responded by **response date**; sent by **sent date**.
- **Fields:** Survey ID, Incident ID (join key), Sent Date, Response Date, Rating; unanswered surveys must be included, otherwise response rate = n/a.
- **Target:** average ≥ 4.2.
- **Status:** proposed.

## At-risk incidents (list, not a KPI)
- Open P3/P4, business time elapsed (minus pending) vs threshold: **Breached** > threshold, **At risk** ≥ 75 %.

## Candidate KPIs (not in scope unless the user asks)
MTTR per priority · backlog and backlog age · reopen rate · volume by channel/category · SLA by group.
