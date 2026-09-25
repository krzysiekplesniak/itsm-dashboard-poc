# spec.json — schema

```jsonc
{
  "title": "Service Desk KPI dashboard",          // page title
  "subtitle": "FCR · P3 & P4 SLAs · CSAT",
  "audience": "…",                                // informational
  "dataLabel": "Anonymised export, 24.09.2026",   // shown under the title
  "mock": false,                                  // true → yellow "mock data" banner
  "defaultMonth": "latest",                       // or "YYYY-MM"
  "trendMonths": 12,
  "lowVolume": 10,                                // < N records → "low volume"
  "theme": { "--s1": "#5B3FB0", "--panel-head": "#E9EBEF" },   // optional CSS variables (from DESIGN.md)
  "sources": {
    "<sourceId>": {
      "file": "exact file name.csv",
      "label": "Tab label in Details",
      "id": "Incident ID",                        // optional
      "date": "Resolved Date",                    // column that assigns the month
      "dateFormat": "auto",                       // auto | ISO | DMY | MDY
      "filters": [ { "column": "SLA Name", "op": "startsWith", "value": "Service Desk" } ],
      "breakdown": "Assigned Group",              // optional: where misses concentrate
      "detailColumns": ["Incident ID", "…"]       // columns in the Details table
    }
  },
  "kpis": [
    { "id": "sla_p3", "label": "P3 SLA", "source": "<sourceId>",
      "type": "rate",                             // rate | mean | count
      "column": "SLA Status",
      "positive": ["Met"],                        // rate: success values (case-insensitive)
      "negative": ["Missed"],                     // rate, optional: only these count as failures; others excluded
      "where": [ { "column": "SLA Name", "op": "contains", "value": "P3" } ],   // KPI-level filter
      "divide": 2,                                // mean: divide each value (1–10 → 1–5)
      "target": 90, "direction": "higher",        // higher | lower
      "unit": "%", "decimals": 1,
      "how": "Plain-language definition shown in the tooltip and footer." }
  ],
  "panels": [
    { "id": "p_sla", "title": "P3 & P4 SLAs",
      "cards": [ { "kpi": "sla_p3", "show": "value" },          // value | missed | count | count_ytd
                 { "kpi": "sla_p3", "show": "missed", "label": "P3 breaches", "unit": "incidents" } ],
      "chart": { "kpis": ["sla_p3", "sla_p4"], "style": "line" } }   // line | area (area only for one KPI)
  ],
  "globalFilters": [                             // filter chips on the page; the agent passes the same ids to itsm_kpis/itsm_records
    { "id": "group", "label": "Assigned group", "columns": { "<sourceId>": "Assigned Group" } },
    { "id": "priority", "label": "Priority", "columns": { "<sourceId>": "Priority" } }
  ],
  "insights": [ { "text": "…", "kpi": "fcr", "level": "info", "month": "2026-08" } ],  // analyst notes (itsm-insights)
  "assumptions": [ "…" ]
}
```
Filter ops: `equals`, `notEquals`, `in`, `notIn`, `startsWith`, `contains`, `notEmpty` (all case-insensitive, trimmed).
Status: below target → critical; within 2 pp (0.1 for `mean`) → warning; else met.
