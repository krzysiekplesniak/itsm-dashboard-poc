# Modules and views (from the agent v0.2 library, Lab 2 format)

Every module = business question → KPI → query → widget → filter → validation, with a size token
(S 3×2 card, M 6×3 breakdown, L 12×4 trend/table), status tokens and an empty state.

| Module | Business question | Widget | In view |
|---|---|---|---|
| attention | Are we on target and what needs attention first? | findings strip ("What the data says") | all |
| fcr | How much is solved at first contact? | 3 cards (%, missed, total) + area trend with target | monthly, warnings |
| sla | Are P3/P4 resolved within SLA? | 3 cards (P3, P4, combined) + multi-line trend with target | monthly, warnings |
| csat | Are users satisfied? | 3 cards (average, responses, responses YTD) + area trend with target | monthly, warnings |
| records | Which records are behind a number? | details table, filtered by the clicked card, sortable, CSV export | all |
| filters | Only my group / priority? | global filter chips (group, priority) | all |
| atRisk | Which open incidents breach or are about to? | table (Breached > SLA, At risk ≥ 75 %) | needs raw export (wave 2) |
| weekly | How did the last 8 weeks go? | weekly trend | needs weekly aggregation (wave 2) |
| backlog | Where is open work piling up? | bar by group | needs open tickets (wave 2) |
| volume | How much do we resolve, through which channels? | bar + table | needs channel column |

## Views (manager shorthand → view)
- "IT support monthly" → **monthly**: management view, reference layout + findings strip. Default.
- "current IT weekly" → **weekly** (wave 2); until then: latest month + findings, say so.
- "identify warnings" → **warnings**: only KPIs below or near target, findings first.

## Status thresholds (same in the page, the engine and the findings)
critical = below target · warning = within 2 pp of target (0.1 for averages) or falling ≥ 3 pp vs previous month
(0.2 for averages) or three declines in a row · info = low volume (< 10 records) or a data notice.
