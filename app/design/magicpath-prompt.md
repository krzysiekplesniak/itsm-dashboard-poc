# MagicPath brief: ITSM Service Desk KPI Dashboard (+ chat side panel)

> Input for MagicPath: generate the dashboard **layout, UX behaviour and visual style from scratch**.
> The functions and data below are the working v0.2.0 prototype. Keep the functions, redesign the look.
> Neutral naming (no client names). All numbers are synthetic sample data.
> Section 9 is a ready-to-paste prompt. Sections 1–8 are the full specification it refers to.
> User journeys are in `user-flow.md`.

---

## 1. Product in one paragraph
A single-page **Service Desk performance dashboard** for an IT Service Management team, generated from a
ticketing-system export (incidents + satisfaction surveys). It shows three KPI families (**First Call
Resolution**, **P3/P4 resolution SLA**, **Customer Satisfaction**) for a selected month, with 12-month trends,
the list of open incidents at risk, and a verification view proving the numbers. Every number can be
**drilled into** (why, breakdown, ticket list). A **chat assistant** lives in a collapsible **left side panel**
and can explain any element the user selects. The user can save **versions** of the dashboard as tabs.

## 2. Users and what they need
| User | Looks at it | Needs in < 10 s | Then |
|---|---|---|---|
| **Service Desk manager** (primary) | monthly + before management meetings | Are we on target? What needs my attention? | drill into the worst KPI, export, ask "why" |
| **Team lead / coordinator** | weekly | Which open incidents are breaching or about to? | sort the at-risk list, open ticket details |
| **Management** (reads a shared copy) | monthly | 3–5 headline numbers vs target, trend direction | nothing — must be self-explanatory |

Guiding phrase from managers: *"Give me current IT weekly, IT support monthly, support: identify warnings."*
So the design must support **monthly**, **weekly** and **warnings-first** reading.

## 3. Functions the dashboard performs (all must stay)
1. **Month selector**: all cards show the selected month; trends show 12 months ending in it; the default is the last complete month.
2. **KPI cards** (9 in 3 groups), each with value, unit, period label, target, *below target* flag, *low volume (<10)* flag and an **ⓘ “how is it calculated”** tooltip.
3. **Trend chart per group** (12 months), dashed **target line**, value labels on single-series charts, hover tooltip. Clicking a point opens the drill-down for that month.
4. **At-risk incidents table**: open P3/P4 incidents with *Breached* / *At risk* badges, business hours elapsed vs SLA threshold. Sortable.
5. **Drill-down (modal)** on any card:
   - summary strip: value, population, missed, change vs previous month in pp, target;
   - **Why** table with reasons for misses and their share;
   - **Breakdown by** category / resolving group / service / channel, sorted by misses, with an inline bar;
   - **Ticket list** with *All / Missed / Met* filter chips, search, sortable columns, *Export CSV*, first 300 rows shown;
   - CSAT variant: rating distribution (Terrible … Excellent) and month-by-month table.
6. **Ask about this**: hover or focus a card, chart or table → “💬 Ask about this” (or Alt+A) → the element gets a **dashed selection frame**, the chat panel opens with a context chip “📌 About: P3 SLA — Aug 2026 = 99.71 %”, and the answer is about that data.
7. **Chat side panel (left)**:
   - collapsed = 44 px rail with the chat icon;
   - expanded = 420 px panel **over** the dashboard, with no layout jump;
   - **📌 Pin** docks it next to the dashboard;
   - Ctrl+B toggles it, Esc closes it;
   - the chat shows wizard steps, a mode badge (LLM connected / offline), streaming answers, tool-activity chips and a “thinking… N s” indicator.
8. **Tabs**: *Dashboard* · *Verification* (independent recalculation table, all rows ✓, plus sample tickets explained) · *Data & assumptions* (load summary, what anonymisation removed, column mapping, business-hours rules).
9. **Versions**: a tab strip above the dashboard, “● Working” plus saved versions. The user works on the working version, and **Save version** adds a tab. A saved tab is read-only, with *Make this the working version*.
10. **Banners**: *MOCK DATA* (auto-hides after 6 s, × to close) and data-quality notices (× to close).
11. **Export**: download the dashboard as one offline HTML file and a generated BRIEF.md.
12. **Accessibility**: full keyboard use (Tab, Enter/Space, arrows in tabs, Esc), visible focus ring, ARIA roles (tablist, dialog, log, aria-sort), charts with text alternatives.

