# Glossary — ITSM / Service Desk terms (EN / PL, plain language)

| Term (EN) | PL | Plain explanation | Matters for |
|---|---|---|---|
| **ITSM** (IT Service Management) | zarządzanie usługami IT | How IT delivers and supports services: tickets, SLAs, changes, knowledge. Tool here: **BMC Helix ITSM**. | everything |
| **Service Desk (SD)** | Service Desk / pierwsza linia | First line that receives calls, e-mails, chats, portal tickets. Often run with a managed-service partner. | FCR population |
| **Incident** | incydent | Something broken or degraded ("Outlook does not start"). | all KPIs |
| **Service request / Work order** | zgłoszenie usługowe | A standard request ("new laptop"), not a fault. Not in incident KPIs. | scope |
| **Problem** | problem | Root cause behind repeated incidents. | future packs |
| **Change** | zmiana | Planned modification of a service. | future packs |
| **Priority P1–P4** | priorytet | Impact × urgency. Exports often say Critical / High / Medium / Low = P1 / P2 / P3 / P4. P3/P4 are the daily bulk. | SLA |
| **SLA** (Service Level Agreement) | umowa o poziomie usług | A promise, e.g. "P3 resolved within 8 business hours". **SLA %** = share of records that kept it. | SLA KPIs |
| **SLT** (Service Level Target) | poziom docelowy | Required share, e.g. 90 % of P3 within SLA; FCR SLT 70 %. | targets |
| **OLA** | umowa wewnętrzna | Internal promise between teams. | second line |
| **SLM status / SLA Status** | status SLA | Tool-computed result per record: Met / Missed / In Process. | pre-computed KPIs |
| **Business hours** | godziny robocze | E.g. Mon–Fri 08:00–18:00 minus public holidays. Fri 17:50 → Mon 08:15 = 25 business minutes. | durations |
| **Pending** | oczekiwanie | Waiting for the user or a supplier; SLA clock usually paused. | SLA, FCR |
| **Resolved vs Closed** | rozwiązany / zamknięty | Resolved = fix delivered; Closed = confirmed later. KPIs use resolved. | month assignment |
| **Assigned group / Initial group** | grupa przypisana / początkowa | Team owning the ticket now / team that received it first. | FCR, breakdowns |
| **Transfer / reassignment** | przekazanie | Ticket moved to another group; any transfer breaks FCR. | FCR |
| **FCR** (First Call / Contact Resolution) | rozwiązanie przy pierwszym kontakcie | Share of tickets the Service Desk solved itself, without passing on, quickly (e.g. < 30 business min). | FCR panel |
| **MTTR** | średni czas rozwiązania | Mean (or median) time to resolve. | speed |
| **Backlog / backlog age** | zaległości / wiek zaległości | Open tickets / how long they have been open. | load |
| **Breached / At risk** | naruszone / zagrożone | Open ticket over its SLA / at ≥ 75 % of it. | at-risk list |
| **CSAT** | satysfakcja klienta | Survey after resolution. Scale 1–5 or 1–10 (2 Terrible … 10 Excellent); often reported "out of 5" = score ÷ 2. | CSAT panel |
| **Response rate** | wskaźnik odpowiedzi | Responded ÷ sent surveys (typically 10–20 %). | CSAT cards |
| **Reopen rate** | wskaźnik ponownych otwarć | Share of resolved tickets reopened — fixes that did not stick. | quality |
| **Shift-left** | przesunięcie w lewo | Moving resolution to earlier/cheaper levels (self-service, SD). | strategy |
| **Low volume** | mała próba | < 10 records behind a %: one ticket moves it a lot. | all cards |
| **Snapshot** | migawka | Export moment; current month and open tickets valid only as of then. | current month |
| **Managed-service report** | raport dostawcy | Official monthly SLA report from the outsourcing partner — the reference to verify against. | verification |
