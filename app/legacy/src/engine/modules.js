// Biblioteka modułów KPI (v0.2) — PREDEFINIOWANE wzorce, bez analizy „inspiracji” w runtime.
// Każdy moduł opisany metodą z Laboratorium 2: pytanie biznesowe → KPI → zapytanie → widżet → filtr → walidacja,
// z tokenami wyglądu (rozmiar sm/md/lg na siatce 12, kolory statusu) i regułą pustego stanu.
// Moduł „panel” = istniejące panele spec (fcr/sla/csat); pozostałe rysuje renderer z danych silnika.

export const STATUS_TOKENS = { critical: '#C62828', warning: '#B54708', met: '#2E7D32', pending: '#1565C0', neutral: '#424242' };
export const SIZES = { sm: '3×2', md: '6×3', lg: '12×4' };

export const MODULES = {
  attention: { title: 'What needs my attention', size: 'lg', kind: 'strip',
    question: 'Are we on target this period, and what needs my attention first?',
    kpi: 'Status of every KPI vs target + trend vs previous month + open breaches',
    query: 'For each KPI: value, target, previous month; count open P3/P4 breached / at risk; data-quality notices',
    widget: 'Attention strip (compact) or warning list with “why” (warnings mode)', filters: ['month'],
    tokens: 'critical = below target or breached; warning = close to target (< 2 pp), falling ≥ 3 pp, at risk; met = OK',
    empty: '“All KPIs on target — nothing needs attention” in met colour', validation: 'Every critical item has a matching red card or breached row' },
  fcr: { title: 'First Call Resolution', size: 'lg', kind: 'panel', question: 'How many incidents does the Service Desk solve at first contact?',
    kpi: 'FCR % (target 70 %), Missed FCR, Total', query: 'Resolved in month, initial group = Service Desk; success = no transfer and < 30 business min',
    widget: '3 stat cards + 12-month area chart with target line', filters: ['month'], tokens: 'value in critical colour when below target',
    empty: 'n/a + notice when initial group is missing', validation: 'Independent recalculation equals the card' },
  sla: { title: 'P3 & P4 SLAs', size: 'lg', kind: 'panel', question: 'Do we resolve P3/P4 incidents within their SLA?',
    kpi: 'P3 % (≤ 8 h), P4 % (≤ 16 h), combined % (target 90 %)', query: 'Resolved P3/P4 in month; net business time (minus pending) vs threshold',
    widget: '3 stat cards + 12-month multi-line chart', filters: ['month'], tokens: 'series P3 violet, P4 teal, combined orange',
    empty: 'n/a when no P3/P4 resolved', validation: 'Independent recalculation equals the card' },
  csat: { title: 'Customer satisfaction', size: 'lg', kind: 'panel', question: 'Are users satisfied with the support?',
    kpi: 'Sent / responded surveys and response rate (year to date), average rating (target ≥ 4.2)', query: 'Surveys by sent / response date; rating 2–10 ÷ 2',
    widget: '3 stat cards + 12-month rating chart', filters: ['month'], tokens: 'neutral numbers; rating below target in critical colour',
    empty: 'n/a + notice when no survey file', validation: 'Average equals independent recalculation' },
  atRisk: { title: 'At-risk incidents (open P3/P4)', size: 'lg', kind: 'table', question: 'Which open incidents are breaching or about to breach?',
    kpi: 'Open P3/P4 with elapsed business hours ≥ 75 % of threshold', query: 'Status open/pending at snapshot; net business time vs threshold',
    widget: 'Sortable table with Breached / At risk badges', filters: [], tokens: 'Breached critical, At risk warning',
    empty: 'One row “No open P3/P4 incidents at risk” (never red)', validation: 'Count equals manual count in the export' },
  weekly: { title: 'Last 8 weeks', size: 'lg', kind: 'weekly', question: 'How did the last weeks go (operational view)?',
    kpi: 'Resolved per week, FCR % per week, P3/P4 SLA % per week', query: 'Resolved incidents grouped by ISO week (resolved date)',
    widget: 'Line chart FCR % and SLA % + weekly table', filters: [], tokens: 'same series colours as monthly panels',
    empty: '“No resolved incidents in the last 8 weeks”', validation: 'Sum of weeks equals resolved count for the same days' },
  backlog: { title: 'Open backlog by group', size: 'md', kind: 'table', question: 'Where is the open work piling up?',
    kpi: 'Open incidents by assigned group and priority, breached, oldest (business h)', query: 'Status open/pending at snapshot, grouped by assigned group',
    widget: 'Sortable table with bars', filters: [], tokens: 'breached count in critical colour',
    empty: '“No open incidents”', validation: 'Total equals open incidents in the export' },
  volume: { title: 'Resolved volume', size: 'md', kind: 'volume', question: 'How much work do we resolve, and through which channels?',
    kpi: 'Resolved incidents per month (12 months) + channel split for the selected month', query: 'Resolved incidents by month and reported source',
    widget: 'Bar chart (single colour) + channel table', filters: ['month'], tokens: 'accent bars, neutral table',
    empty: '“No resolved incidents”', validation: 'Monthly totals equal resolved counts' },
};

// Szablony = domyślny tryb widoku + kolejność modułów. W pliku HTML użytkownik przełącza tryby jednym kliknięciem.
export const TEMPLATES = {
  monthly: { title: 'Monthly (management)', modules: ['attention', 'fcr', 'sla', 'csat', 'atRisk', 'volume'], note: 'Reference layout: 3 KPI panels + trends; attention strip on top.' },
  weekly: { title: 'Weekly (operations)', modules: ['attention', 'weekly', 'atRisk', 'backlog', 'volume'], note: 'Operational: last 8 weeks, open backlog and breaches first.' },
  warnings: { title: 'Warnings first', modules: ['attention', 'atRisk', 'fcr', 'sla', 'csat'], note: 'Only what needs attention, with the reason; panels ordered worst first.' },
};

export function listModules() {
  return { modules: Object.entries(MODULES).map(([id, m]) => ({ id, ...m })), templates: TEMPLATES, sizes: SIZES, statusTokens: STATUS_TOKENS };
}
