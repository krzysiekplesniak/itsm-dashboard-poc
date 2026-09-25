# What the generated page does (v0.1)

- Header: title, subtitle, data sources with row counts, month selector, **consistency badge** (Python vs JS), Load CSV, Print.
- Mock banner (auto-hides after 6 s, closable) when `mock: true`.
- **What the data says**: pinned summary (all on target / N below or near), then findings worst first: below target,
  near target, change ≥ 3 pp (0.2 for averages) vs previous month, three consecutive declines, year-on-year,
  best month of 12, where misses concentrate (breakdown column), low volume, analyst notes. "Show records →" opens details.
- **Panels**: cards with value, unit, status (⛔ below target / ⚠ near / ✓), period, target, delta vs previous month,
  low-volume note, ⓘ "how calculated" (hover, focus or click). Cards are buttons (Enter/Space) → details.
- **Trend charts** (SVG, no library): 12 months up to the selected month, dashed target line, legend for several
  series, data labels on single series, tooltip (value, target, records, misses), click point → select month + details.
- **Details**: tabs per source (arrow keys), context chip (KPI · month, removable), search, sortable columns
  (click or Enter, aria-sort), failed rows first and shaded, 200 rows + "show more", CSV export of the current view.
- **How calculated**: sources, filters, KPI definitions, targets, assumptions, build notes.
- Drop zone: without embedded data (or via "Load CSV") the page reads CSV files locally and recomputes.
- Accessibility: focus outlines, aria labels on cards and charts, live region for table counts, reduced motion,
  print stylesheet. Tooltips stay inside the window.
