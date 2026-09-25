# Profile: Service Desk — three pre-computed exports (PoC, 24.09.2026)

Provided by the business owner (Senior Service Manager, Service Desk) as anonymised CSV files. Rules as stated
in his e-mail; column names below are expected, confirm them with the profiler.

| File | Record | Rule from the business owner | Spec |
|---|---|---|---|
| `Incident - SLA P3_P4.csv` | one SLA measurement of an incident | "consider only the SLAs whose name starts with **Service Desk**"; a column says **Met** or **Missed**; "% on a monthly basis" | source filter `SLA Name startsWith "Service Desk"`; KPIs P3, P4, P3 & P4 = share of Met |
| `Customer Satisfaction.csv` | one survey answer | "divide the score **by 2**" (scale 1–10 → 1–5) | `type: mean`, `divide: 2`, target 4.2 |
| `FCR.csv` | one ticket | column **"SLA met?"** per ticket; "% on a monthly basis" | `type: rate`, positive Yes |

Presentation reference: three panels side by side (FCR · P3 & P4 SLAs · Customer satisfaction), three cards each,
12-month trend with a flat target line (FCR 70 %, SLA 90 %, CSAT 4.2).
Open points: which date column assigns the month in each file; targets confirmed?; "In Process" values present?
Worked example with synthetic data: `examples/mock-3csv/` (spec.json + generator).
