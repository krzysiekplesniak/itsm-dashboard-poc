# KPI families — formulas, inputs, pitfalls

Each KPI: formula · typical target · input (pre-computed or raw) · pitfalls. Targets are examples: confirm per
organisation (interview → ORG_PROFILE.md).

## Promise keeping
- **SLA % (per priority)** = Met ÷ (Met + Missed) × 100. Target 90–95 %. Input: SLA Status per record, filtered to
  the SLAs in scope (name prefix, priority). Pitfalls: "In Process" rows; response vs resolution SLAs mixed;
  one incident with several SLA rows.
- **Breaches (count)** = Missed records in the month. Shows the size behind a high %.
- **At-risk open tickets** = open tickets ≥ 75 % of their SLA time (raw data + business calendar needed).

## First-line effectiveness
- **FCR %** = records resolved at first contact ÷ records in the population. Target ~70 %. Pre-computed: share of
  "Yes"/"Met" in the FCR flag. Raw: initial group = Service Desk, no transfer, resolved < N business minutes.
- **Transfer rate** = transferred ÷ all. Mirror of FCR.

## Speed
- **MTTR / median resolution time** in business hours. Use the median for skewed data; show P90 for the tail.
- **Time to first response.**

## Load
- **Volume** (created / resolved per month; by channel, category, service).
- **Backlog** = open at month end; **backlog age** buckets (0–2 d, 3–7 d, 8–30 d, > 30 d).

## Quality
- **CSAT average** = mean score (converted to the reporting scale, e.g. ÷ 2). Target e.g. ≥ 4.2 / 5. Month by
  response date. Show the number of responses.
- **Response rate** = responded ÷ sent (needs unanswered surveys).
- **Reopen rate** = reopened ÷ resolved.

## Choosing KPIs for a manager
Start from the decision: monthly management review → SLA %, FCR %, CSAT with targets and 12-month trends;
daily operations → breaches, at-risk, backlog by group; improvement work → breakdowns by group/category and
"where misses concentrate". Max 5 KPIs per view.
