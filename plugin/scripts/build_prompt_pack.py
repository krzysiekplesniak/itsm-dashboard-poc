#!/usr/bin/env python3
"""Build a prompt pack for chats that cannot load skills (e.g. a plain M365 Copilot or ChatGPT-style chat):
ITSM_KNOWLEDGE.md (all skill instructions + references in one file) and PROMPT.md (the one prompt to paste).
Usage: python scripts/build_prompt_pack.py [--out prompt-pack]
"""
import argparse, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["itsm-dashboard", "itsm-domain", "itsm-data-reader", "itsm-anonymize", "itsm-kpi-analyzer", "itsm-design-reference",
         "itsm-dashboard-design", "itsm-html-builder", "itsm-insights", "itsm-verify", "itsm-grill-me", "itsm-learn", "itsm-intent-router", "itsm-brief", "itsm-ui-design"]
ap = argparse.ArgumentParser(); ap.add_argument("--out", default=os.path.join(ROOT, "prompt-pack")); a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
parts = ["# ITSM Dashboard Kit — knowledge pack\n\nAll instructions of the kit in one file, for chats without skill support. "
         "Scripts cannot run in such chats: produce spec.json and let the dashboard template compute the numbers.\n"]
for s in ORDER:
    d = os.path.join(ROOT, "skills", s)
    body = open(os.path.join(d, "SKILL.md"), encoding="utf-8").read()
    body = re.sub(r"^---.*?---\n", "", body, flags=re.S)
    parts.append(f"\n\n---\n\n<!-- skill: {s} -->\n" + body.strip())
    ref = os.path.join(d, "references")
    if os.path.isdir(ref):
        for f in sorted(os.listdir(ref)):
            parts.append(f"\n\n<!-- {s}/references/{f} -->\n" + open(os.path.join(ref, f), encoding="utf-8").read().strip())
open(os.path.join(a.out, "ITSM_KNOWLEDGE.md"), "w", encoding="utf-8").write("\n".join(parts) + "\n")
print("written", os.path.join(a.out, "ITSM_KNOWLEDGE.md"))