## 4. KPI catalogue (content of the cards)
| Group | Card | Definition (tooltip text) | Target | Sample Aug 2026 |
|---|---|---|---|---|
| First Call Resolution | **FCR %** | Incidents resolved in the month that started in the Service Desk, were not transferred and were solved in < 30 business minutes ÷ all such incidents | ≥ 70 % | **86.19 %** (+2.26 pp m/m) |
| | Missed FCR | Population − FCR met | — | 146 |
| | Total | Resolved incidents that started in the Service Desk | — | 1,057 |
| P3 & P4 SLAs | **P3 SLA %** | Resolved P3 within 8 business hours (Mon–Fri 08–18, holidays excluded, minus pending) ÷ resolved P3 | ≥ 90 % | 99.71 % |
| | **P4 SLA %** | Resolved P4 within 16 business hours ÷ resolved P4 | ≥ 90 % | 99.81 % |
| | P3 & P4 SLA % | Combined | ≥ 90 % | 99.78 % |
| Customer satisfaction | Sent surveys | This year to the selected month | — | 11,947 |
| | Responded surveys | This year | — | 1,760 |
| | Response rate | Responded ÷ sent | — | 14.73 % |
| (chart) | Survey rating | Average on 1–5 (ratings 2–10 ÷ 2) | ≥ 4.2 | 4.88 |

Drill-down sample (FCR, Aug 2026):
- Why missed: transferred to another group 88 (60 %), solved in ≥ 30 min 58 (40 %).
- Worst categories: Software 34 missed (84.3 %), Hardware 33 (82.9 %).

At-risk sample: 7 breached, 1 at risk. Columns: ID, priority, submitted, group, business h elapsed, threshold, status.

## 5. UX principles
- **Attention first**: the first screenful answers *“are we OK, and what needs me?”*. Below-target values and breached items must pop. If everything is red, nothing is.
- **5-second read** per card: big number, unit, period and target, in that order.
- **Trust is a feature**: “how calculated”, the verification tab, a visible MOCK label and low-volume flags. Never hide data gaps.
- **Details on demand**: overview → click → drill-down → ticket → ask the chat. Never lose context: the modal keeps the dashboard visible behind it, and the chat panel overlays instead of pushing.
- **One working version**, saved snapshots in tabs (like projects).
- **Empty states designed in**: no surveys → CSAT shows n/a with a notice; no at-risk incidents → friendly empty row.
- **Keyboard and screen-reader parity** with the mouse.

## 6. Visual language (design tokens: keep the semantics, restyle freely)
| Token | Current value | Use |
|---|---|---|
| `--accent` | #7C5CD6 (violet) | primary actions, selected tab, FCR series, selection frame |
| series P3 / P4 / combined | #7C5CD6 / #1F8FB8 / #C2621B | chart lines (colour-blind validated) |
| `--status-critical` | #C62828 | breached, below target (only for “act now”) |
| `--status-warning` | #EF6C00 / #B54708 | at risk, low volume |
| `--status-met` | #2E7D32 | within target, verification ✓ |
| `--status-pending` | #1565C0 | clock running, filtered state |
| `--status-neutral` | #424242 | empty / n/a |
| surfaces | bg #EEF0F4, panel #F6F7F9, card #FFFFFF, border #DADDE3 | layered, calm |
| type | system sans (Segoe UI / Inter); KPI 30–36 px bold; label 12–13 px semibold; meta 11 px | numbers dominate |
| radius / spacing | cards 8 px, panels 10 px, modal 12 px; 8-pt grid; 12-col grid, widget sizes S 3×2, M 6×3, L 12×4 | consistent rhythm |
Tone: professional, calm, enterprise IT. Not playful. Light theme first; dark theme optional as a separate token set.

## 7. Layout today (to improve on, not to copy)
- Header: title, subtitle, month select, “data as of”.
- Tabs.
- Banner.
- **3 panels** side by side (each: header, 3 cards, 12-month chart).
- Full-width at-risk table.
- Footer.
- Chat rail on the far left; drill-down as a centred modal (max 1100 px).
Known weaknesses to solve:
- no “attention” summary at the top;
- panels have equal visual weight whatever the status;
- the CSAT panel mixes a year-to-date count with a monthly rating;
- no global filters (group, priority);
- the chart area is large compared with the information it carries.

## 8. What to generate (deliverables from MagicPath)
1. **Desktop 1440 px**: dashboard in *monthly* mode with an **attention strip** on top (e.g. “2 KPIs below target · 7 breached incidents · CSAT stable”).
2. The same screen in **warnings-first** mode and in **weekly operational** mode (at-risk list and volume first).
3. **Drill-down modal** for FCR (summary, why, breakdown, ticket list) and the CSAT variant.
4. **Chat side panel**: collapsed rail, expanded overlay, pinned; with a context chip and an answer about a selected card; the selected card with a dashed frame.
5. **Versions tab strip** with 3 saved versions.
6. States:
   - card below target;
   - low volume;
   - n/a with a notice;
   - empty at-risk table;
   - loading/thinking in the chat;
   - offline-mode badge.
