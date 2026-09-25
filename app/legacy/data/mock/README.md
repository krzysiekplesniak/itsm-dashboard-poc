# Dane syntetyczne (MOCK) — nie są to dane ACME

Wygenerowane przez `npm run mock` (`scripts/generate-mock.js`, stałe ziarno → zawsze te same pliki).
Kształt jak eksport BMC Helix ITSM; rozkłady skalibrowane do zrzutu referencyjnego (Vendor client view).

| Plik | Wiersze | Co zawiera |
|---|---|---|
| `bmc_incidents_mock.csv` | 19 592 | Incydenty 01.09.2025 → 22.09.2026 12:00; nazwy kolumn BMC; daty DD/MM/YYYY HH:mm |
| `bmc_surveys_mock.csv` | 19 404 | Ankiety po incydencie; ~15% odpowiedzi; oceny 2/4/6/8/10 (skala Vendor) |
| `bmc_incidents_mock_v2_renamed.csv` | 19 592 | Te same incydenty z **innymi nazwami kolumn** i datami ISO: test, czy mapowanie działa na „obcym” eksporcie |

Rozszerzenia względem tabeli z Excela (dane, których referencja nie pokazuje, a eksport BMC zwykle ma):
priorytety Critical/High/Medium/Low (1/4/22/73%), grupa początkowa i rozwiązująca, liczba przekazań,
czas w statusie Pending, usługa, kategoria (Tier 1), kanał zgłoszenia, status, data zamknięcia, anulowane (~0,8%),
otwarte incydenty P3/P4 po terminie lub blisko terminu SLA w chwili migawki (panel „at risk”).

**Celowo dodane dane osobowe** (Customer Full Name, Customer Email, Assignee, Summary, Comment) są tylko po to,
żeby pokazać, że anonimizacja usuwa je przy wczytaniu, zanim cokolwiek trafi do LLM.
