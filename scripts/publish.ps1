# Publish the PoC on GitHub infrastructure (run on your laptop, PowerShell, in this folder).
#   - public repo  → GitHub Pages site (https://<you>.github.io/<repo>/) + Codespaces for the agent
#   - private repo → Codespaces only (Pages on private repos needs a paid plan)
# Needs: git, GitHub CLI (winget install --id GitHub.cli). You log in yourself in the browser.
param([string]$Repo = "itsm-dashboard-poc", [ValidateSet("public","private")][string]$Visibility = "public")
$ErrorActionPreference = "Stop"
gh auth status 2>$null; if ($LASTEXITCODE -ne 0) { gh auth login --web --scopes "repo,workflow,codespace" }
node scripts/check-public.mjs; if ($LASTEXITCODE -ne 0 -and $Visibility -eq "public") { throw "Protected names found - fix before publishing publicly." }
if (-not (Test-Path .git)) { git init -b main; git add -A; git commit -m "ITSM Dashboard PoC v0.3: agent on GitHub Copilot + plugin (shared engine and skills)" }
gh repo create $Repo --$Visibility --source . --push
$owner = gh api user --jq .login
if ($Visibility -eq "public") { gh api -X POST "repos/$owner/$Repo/pages" -f build_type=workflow 2>$null; gh workflow run pages.yml -R "$owner/$Repo" }
Write-Host "`nRepository : https://github.com/$owner/$Repo"
if ($Visibility -eq "public") { Write-Host "Pages      : https://$owner.github.io/$Repo/  (ready in ~1-2 min)" }
Write-Host "Codespaces : https://codespaces.new/$owner/$Repo?quickstart=1   (then: copilot login ; cd app ; npm start)"
