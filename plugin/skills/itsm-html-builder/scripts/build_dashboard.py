#!/usr/bin/env python3
"""Build a single-file, offline, interactive KPI dashboard from CSV exports + a spec (JSON).

The numbers are computed HERE (Python) and again in the browser (JavaScript in the template).
The dashboard shows a "numbers consistent" badge only when both agree. The LLM never types a KPI value.

Usage:
  python build_dashboard.py --spec spec.json [--data DIR] [--out dashboard.html] [--results kpi_results.json]
                            [--no-embed]   # spec-only HTML: the user drops the CSV files into the page
Standard library only (Python 3.8+).
"""
import argparse, csv, difflib, io, json, os, re, sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.normpath(os.path.join(HERE, "..", "templates", "dashboard.html"))

# ---------------------------------------------------------------- reading
def read_csv(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc); break
        except UnicodeDecodeError:
            continue
    sample = text[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delim = dialect.delimiter
    except csv.Error:
        delim = ","
    rows = list(csv.reader(io.StringIO(text), delimiter=delim))
    rows = [r for r in rows if any(c.strip() for c in r)]
    if not rows:
        raise SystemExit(f"Empty file: {path}")
    header = [h.strip() for h in rows[0]]
    return header, rows[1:]

# ---------------------------------------------------------------- dates
ISO = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})")
SLASH = re.compile(r"^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})")

def detect_order(values):
    """Return 'ISO', 'DMY' or 'MDY' and a warning (or None)."""
    a_gt12 = b_gt12 = 0; iso = slash = 0
    for v in values[:5000]:
        v = (v or "").strip()
        if ISO.match(v): iso += 1; continue
        m = SLASH.match(v)
        if m:
            slash += 1
            if int(m.group(1)) > 12: a_gt12 += 1
            if int(m.group(2)) > 12: b_gt12 += 1
    if iso >= slash: return "ISO", None
    if a_gt12 and not b_gt12: return "DMY", None
    if b_gt12 and not a_gt12: return "MDY", None
    return "DMY", "Date order is ambiguous (no day > 12 found); assumed DD/MM/YYYY."

def month_of(v, order):
    v = (v or "").strip()
    m = ISO.match(v)
    if m: y, mo = int(m.group(1)), int(m.group(2))
    else:
        m = SLASH.match(v)
        if not m: return None
        a, b, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100: y += 2000
        mo = b if order in ("DMY", "ISO") else a
    if not 1 <= mo <= 12: return None
    return f"{y:04d}-{mo:02d}"

# ---------------------------------------------------------------- filters
def norm(s): return (s or "").strip().lower()

def match(val, f):
    op, target = f.get("op", "equals"), f.get("value")
    v = norm(val)
    tl = [norm(t) for t in target] if isinstance(target, list) else [norm(target)]
    if op == "equals": return v == tl[0]
    if op == "notEquals": return v != tl[0]
    if op == "in": return v in tl
    if op == "notIn": return v not in tl
    if op == "startsWith": return any(v.startswith(t) for t in tl)
    if op == "contains": return any(t in v for t in tl)
    if op == "notEmpty": return v != ""
    raise SystemExit(f"Unknown filter op '{op}'")

def num(v):
    v = (v or "").strip().replace(" ", "")
    if not v: return None
    if v.count(",") == 1 and "." not in v: v = v.replace(",", ".")
    try: return float(v)
    except ValueError: return None

# ---------------------------------------------------------------- core
def col_index(header, name, where):
    if name in header: return header.index(name)
    low = [h.lower() for h in header]
    if name.lower() in low: return low.index(name.lower())
    hint = difflib.get_close_matches(name, header, n=3, cutoff=0.5)
    raise SystemExit(f"Column '{name}' not found in {where}. Available: {header}." + (f" Did you mean {hint}?" if hint else ""))

def needed_columns(spec, sid):
    s = spec["sources"][sid]
    cols = [s["id"], s["date"]] if s.get("id") else [s["date"]]
    cols += [f["column"] for f in s.get("filters", [])]
    for k in spec["kpis"]:
        if k["source"] != sid: continue
        if k.get("column"): cols.append(k["column"])
        cols += [f["column"] for f in k.get("where", [])]
    cols += s.get("detailColumns", [])
    cols += [g.get("columns", {}).get(sid) for g in spec.get("globalFilters", []) if g.get("columns", {}).get(sid)]
    if s.get("breakdown"): cols.append(s["breakdown"])
    out = []
    for c in cols:
        if c and c not in out: out.append(c)
    return out

def load_sources(spec, data_dir):
    data, notes = {}, []
    for sid, s in spec["sources"].items():
        path = os.path.join(data_dir, s["file"])
        if not os.path.exists(path):
            raise SystemExit(f"Missing file for source '{sid}': {path}")
        header, rows = read_csv(path)
        cols = needed_columns(spec, sid)
        idx = [col_index(header, c, s["file"]) for c in cols]
        slim = [[(r[i] if i < len(r) else "") for i in idx] for r in rows]
        order = s.get("dateFormat", "auto")
        di = cols.index(s["date"])
        if order == "auto":
            order, warn = detect_order([r[di] for r in slim])
            if warn: notes.append(f"{s['file']}: {warn}")
        data[sid] = {"columns": cols, "rows": slim, "dateOrder": order, "file": s["file"], "total": len(rows)}
    return data, notes

