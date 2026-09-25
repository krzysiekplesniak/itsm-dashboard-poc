# KPI_SPEC — <dashboard name>

## 1. Persona and decision
- Who: …  · When / how long: …  · Decision it supports: …

## 2. Business questions (max 5)
1. …

## 3. KPIs
| ID | Question | Definition | Formula on columns | Unit | Target (direction) | Month by | Scope filter | Status |
|---|---|---|---|---|---|---|---|---|
| K1 | … | … | … | % | 70 (higher) | Resolved Date | … | confirmed / assumption |

## 4. Widgets
### W1 — <name>
| Field | Value |
|---|---|
| KPI | K1 |
| Business question | (verbatim from §2) |
| Widget type | stat card / trend (area/line) with target line / bar by group / table |
| Size | --size-sm / --size-md / --size-lg |
| Query (descriptive) | … |
| Source | file + columns |
| Filters honoured | month (always); group; priority |
| Visual treatment | value in --status-critical when below target, --status-high within 2 pp, else neutral text + ✓ |
| Empty state | "n/a" in --status-neutral + notice; never red, never 0 |
| Validation rule | one executable sentence |

## 5. Shared filters and defaults
Month: latest complete month (current month flagged as partial) · Group: all · Priority: all.

## 6. Out of scope (next dashboard)
- …

## 7. Assumptions to confirm
- …
