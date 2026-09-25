#!/usr/bin/env bash
# Same as publish.ps1 for macOS/Linux/Codespaces. Usage: bash scripts/publish.sh [repo-name] [public|private]
set -e; REPO=${1:-itsm-dashboard-poc}; VIS=${2:-public}
gh auth status >/dev/null 2>&1 || gh auth login --web --scopes "repo,workflow,codespace"
node scripts/check-public.mjs || [ "$VIS" = private ]
[ -d .git ] || { git init -b main; git add -A; git commit -m "ITSM Dashboard PoC v0.3: agent on GitHub Copilot + plugin (shared engine and skills)"; }
gh repo create "$REPO" --"$VIS" --source . --push
OWNER=$(gh api user --jq .login)
[ "$VIS" = public ] && { gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true; gh workflow run pages.yml -R "$OWNER/$REPO" || true; echo "Pages: https://$OWNER.github.io/$REPO/"; }
echo "Repository: https://github.com/$OWNER/$REPO"; echo "Codespaces: https://codespaces.new/$OWNER/$REPO?quickstart=1"
