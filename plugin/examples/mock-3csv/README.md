# Synthetic example — three pre-computed Service Desk exports

**All data here is synthetic** (seeded generator `generate_mock.py`), shaped after the business owner's description of
the real files: `Incident - SLA P3_P4.csv` (SLA Name + Met/Missed; other teams' SLAs included to test the
"starts with Service Desk" filter), `Customer Satisfaction.csv` (score 2–10, reported ÷ 2), `FCR.csv` ("SLA met?" Yes/No).
Column names are assumptions. `spec.json` is the worked example; `dashboard.html` is its build.
