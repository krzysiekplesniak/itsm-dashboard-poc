# Dashboard design

## Reference (the reference screenshot, e-mail 21.09.2026)
- Three side-by-side panels with grey header bars: **First Call Resolution**, **P3 & P4 SLAs**, **Customer satisfaction**.
- Each panel: three white cards (label, period subtitle e.g. "August 2026", large number, small unit), then a trend chart.
- FCR: cards "First Call Resolution %", "Missed FCR", "Total"; purple area chart, 12 months, target line 70.
- SLAs: cards "P3 SLA", "P4 SLA", "P3 & P4 SLA"; multi-line chart (3 series).
- CSAT: cards "Sent Surveys", "Responded Surveys" (both "This year"), response rate %; purple area "Survey Rating" with target 4.2.
- Brief adds: a full-width **At-risk incidents** row below; month picker; "how is this calculated" icon on each card; low-volume marker.

## Rules
- Titles and labels short; the number is the hero. Every KPI shows a target or trend for comparison.
- Red/green only for status (below target, breached); series colours are identity only (P3 purple, P4 blue, combined orange — validated for colour-blind safety).
- Monthly data labels on single-series charts (brief §3); legends for multi-series.
- Never a pie chart; never two y-axes.
- Missing data → "n/a" plus a notice banner; never zero.

## Allowed changes (`update_dashboard` operations)
hide/show {target: "panel:fcr|sla|csat" | "card:<id>" | "atRisk"} · move {panel, to} · moveCard {card, to} · rename {target, text} · describe {target, text} · highlight/unhighlight {target} · setTarget {panel, value} · setAccent {color "#RRGGBB"} · setMonth {month "YYYY-MM"} · setTitle {text, subtitle?} · setCardPeriod {card, period "month"|"ytd"}.
Card ids: fcr_pct, fcr_missed, fcr_total, sla_p3, sla_p4, sla_combined, csat_sent, csat_resp, csat_rate.
