#!/usr/bin/env python3
"""Profile ITSM CSV exports and explain what each column MEANS for KPI reporting.

For every file: rows, delimiter, date columns with month coverage, and per column:
role guess (id / date / flag / score / category / number / text), ITSM concept (from the
dictionary below), fill rate, distinct values, top values (masked if the column looks personal),
and which KPI types the column can feed. Ends with suggested KPI candidates and questions to confirm.

Usage: python profile_csv.py FILE.csv [FILE2.csv ...] [--out profile.md] [--json profile.json]
Standard library only.
"""
import argparse, csv, io, json, os, re, sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "itsm-anonymize", "scripts"))
try:
    from pii_scan import classify, mask  # same rules as the anonymisation step
except Exception:  # pragma: no cover
    classify = lambda n, v: ("keep", "")
    mask = lambda v: "•••"

CONCEPTS = [  # (regex on column name, ITSM concept, meaning for KPIs)
    (r"(incident|ticket)\s*(id|number|no)", "incident_id", "unique ticket key; used to count and to join files"),
    (r"survey\s*(id|number)", "survey_id", "survey key"),
    (r"submit|reported|created|open(ed)?\s*date", "submit_date", "when the ticket was raised; start of every duration"),
    (r"resolved", "resolved_date", "when the fix was delivered; usual date for assigning a ticket to a month"),
    (r"closed", "closed_date", "confirmation/auto-close; normally NOT used for KPIs"),
    (r"survey\s*date|response\s*date|responded|answered", "survey_date", "when the survey was answered; month for CSAT"),
    (r"sent\s*date", "survey_sent", "when the survey was sent; needed for response rate"),
    (r"priority", "priority", "P1-P4 (Critical/High/Medium/Low); SLA targets depend on it"),
    (r"^status$|incident\s*status", "status", "lifecycle state; Cancelled/Rejected are normally excluded"),
    (r"sla\s*name|slm\s*name|sla\s*title|service\s*target", "sla_name", "which SLA the row measures; filter by prefix (e.g. 'Service Desk')"),
    (r"sla\s*status|slm\s*status|sla\s*met|met\??$|breach", "sla_flag", "pre-computed result Met/Missed (or Yes/No): a KPI is the share of Met"),
    (r"fcr|first\s*(call|contact)", "fcr_flag", "pre-computed first-call-resolution result"),
    (r"score|rating|satisf", "csat_score", "survey score; check the scale (1-5 or 1-10 / 2-10)"),
    (r"initial|first\s*assigned", "initial_group", "team that received the ticket first; FCR population"),
    (r"assigned\s*group|support\s*group|queue", "assigned_group", "owning team; the natural breakdown for 'where do misses concentrate'"),
    (r"transfer|reassign", "transfer_count", "number of hand-overs; any transfer breaks FCR"),
    (r"pending|on\s*hold", "pending_time", "waiting time normally subtracted from SLA clocks"),
    (r"service$|business\s*service", "service", "affected service; breakdown"),
    (r"categor", "category", "classification; breakdown"),
    (r"source|channel", "channel", "phone / e-mail / portal / chat; breakdown and volume"),
    (r"site|location", "site", "location; breakdown"),
]
FLAG_POS = {"met", "yes", "y", "true", "1", "achieved", "ok"}
FLAG_NEG = {"missed", "no", "n", "false", "0", "breached", "not met", "nok"}
ISO = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}")
SLASH = re.compile(r"^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})")

def read(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc); break
        except UnicodeDecodeError:
            pass
    first = text.split("\n", 1)[0]
    delim = max([",", ";", "\t", "|"], key=first.count)
    rows = [r for r in csv.reader(io.StringIO(text), delimiter=delim) if any(c.strip() for c in r)]
    return [h.strip() for h in rows[0]], rows[1:], delim, enc

