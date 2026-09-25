# Rules for RAW incident exports (timestamps instead of pre-computed flags)

Used when a file has submit/resolved timestamps, groups and transfers but no Met/Missed column. The kit v0.3 builds
pre-computed KPIs; the raw rules below are implemented in the agent's v0.2 engine (`app/legacy`) and move into the
shared engine in wave 2.

- **Business hours:** Mon–Fri 08:00–18:00, Luxembourg public holidays (incl. Easter Monday, Ascension, Whit Monday,
  23 June, 1 Nov, 25–26 Dec) from a calendar file. Fri 17:50 → Mon 08:15 = 25 business minutes.
- **Pending time** is subtracted (unit — business or calendar minutes — to confirm).
- **FCR:** population = resolved incidents whose initial group is the Service Desk; success = no transfer and
  resolved in < 30 business minutes. Target 70 %.
- **P3 SLA** = resolved P3 within 8 business hours; **P4** within 16; target 90 %. Open incidents excluded.
- **CSAT** 2–10 (Terrible 2 … Excellent 10) ÷ 2; month by response date; response rate needs unanswered surveys.
- **At risk:** open P3/P4 at ≥ 75 % of the SLA time; **Breached** above it.
- **Traps:** export timezone (UTC vs local) shifts the 30-minute rule; "initial group" often missing in default
  exports; cancelled/rejected excluded; duplicates when audit rows are joined.
- Verification oracle on the synthetic raw sample (Aug 2026): FCR 86.19 % (1,057 incidents), P3 99.71, P4 99.81, CSAT 4.88.