def compute(spec, data):
    res, months_all, notes = {}, set(), []
    for sid, d in data.items():
        s = spec["sources"][sid]; cols = d["columns"]
        fi = [(cols.index(f["column"]), f) for f in s.get("filters", [])]
        di = cols.index(s["date"])
        kept, bad_date = [], 0
        for r in d["rows"]:
            if not all(match(r[i], f) for i, f in fi): continue
            m = month_of(r[di], d["dateOrder"])
            if m is None: bad_date += 1; continue
            kept.append((m, r))
        d["kept"] = len(kept)
        if bad_date: notes.append(f"{d['file']}: {bad_date} rows skipped (date '{s['date']}' empty or unreadable).")
        d["_kept"] = kept
    for k in spec["kpis"]:
        d = data[k["source"]]; cols = d["columns"]
        wi = [(cols.index(f["column"]), f) for f in k.get("where", [])]
        ci = cols.index(k["column"]) if k.get("column") else None
        pos = [norm(x) for x in k.get("positive", [])]
        neg = [norm(x) for x in k.get("negative", [])] if k.get("negative") else None
        per = {}
        excluded = 0
        for m, r in d["_kept"]:
            if not all(match(r[i], f) for i, f in wi): continue
            b = per.setdefault(m, {"num": 0, "den": 0, "sum": 0.0, "n": 0})
            if k["type"] == "rate":
                v = norm(r[ci])
                if v in pos: b["num"] += 1; b["den"] += 1
                elif neg is None or v in neg: b["den"] += 1
                else: excluded += 1
            elif k["type"] == "mean":
                x = num(r[ci])
                if x is None: excluded += 1; continue
                b["sum"] += x / float(k.get("divide", 1)); b["n"] += 1
            elif k["type"] == "count":
                b["n"] += 1
        out = {}
        for m, b in sorted(per.items()):
            if k["type"] == "rate":
                if b["den"] == 0: continue
                out[m] = {"value": b["num"] / b["den"] * 100, "num": b["num"], "den": b["den"], "missed": b["den"] - b["num"], "count": b["den"]}
            elif k["type"] == "mean":
                if b["n"] == 0: continue
                out[m] = {"value": b["sum"] / b["n"], "count": b["n"]}
            else:
                out[m] = {"value": b["n"], "count": b["n"]}
            months_all.add(m)
        if excluded: notes.append(f"KPI {k['id']}: {excluded} rows excluded (value not in positive/negative lists or not numeric).")
        res[k["id"]] = out
    for d in data.values(): d.pop("_kept", None)
    return {"months": sorted(months_all), "kpis": res, "notes": notes}

def status(k, v):
    t = k.get("target")
    if t is None or v is None: return "neutral"
    margin = 0.1 if k.get("type") == "mean" else 2.0
    higher = k.get("direction", "higher") == "higher"
    gap = (v - t) if higher else (t - v)
    if gap < 0: return "critical"
    if gap < margin: return "warning"
    return "met"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--data", help="folder with the CSV files (default: folder of the spec)")
    ap.add_argument("--out", default=None)
    ap.add_argument("--results", default=None)
    ap.add_argument("--no-embed", action="store_true")
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(a.spec))
    data_dir = a.data or base
    out = a.out or os.path.join(base, "dashboard.html")
    res_path = a.results or os.path.join(base, "kpi_results.json")

    data, notes = load_sources(spec, data_dir)
    results = compute(spec, data)
    results["notes"] = notes + results["notes"]
    results["generated"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    results["rows"] = {sid: {"file": d["file"], "total": d["total"], "kept": d["kept"], "dateOrder": d["dateOrder"]} for sid, d in data.items()}
    latest = results["months"][-1] if results["months"] else None
    results["latest"] = latest
    results["status"] = {k["id"]: status(k, results["kpis"][k["id"]].get(latest, {}).get("value")) for k in spec["kpis"]}

    tpl = open(TEMPLATE, encoding="utf-8").read()
    def js(o): return json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    embed = None if a.no_embed else {sid: {"columns": d["columns"], "rows": d["rows"], "dateOrder": d["dateOrder"], "file": d["file"], "total": d["total"]} for sid, d in data.items()}
    html = (tpl.replace("/*__SPEC__*/null", js(spec))
               .replace("/*__DATA__*/null", js(embed) if embed else "null")
               .replace("/*__RESULTS__*/null", js({"months": results["months"], "kpis": results["kpis"]}) if embed else "null")
               .replace("__TITLE__", spec.get("title", "KPI dashboard")))
    open(out, "w", encoding="utf-8").write(html)
    json.dump(results, open(res_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"Dashboard: {out} ({len(html)//1024} KB)")
    print(f"Results:   {res_path}")
    for sid, r in results["rows"].items():
        print(f"  source {sid}: {r['file']} rows={r['total']} kept_after_filters={r['kept']} dates={r['dateOrder']}")
    if latest:
        print(f"Latest month {latest}:")
        for k in spec["kpis"]:
            v = results["kpis"][k["id"]].get(latest)
            if v: print(f"  {k['id']:<10} {v['value']:.{k.get('decimals',1)}f} {k.get('unit','')}  (n={v['count']})  status={results['status'][k['id']]}")
    for n in results["notes"]: print("NOTE:", n)

if __name__ == "__main__":
    main()