def month(v, order):
    v = v.strip()
    if ISO.match(v): return v[:7] if v[4] == "-" and v[7:8] == "-" else f"{v[:4]}-{int(v.split('-')[1]):02d}"
    m = SLASH.match(v)
    if not m: return None
    a, b, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    y = y + 2000 if y < 100 else y
    mo = b if order == "DMY" else a
    return f"{y:04d}-{mo:02d}" if 1 <= mo <= 12 else None

def date_order(vals):
    a = b = iso = sl = 0
    for v in vals[:5000]:
        if ISO.match(v): iso += 1; continue
        m = SLASH.match(v)
        if m:
            sl += 1; a += int(m.group(1)) > 12; b += int(m.group(2)) > 12
    if iso >= sl: return "ISO", None
    if a and not b: return "DMY", None
    if b and not a: return "MDY", None
    return "DMY", "ambiguous (no day > 12): assumed DD/MM"

def concept(name):
    for rx, c, why in CONCEPTS:
        if re.search(rx, name, re.I): return c, why
    return None, None

def profile_file(path):
    header, rows, delim, enc = read(path)
    cols = []
    for i, h in enumerate(header):
        vals = [(r[i] if i < len(r) else "").strip() for r in rows]
        filled = [v for v in vals if v]
        cnt = Counter(filled)
        pii, why_pii = classify(h, vals)
        c, meaning = concept(h)
        low = {v.lower() for v in cnt}
        role = "text"
        info = {}
        dates = [v for v in filled[:5000] if ISO.match(v) or SLASH.match(v)]
        nums = []
        for v in filled[:5000]:
            try: nums.append(float(v.replace(",", ".")))
            except ValueError: pass
        if filled and len(dates) / min(len(filled), 5000) > 0.9:
            role = "date"
            order, warn = date_order(filled)
            months = Counter(m for m in (month(v, order) for v in filled) if m)
            info = {"order": order, "warning": warn, "first": min(months) if months else None, "last": max(months) if months else None, "months": dict(sorted(months.items()))}
        elif low and low <= (FLAG_POS | FLAG_NEG | {"in process", "pending", "n/a", ""}) and len(low) <= 5:
            role = "flag"; info = {"positive": sorted(low & FLAG_POS), "negative": sorted(low & FLAG_NEG), "other": sorted(low - FLAG_POS - FLAG_NEG)}
        elif filled and len(nums) / min(len(filled), 5000) > 0.95:
            lo, hi = min(nums), max(nums)
            role = "score" if (c == "csat_score" or (hi <= 10 and lo >= 0 and len(set(nums)) <= 11)) else "number"
            info = {"min": lo, "max": hi, "mean": sum(nums) / len(nums)}
            if role == "score":
                info["scale_hint"] = "1-5" if hi <= 5 else "1-10 (divide by 2 for a 1-5 average?)"
        elif c and c.endswith("_id") or (filled and len(cnt) > 0.9 * len(filled)):
            role = "id" if c in (None, "incident_id", "survey_id") else "text"
        elif len(cnt) <= 60:
            role = "category"
        if c == "sla_name":
            prefixes = Counter(v.split(" - ")[0].strip() for v in filled)
            info["prefixes"] = dict(prefixes.most_common(10))
        top = [(mask(v) if pii != "keep" else v, n) for v, n in cnt.most_common(6)] if role in ("category", "flag", "text", "score") else []
        dup = (len(filled) - len(cnt)) if c == "incident_id" else None
        cols.append({"column": h, "role": role, "concept": c, "meaning": meaning, "fill": len(filled) / (len(vals) or 1),
                     "distinct": len(cnt), "top": top, "info": info, "pii": pii, "pii_why": why_pii, "duplicates": dup})
    return {"file": os.path.basename(path), "rows": len(rows), "delimiter": delim, "encoding": enc, "columns": cols}

