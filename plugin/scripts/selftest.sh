#!/usr/bin/env bash
# Self-test on synthetic data: anonymise → profile → build → verify. Exit 0 = all good.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; W="$(mktemp -d)"; D="$ROOT/examples/mock-3csv"
python3 "$ROOT/skills/itsm-anonymize/scripts/pii_scan.py" "$D"/*.csv --out-dir "$W/data" --report "$W/pii_report.md" > /dev/null
python3 "$ROOT/skills/itsm-data-reader/scripts/profile_csv.py" "$W"/data/*.csv --out "$W/profile.md" > /dev/null
python3 "$ROOT/skills/itsm-html-builder/scripts/build_dashboard.py" --spec "$D/spec.json" --data "$W/data" --out "$W/dashboard.html" --results "$W/kpi_results.json"
python3 "$ROOT/skills/itsm-verify/scripts/verify_kpis.py" --spec "$D/spec.json" --results "$W/kpi_results.json" --data "$W/data" --out "$W/verify.md"
echo "Self-test OK. Output in $W"