7. **Responsive**: 1280 px laptop and 768 px tablet. The phone is out of scope.
8. Component sheet:
   - KPI card;
   - trend chart card;
   - status badge;
   - filter chips;
   - sortable table header (↕ ▲ ▼);
   - banner;
   - modal;
   - side panel;
   - tab strip;
   - tooltip.

Constraints:
- The result is rendered as **one self-contained offline HTML file**: no web fonts from a CDN, charts drawable with Chart.js or SVG.
- Everything must work with the keyboard.
- Do not add features that need a live connection to the ITSM system.

---

## 9. Ready-to-paste prompt for MagicPath

```
Design a desktop-first web dashboard for an IT Service Desk manager: "ITSM KPI Dashboard — Service Desk".

PURPOSE: in under 10 seconds answer "are we on target and what needs my attention?", then let the user
drill into any number and ask an AI chat assistant about it. Modes: Monthly (default), Weekly operational,
Warnings-first.

CONTENT (sample data, August 2026):
- Attention strip on top: "FCR 86.19% ✓ target 70% · P3 SLA 99.71% ✓ · P4 SLA 99.81% ✓ · CSAT 4.88/5 ✓ ·
  7 breached + 1 at-risk open incidents".
- Group "First Call Resolution": FCR 86.19% (+2.26 pp vs July), Missed FCR 146, Total 1,057; 12-month
  area chart with dashed 70% target line.
- Group "P3 & P4 SLAs": P3 99.71%, P4 99.81%, combined 99.78% (target 90%); 12-month multi-line chart.
- Group "Customer satisfaction": average rating 4.88/5 (target 4.2), responses 1,760 of 11,947 sent this
  year (14.73%); rating distribution Excellent/Good/OK/Dislike/Terrible.
- Table "At-risk incidents (open P3/P4)": ID, priority, submitted, group, business hours elapsed, SLA
  threshold, status badge (Breached red / At risk amber). Sortable columns.
- Header: title, month selector, "data as of 2026-09-22 11:59"; tabs Dashboard · Verification · Data &
  assumptions; a dismissible "MOCK DATA" banner.
- Tab strip for saved dashboard versions: "● Working", "Management monthly", "Ops view".

INTERACTIONS:
- Every KPI card has an ⓘ tooltip "how is it calculated", a target, and flags "below target" / "low volume".
- Clicking a card or a chart point opens a DRILL-DOWN MODAL: summary strip (value, population, missed,
  change vs previous month, target), "Why it was missed" reasons with shares, "Breakdown by
  category/group/service/channel" sorted by misses with inline bars, and a ticket list with filter chips
  (All/Missed/Met), search, sortable headers and Export CSV.
- Hovering or focusing any card/chart/table shows a small "💬 Ask about this" button; clicking it draws a
  dashed selection frame around the element and opens the CHAT SIDE PANEL on the LEFT with a context chip
  "📌 About: P3 SLA — Aug 2026 = 99.71%".
- Chat side panel: collapsed 44 px icon rail; expands to 420 px OVER the content (no layout shift); a Pin
  button docks it; Ctrl+B toggles. It shows wizard steps, a "GitHub Copilot ✓ / Offline" status badge,
  streamed answers, tool-activity chips and a "thinking… 12 s" indicator.
- Full keyboard support with visible focus rings; WCAG AA contrast.

VISUAL STYLE: calm professional enterprise IT, light theme, layered neutral surfaces (#EEF0F4 background,
white cards, #DADDE3 borders), violet accent #7C5CD6, chart series violet #7C5CD6 / teal #1F8FB8 /
burnt orange #C2621B, status colours reserved for meaning only (red #C62828 act now, amber #EF6C00 at risk,
green #2E7D32 met, blue #1565C0 pending). System sans font, big bold numbers (32 px), 8-pt spacing,
12-column grid, cards radius 8, modal radius 12. Numbers first, decoration minimal, below-target values
must stand out; if everything is red, nothing is.

DELIVER: desktop 1440 dashboard (monthly mode), warnings-first variant, drill-down modal (FCR and CSAT
variants), chat panel collapsed/overlay/pinned with a selected card, versions tab strip, empty/low-volume/
n-a states, and 1280 px + 768 px responsive versions, plus a component sheet.
```