def suggestions(p):
    out = []
    dates = [c for c in p["columns"] if c["role"] == "date"]
    month_col = next((c for c in dates if c["concept"] in ("resolved_date", "survey_date")), dates[0] if dates else None)
    for c in p["columns"]:
        if c["role"] == "flag" and c["info"].get("positive"):
            out.append(f"rate KPI: share of {c['info']['positive']} in “{c['column']}” per month of “{month_col['column'] if month_col else '?'}”"
                       + (f" (exclude {c['info']['other']}?)" if c['info'].get('other') else ""))
        if c["role"] == "score":
            out.append(f"mean KPI: average “{c['column']}” per month (scale {c['info'].get('scale_hint')})")
        if c["concept"] == "sla_name" and c["info"].get("prefixes"):
            out.append(f"filter: “{c['column']}” starts with one of {list(c['info']['prefixes'])[:5]} — confirm which SLAs count")
        if c["concept"] == "assigned_group":
            out.append(f"breakdown: “{c['column']}” ({c['distinct']} values) — where misses concentrate")
    return out

def md(profiles):
    L = ["# Data profile", "", "What is in each file and what it means for KPI reporting. Personal-looking columns show masked values only.", ""]
    for p in profiles:
        L += [f"## {p['file']}", "", f"{p['rows']:,} rows · delimiter `{p['delimiter']}` · encoding {p['encoding']}", "",
              "| Column | Role | ITSM meaning | Filled | Distinct | Top values / range | Privacy |", "|---|---|---|---|---|---|---|"]
        for c in p["columns"]:
            if c["role"] == "date":
                i = c["info"]; rng = f"{i.get('first')} → {i.get('last')} ({len(i.get('months', {}))} months, {i.get('order')}{'; ' + i['warning'] if i.get('warning') else ''})"
            elif c["role"] in ("score", "number"):
                i = c["info"]; rng = f"{i['min']:g}–{i['max']:g}, mean {i['mean']:.2f}" + (f"; scale {i['scale_hint']}" if i.get("scale_hint") else "")
            else:
                rng = ", ".join(f"{v} ({n})" for v, n in c["top"][:5])
            if c.get("duplicates"): rng += f" · ⚠ {c['duplicates']} duplicate IDs"
            meaning = (f"**{c['concept']}** — {c['meaning']}" if c["concept"] else "—")
            L.append(f"| {c['column']} | {c['role']} | {meaning} | {c['fill']:.0%} | {c['distinct']} | {rng} | {c['pii']} |")
        dates = [c for c in p["columns"] if c["role"] == "date"]
        if dates:
            d = next((c for c in dates if c["concept"] in ("resolved_date", "survey_date")), dates[0])
            L += ["", f"Rows per month by “{d['column']}”: " + ", ".join(f"{m} {n}" for m, n in d["info"]["months"].items())]
            thin = [m for m, n in d["info"]["months"].items() if n < 10]
            if thin: L.append(f"⚠ Low volume months (< 10 rows): {', '.join(thin)}")
        s = suggestions(p)
        if s: L += ["", "**What this file can feed:**"] + [f"- {x}" for x in s]
        L.append("")
    L += ["## Confirm before building", "- Which date column assigns a record to a month (resolved vs submitted vs survey)?",
          "- Which values count as success (e.g. Met / Yes) and are any values excluded (In Process, Pending, N/A)?",
          "- Which rows are in scope (e.g. SLA name starts with “Service Desk”; priorities; groups)?",
          "- Score scale and conversion (e.g. 1–10 ÷ 2 → 1–5) and target.", ""]
    return "\n".join(L)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", default="profile.md")
    ap.add_argument("--json")
    a = ap.parse_args()
    profiles = [profile_file(f) for f in a.files]
    text = md(profiles)
    open(a.out, "w", encoding="utf-8").write(text)
    if a.json: json.dump(profiles, open(a.json, "w", encoding="utf-8"), indent=1, ensure_ascii=False, default=str)
    print(text)

if __name__ == "__main__":
    main()
