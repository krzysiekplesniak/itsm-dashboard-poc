#!/usr/bin/env python3
"""Generate SYNTHETIC data in the shape of the three pre-computed Service Desk exports
(SLA P3/P4, Customer Satisfaction, FCR). Column names are assumptions based on the
business owner's e-mail description; real exports may differ - the data reader maps them.

No real people, no real tickets. Deterministic (seeded).
Usage: python generate_mock.py [out_dir]
"""
import csv, os, random, sys
from datetime import datetime, timedelta

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
rng = random.Random(20260924)

MONTHS = [(2025, m) for m in range(8, 13)] + [(2026, m) for m in range(1, 9)]  # 13 months
GROUPS = ["Service Desk L1", "Service Desk L1", "Service Desk L1", "Service Desk VIP", "Service Desk Remote"]
OTHER = ["Network Operations", "Workplace Services", "Identity & Access"]
FCR_RATE = [0.79, 0.75, 0.75, 0.82, 0.85, 0.84, 0.84, 0.81, 0.83, 0.83, 0.86, 0.89, 0.86]
P3_MET = [0.985, 0.99, 0.975, 0.992, 0.995, 0.99, 0.988, 0.993, 0.991, 0.996, 0.994, 0.992, 0.992]
P4_MET = [0.995, 1.0, 0.99, 1.0, 0.998, 1.0, 0.997, 1.0, 1.0, 0.999, 1.0, 1.0, 1.0]


def rand_dt(y, m):
    d = datetime(y, m, 1) + timedelta(days=rng.randrange(0, 28), minutes=rng.randrange(8 * 60, 18 * 60))
    while d.weekday() > 4:
        d += timedelta(days=1)
    return d


def fmt(d):
    return d.strftime("%d/%m/%Y %H:%M")


inc_no = 400000
sla_rows, fcr_rows, csat_rows = [], [], []
for i, (y, m) in enumerate(MONTHS):
    n_inc = rng.randint(980, 1120)
    for _ in range(n_inc):
        inc_no += rng.randint(1, 3)
        iid = f"INC{inc_no:012d}"
        sub = rand_dt(y, m)
        prio = "Medium" if rng.random() < 0.62 else "Low"
        group = rng.choice(GROUPS)
        # FCR file: every Service Desk incident, SLA met? Yes/No
        fcr_ok = rng.random() < FCR_RATE[i]
        res = sub + timedelta(minutes=rng.randint(5, 29) if fcr_ok else rng.randint(31, 900))
        fcr_rows.append([iid, fmt(sub), fmt(res), group, prio, "Yes" if fcr_ok else "No"])
        # SLA file: one SD resolution SLA per incident + occasional other-team SLA (must be filtered out)
        p = "P3" if prio == "Medium" else "P4"
        met = rng.random() < (P3_MET[i] if p == "P3" else P4_MET[i])
        sla_rows.append([iid, prio, f"Service Desk - {p} Resolution Time", "Met" if met else "Missed", fmt(sub), fmt(res), group])
        if rng.random() < 0.12:
            sla_rows.append([iid, prio, f"{rng.choice(OTHER)} - {p} Resolution Time",
                             "Met" if rng.random() < 0.9 else "Missed", fmt(sub), fmt(res), rng.choice(OTHER)])
        # Survey: ~15 % respond; scores 2..10 (even), mostly 10
        if rng.random() < 0.152:
            score = rng.choices([10, 8, 6, 4, 2], weights=[86, 9, 2.5, 1.2, 1.3])[0]
            csat_rows.append([iid, fmt(res + timedelta(hours=rng.randint(1, 72))), score, group])

with open(os.path.join(OUT, "Incident - SLA P3_P4.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["Incident ID", "Priority", "SLA Name", "SLA Status", "Submit Date", "Resolved Date", "Assigned Group"]); w.writerows(sla_rows)
with open(os.path.join(OUT, "FCR.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["Incident ID", "Submit Date", "Resolved Date", "Assigned Group", "Priority", "SLA met?"]); w.writerows(fcr_rows)
with open(os.path.join(OUT, "Customer Satisfaction.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["Incident ID", "Survey Date", "Score", "Assigned Group"]); w.writerows(csat_rows)
print(f"SLA rows {len(sla_rows)}, FCR rows {len(fcr_rows)}, CSAT rows {len(csat_rows)} -> {OUT}")
