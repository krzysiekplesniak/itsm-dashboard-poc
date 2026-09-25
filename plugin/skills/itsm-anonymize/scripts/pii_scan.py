#!/usr/bin/env python3
"""Scan CSV files for personal data BEFORE any analysis. Classifies every column by name and content:
  drop   - certainly personal or free text (names, e-mails, phones, descriptions, notes)
  hash   - identifies a person but is needed for counting (login, assignee, agent)
  review - uncertain: many values look like person names / host names / contact data -> ON HOLD
  keep   - operational (IDs, dates, priority, group, status, SLA, score ...)
Optionally writes anonymised copies (drop + hash; 'review' columns are dropped unless --keep given).

Usage:
  python pii_scan.py FILE.csv [FILE2.csv ...] [--out-dir anonymised/] [--keep COL ...] [--hash COL ...]
                     [--drop COL ...] [--report pii_report.md]
Standard library only. Never prints raw values of personal columns - examples are masked.
"""
import argparse, csv, hashlib, io, os, re, sys

NAME_DROP = re.compile(r"(^|[\s_])(first|last|full)?\s*name$|e-?mail|phone|mobile|address|requester|customer(?!.*(id|satisfaction))|contact|caller|"
                       r"summary|description|notes?$|work\s*log|resolution\s*(text|notes?)|comment|details|ip\s*address|hostname|iban|birth", re.I)
NAME_HASH = re.compile(r"login|user\s*id|assignee|owner|agent|technician|submitter|resolved\s*by|last\s*modified\s*by|created\s*by|analyst", re.I)
NAME_KEEP = re.compile(r"(incident|ticket|request|survey|change)\s*(id|number|no)|^id$|date|time|priority|group|status|sla|slm|score|rating|"
                       r"category|service|source|channel|site|impact|urgency|met\??$|fcr|count|duration|month|year|type|queue", re.I)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"^\+?[\d\s()./-]{8,}$")
IPV4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
IBAN = re.compile(r"^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$")
PERSON = re.compile(r"^[A-ZÀ-Ž][a-zà-ž'’-]+(\s+[A-ZÀ-Ž][a-zà-ž'’-]+){1,2}$|^[A-ZÀ-Ž][A-ZÀ-Ž'’-]+,?\s+[A-ZÀ-Ž][a-zà-ž'’-]+$")
HOST = re.compile(r"^[A-Za-z]{2,}[-_]?[A-Za-z]*\d{2,}[A-Za-z0-9-]*$")
DATE = re.compile(r"^\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}")

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
    return [h.strip() for h in rows[0]], rows[1:], delim

def mask(v):
    v = str(v)
    out = []
    for w in re.split(r"(\s+|@|\.)", v):
        if not w.strip() or w in "@.":
            out.append(w)
        elif w.isdigit():
            out.append("#" * len(w))
        else:
            out.append(w[0] + "•" * (len(w) - 1))
    return "".join(out)[:40]

def classify(name, values):
    vals = [v.strip() for v in values if v and v.strip()][:1000]
    n = len(vals) or 1
    share = lambda rx: sum(1 for v in vals if rx.search(v)) / n
    avg_len = sum(len(v) for v in vals) / n if vals else 0
    distinct = len(set(vals))
    if NAME_DROP.search(name) and not NAME_KEEP.search(name.replace("Name", "")) and not re.search(r"sla|slm|service|group", name, re.I):
        return "drop", "column name suggests personal data or free text"
    if share(EMAIL) >= 0.2: return "drop", "contains e-mail addresses"
    if sum(1 for v in vals if PHONE.match(v) and not DATE.match(v)) / n >= 0.2: return "drop", "contains phone numbers"
    if share(IPV4) >= 0.2 or share(IBAN) >= 0.2: return "drop", "contains IP addresses or bank accounts"
    if avg_len > 60 and distinct > 0.5 * n: return "drop", "long free text (may contain names)"
    if NAME_HASH.search(name): return "hash", "identifies a person (needed only for counting)"
    if NAME_KEEP.search(name):
        if share(PERSON) >= 0.4: return "review", "operational name, but values look like person names"
        return "keep", "operational field"
    if share(PERSON) >= 0.4: return "review", "values look like person names"
    if share(HOST) >= 0.4: return "review", "values look like host names"
    if share(EMAIL) > 0 or share(PHONE) > 0.05: return "review", "some values look like contact data"
    if vals and avg_len > 25 and distinct > 0.3 * n: return "review", "unknown text column"
    return "keep", "no personal pattern found"

def scan(path):
    header, rows, delim = read(path)
    result = []
    for i, h in enumerate(header):
        col = [r[i] if i < len(r) else "" for r in rows]
        cls, why = classify(h, col)
        sample = [mask(v) for v in list(dict.fromkeys(v for v in col if v.strip()))[:3]] if cls != "keep" else []
        result.append({"column": h, "class": cls, "why": why, "examples": sample})
    return header, rows, delim, result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out-dir")
    ap.add_argument("--keep", nargs="*", default=[])
    ap.add_argument("--hash", nargs="*", default=[])
    ap.add_argument("--drop", nargs="*", default=[])
    ap.add_argument("--salt", default="itsm-kit")
    ap.add_argument("--report", default="pii_report.md")
    a = ap.parse_args()
    lines = ["# Personal data scan", "", "Classes: **drop** (removed) · **hash** (replaced by `anon_xxxxxxxx`) · **review** (ON HOLD until the user decides; dropped by default) · **keep**.", ""]
    held_total = 0
    for f in a.files:
        header, rows, delim, res = scan(f)
        lines += [f"## {os.path.basename(f)} ({len(rows)} rows)", "", "| Column | Class | Why | Masked examples |", "|---|---|---|---|"]
        for r in res:
            c = r["column"]
            if c in a.keep: r["class"], r["why"] = "keep", "user decision"
            if c in a.hash: r["class"], r["why"] = "hash", "user decision"
            if c in a.drop: r["class"], r["why"] = "drop", "user decision"
            if r["class"] == "review": held_total += 1
            lines.append(f"| {c} | **{r['class']}** | {r['why']} | {', '.join('`'+e+'`' for e in r['examples'])} |")
        lines.append("")
        if a.out_dir:
            os.makedirs(a.out_dir, exist_ok=True)
            keep_idx = [i for i, r in enumerate(res) if r["class"] in ("keep", "hash")]
            hash_idx = {i for i, r in enumerate(res) if r["class"] == "hash"}
            out = os.path.join(a.out_dir, os.path.basename(f))
            with open(out, "w", newline="", encoding="utf-8") as fh:
                w = csv.writer(fh)
                w.writerow([header[i] for i in keep_idx])
                for row in rows:
                    cells = []
                    for i in keep_idx:
                        v = row[i] if i < len(row) else ""
                        if i in hash_idx and v.strip():
                            v = "anon_" + hashlib.sha256((a.salt + v.strip().lower()).encode()).hexdigest()[:8]
                        cells.append(v)
                    w.writerow(cells)
            lines.append(f"Anonymised copy: `{out}` (dropped: {', '.join(r['column'] for r in res if r['class'] in ('drop','review')) or 'none'})")
            lines.append("")
    if held_total:
        lines.append(f"**{held_total} column(s) ON HOLD.** Ask the user per column: keep / hash / drop (default drop). Never show raw values.")
    open(a.report, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
