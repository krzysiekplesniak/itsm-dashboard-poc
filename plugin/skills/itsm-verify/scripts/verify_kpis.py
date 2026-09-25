#!/usr/bin/env python3
"""Independent re-count of every KPI in a dashboard spec, written separately from the build script
(csv.DictReader + datetime.strptime instead of regex parsing), then compared with kpi_results.json
and, optionally, with an external reference (e.g. last month's official report).

Usage:
  python verify_kpis.py --spec spec.json --results kpi_results.json [--data DIR]
                        [--reference reference.csv] [--tolerance 0.1] [--out verify.md]
reference.csv columns: kpi,month,value   (month = YYYY-MM; value in the KPI unit)
Exit code 0 = all match, 1 = at least one mismatch.
"""
import argparse, csv, json, os, sys
from collections import defaultdict
from datetime import datetime

FORMATS = {
    "ISO": ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"],
    "DMY": ["%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y", "%d.%m.%Y %H:%M", "%d.%m.%Y", "%d-%m-%Y %H:%M", "%d-%m-%Y", "%d/%m/%y %H:%M", "%d/%m/%y"],
    "MDY": ["%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M %p", "%m/%d/%Y", "%m/%d/%y"],
}

def to_month(value, order):
    v = (value or "").strip()
    if not v:
        return None
    v = v.split(".")[0] if order == "ISO" and "T" in v and "." in v else v
    for fmt in FORMATS.get(order, []) + FORMATS["ISO"]:
        try:
            d = datetime.strptime(v, fmt)
            return f"{d.year:04d}-{d.month:02d}"
        except ValueError:
            continue
    return None

def ok(value, flt):
    v = (value or "").strip().casefold()
    target = flt.get("value")
    items = [str(t).strip().casefold() for t in (target if isinstance(target, list) else [target])]
    op = flt.get("op", "equals")
    return {
        "equals": lambda: v == items[0], "notEquals": lambda: v != items[0],
        "in": lambda: v in items, "notIn": lambda: v not in items,
        "startsWith": lambda: any(v.startswith(i) for i in items),
        "contains": lambda: any(i in v for i in items), "notEmpty": lambda: v != "",
    }[op]()

def open_rows(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc); break
        except UnicodeDecodeError:
            pass
    first = text.split("\n", 1)[0]
    delim = max([",", ";", "\t", "|"], key=first.count)
    rows = csv.DictReader(text.splitlines(), delimiter=delim)
    rows.fieldnames = [f.strip() for f in rows.fieldnames]
    return [r for r in rows if any((x or "").strip() for x in r.values())]

def recount(spec, data_dir, orders):
    out = {}
    cache = {}
    for k in spec["kpis"]:
        s = spec["sources"][k["source"]]
        if k["source"] not in cache:
            cache[k["source"]] = open_rows(os.path.join(data_dir, s["file"]))
        rows = cache[k["source"]]
        order = orders.get(k["source"], s.get("dateFormat", "DMY"))
        agg = defaultdict(lambda: [0, 0, 0.0])  # positive, total, sum
        positive = {p.strip().casefold() for p in k.get("positive", [])}
        negative = {p.strip().casefold() for p in k["negative"]} if k.get("negative") else None
        for r in rows:
            if not all(ok(r.get(f["column"]), f) for f in s.get("filters", [])):
                continue
            m = to_month(r.get(s["date"]), order)
            if m is None:
                continue
            if not all(ok(r.get(f["column"]), f) for f in k.get("where", [])):
                continue
            val = (r.get(k.get("column")) or "").strip()
            a = agg[m]
            if k["type"] == "rate":
                cf = val.casefold()
                if cf in positive:
                    a[0] += 1; a[1] += 1
                elif negative is None or cf in negative:
                    a[1] += 1
            elif k["type"] == "mean":
                try:
                    x = float(val.replace(",", ".")) if val else None
                except ValueError:
                    x = None
                if x is not None:
                    a[1] += 1; a[2] += x / float(k.get("divide", 1))
            else:
                a[1] += 1
        res = {}
        for m, (p, t, sm) in agg.items():
            if t == 0:
                continue
            if k["type"] == "rate":
                res[m] = (p / t * 100, t)
            elif k["type"] == "mean":
                res[m] = (sm / t, t)
            else:
                res[m] = (t, t)
        out[k["id"]] = res
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--results", required=True)
    ap.add_argument("--data")
    ap.add_argument("--reference")
    ap.add_argument("--tolerance", type=float, default=0.1, help="allowed difference vs the external reference")
    ap.add_argument("--out")
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding="utf-8"))
    built = json.load(open(a.results, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(a.spec))
    data_dir = a.data or base
    orders = {sid: r.get("dateOrder", "DMY") for sid, r in built.get("rows", {}).items()}
    mine = recount(spec, data_dir, orders)

    lines = ["# Verification of dashboard numbers", "",
             f"Spec: `{os.path.basename(a.spec)}` · results: `{os.path.basename(a.results)}` · generated {built.get('generated', '?')}", "",
             "Two independent implementations computed every KPI for every month. ✓ = same value and same record count.", "",
             "| KPI | Month | Dashboard | Re-count | Records (dash / re-count) | Match |", "|---|---|---|---|---|---|"]
    bad = checks = 0
    for k in spec["kpis"]:
        d = built["kpis"].get(k["id"], {})
        mm = mine.get(k["id"], {})
        for m in sorted(set(d) | set(mm)):
            checks += 1
            dv, dc = (d[m]["value"], d[m]["count"]) if m in d else (None, None)
            mv, mc = mm.get(m, (None, None))
            match = dv is not None and mv is not None and abs(dv - mv) < 1e-9 and dc == mc
            bad += 0 if match else 1
            dec = k.get("decimals", 1)
            f = lambda x: "—" if x is None else f"{x:.{dec}f}"
            lines.append(f"| {k['label']} | {m} | {f(dv)} | {f(mv)} | {dc} / {mc} | {'✓' if match else '✗'} |")
    lines += ["", f"**Result: {checks - bad} of {checks} checks match.**" + ("" if not bad else " ✗ Do not present the dashboard until every mismatch is explained.")]

    if a.reference:
        lines += ["", "## Comparison with the external reference", "", f"Tolerance: ±{a.tolerance}", "",
                  "| KPI | Month | Dashboard | Reference | Difference | Within tolerance |", "|---|---|---|---|---|---|"]
        for r in csv.DictReader(open(a.reference, encoding="utf-8-sig")):
            kid, m = r["kpi"].strip(), r["month"].strip()
            ref = float(r["value"].replace(",", "."))
            v = built["kpis"].get(kid, {}).get(m, {}).get("value")
            if v is None:
                lines.append(f"| {kid} | {m} | — | {ref} | — | ✗ (no dashboard value) |"); bad += 1; continue
            diff = v - ref
            within = abs(diff) <= a.tolerance
            bad += 0 if within else 1
            lines.append(f"| {kid} | {m} | {v:.2f} | {ref:.2f} | {diff:+.2f} | {'✓' if within else '✗'} |")
        lines += ["", "Typical reasons for differences: different snapshot date, month assigned by another date column, rows excluded by a filter, rounding in the reference."]

    text = "\n".join(lines) + "\n"
    out = a.out or os.path.join(base, "verify.md")
    open(out, "w", encoding="utf-8").write(text)
    print(f"All checks OK ({checks} values{', reference within tolerance' if a.reference else ''}) -> {out}" if not bad else f"MISMATCHES: {bad} -> {out}")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
