# Tokens (current template) — change values here and in the template together

| Token | Value | Use |
|---|---|---|
| `--bg` | #F4F5F7 | page background |
| `--surface` | #FFFFFF | cards, panels |
| `--panel-head` | #E9EBEF | panel header bar |
| `--border` / `--grid` | #D9DCE1 / #ECEEF1 | borders / chart grid |
| `--text` / `--text-2` / `--text-3` | #1D2433 / #4A5264 / #6B7280 | text levels |
| `--accent` | #5B3FB0 | brand accent (links, focus is NOT accent) |
| `--s1…--s4` | #5B3FB0 #1F6FB5 #D9822B #0F8B8D | series identity, fixed order |
| `--status-critical` | #C62828 | below target |
| `--status-high` | #EF6C00 | near target (warning) |
| `--status-met` | #2E7D32 | target met |
| `--status-pending` | #1565C0 | info, active filter, focus ring |
| `--status-neutral` | #5F6368 | empty state, secondary |
| `--font-kpi` / `--font-label` / `--font-meta` | 600 34px / 600 14px / 400 12px system-ui | number / label / meta |
| `--radius` / `--gap` | 10px / 16px | panel radius / grid gap |

Spec override: `spec.theme` may set any `--*` token (from DESIGN.md or a MagicPath theme via `get-theme`).
A MagicPath redesign must map its theme to these names — rename nothing, swap values.
