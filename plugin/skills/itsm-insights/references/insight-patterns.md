# Insight patterns (fill only with computed numbers)

| Pattern | Template | Trigger |
|---|---|---|
| Below target | "<KPI> is <v><unit> in <month>, <gap> below the <target> target (<n> records)." | value < target |
| Near target | "<KPI> <v> is within <margin> of the target — one bad week could tip it." | gap < 2 pp / 0.1 |
| Sharp change | "<KPI> <rose/fell> <d> pp from <prev> to <month>." | |d| ≥ 3 pp / 0.2 |
| Streak | "<KPI> declined three months in a row (<a> → <b>)." | 3 consecutive worse |
| Year on year | "<KPI> <v> vs <v_ly> in <month_ly> (<±d> pp YoY)." | ≥ 13 months |
| Concentration | "<share> of <KPI> misses in <month> come from <group> (<k> of <n>)." | breakdown column |
| Small base | "<KPI> rests on <n> records — treat with care." | n < 10 |
| Contrast | "SLA is 99 % but FCR is falling: tickets are solved on time, yet more are passed to second line." | two KPIs diverge |
| Good news | "<KPI> <month> is the best of the last 12 months (<v>)." | max |
| Action | "Check <group>'s <category> tickets from <month> (Show records → filter <group>)." | after a concentration |
