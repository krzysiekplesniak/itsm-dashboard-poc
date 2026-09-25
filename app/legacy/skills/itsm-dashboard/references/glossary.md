# Glossary — ITSM / Service Desk terms in plain language (EN / PL)

Use the plain-language line when the user seems unfamiliar with a term. Examples are from the ACME context.

| Term (EN) | PL | Plain explanation | Where it matters |
|---|---|---|---|
| **ITSM** (IT Service Management) | zarządzanie usługami IT | How IT delivers and supports services for users: tickets, SLAs, changes, knowledge. ACME uses **BMC Helix ITSM**. | whole dashboard |
| **Service Desk (SD)** | Service Desk / pierwsza linia | The first line that receives calls, e-mails, chats and portal tickets. At ACME the group is **"IT-Service Desk"**, run with a managed-service partner (Vendor client view). | FCR population |
| **Incident** | incydent | Something is broken or degraded for a user ("Outlook does not start"). Different from a **service request** ("I need a new laptop"). | all KPIs |
| **Service request / Work order** | zgłoszenie usługowe | A request for something standard, not a fault. Not counted in incident KPIs. | scope |
| **Priority P1–P4** | priorytet | Urgency × impact. In BMC exports often shown as **Critical / High / Medium / Low** = P1 / P2 / P3 / P4. P3/P4 are the everyday bulk. | SLA KPIs |
| **SLA** (Service Level Agreement) | umowa o poziomie usług | A promise, e.g. "P3 resolved within 8 business hours". **SLA %** = share of tickets that kept the promise. | P3/P4 SLA |
| **SLT** (Service Level Target) | poziom docelowy | The % the SLA must reach, e.g. FCR SLT = 70 % in the Vendor report. | targets |
| **Business hours** | godziny robocze | Mon–Fri 08:00–18:00, excluding Luxembourg public holidays. A ticket opened Fri 17:50 and solved Mon 08:15 took **25** business minutes. | all durations |
| **Pending** | oczekiwanie (Pending) | Status meaning "waiting for the user or a third party". The SLA clock is normally paused, so pending time is subtracted. | SLA, FCR |
| **Resolved vs Closed** | rozwiązany / zamknięty | Resolved = fix delivered; Closed = confirmed/auto-closed a few days later. KPIs use the **resolved** date. | month assignment |
| **Assigned group / Initial group** | grupa przypisana / początkowa | The team that owns the ticket now / the team that received it first. | FCR |
| **Transfer / reassignment** | przekazanie | Ticket moved to another group (e.g. SD → Network Operations). Any transfer breaks FCR. | FCR |
| **FCR** (First Call / First Contact Resolution) | rozwiązanie przy pierwszym kontakcie | Share of tickets that the Service Desk solved itself, **without passing them on**, and **quickly** (ACME: < 30 business minutes). High FCR = less waiting for users, less load on 2nd line. | FCR panel |
| **MTTR** (Mean Time To Resolve) | średni czas rozwiązania | Average resolution time. Not in the current dashboard; candidate KPI. | future |
| **Backlog** | zaległości | Open tickets not yet resolved. | future / at-risk |
| **Breached / At risk** | naruszone / zagrożone | Open ticket already over its SLA threshold / at ≥ 75 % of it. | at-risk panel |
| **CSAT** (Customer Satisfaction) | satysfakcja klienta | Survey sent after resolution. ACME/Vendor ratings: Terrible (2), Dislike (4), OK (6), Good (8), Excellent (10); reported as **"average out of 5"** (rating ÷ 2). Target ≥ 4.2. | CSAT panel |
| **Response rate** | wskaźnik odpowiedzi | Responded surveys ÷ sent surveys. Around 15 % at ACME. | CSAT cards |
| **Low volume** | mała próba | Fewer than 10 tickets behind a %; one ticket changes the value a lot — treat with care. | all cards |
| **Snapshot** | migawka | The moment the export was taken. Open tickets and the current month are only true "as of" that moment. | at-risk, current month |
| **Vendor client view** | raport Vendor | The Excel SLA reports (SLA-06 FCR, SLA-08 CSAT) currently used to report Service Desk performance. Our reference for verifying numbers. | verification |
