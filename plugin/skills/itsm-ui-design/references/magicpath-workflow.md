# MagicPath workflow (CLI `magicpath-ai`) for the ITSM dashboard

**Local = workshop, MagicPath = showcase.** MagicPath is where the user sees and approves the look (clickable
prototype, canvas for exploring variants, share link). Code iterations happen locally; submit to MagicPath at milestones.
Pure MagicPath without these skills = a sketchbook for inspiration only, never the final screen (it does not know the rules or tokens).

## First steps
```bash
npx -y magicpath-ai info -o json            # auth + context
npx -y magicpath-ai login                   # browser login — the USER signs in
npx -y magicpath-ai whoami -o json
npx -y magicpath-ai list-projects -o json   # find or create the project
npx -y magicpath-ai create-project --name "ITSM Dashboard" -o json
```
Before generating anything: read/build the prototype catalogue `docs/prototypes/KATALOG-MAGICPATH.md`
(`list-components <projectId> -o json --sort-by createdAt --order desc`) and add an entry after every new prototype
(descriptive name, generatedName, date, group, which variant became canon).

## Theme = our tokens
`list-themes` usually returns only public defaults. Do NOT use MagicPath's grey scaffold: copy our tokens
(`tokens.md`) into the canvas component's `src/index.css` `:root` before writing the component.

## Author a canvas component (mockup of the dashboard on realistic data)
```bash
npx -y magicpath-ai code start --project <projectId> --dir ./mp-work --name "ITSM dashboard — monthly" --width 1440 --height 900 -o json
# edit only: src/App.tsx (theme), src/index.css (tokens), src/components/generated/**, assets/**
npx -y magicpath-ai code submit --dir ./mp-work --wait -o json      # status must be "completed"
npx -y magicpath-ai share <projectId> -o json                        # link for the user
```
Design defaults on the canvas: no device mockups, responsive, centered, fully interactive (state, hover, focus).
Mobile variant: `--width 430 --height 932`. Every edit = a fresh `code start` (working dirs are stale after submit).
Batch edits into one submit (30–60 s round trip). Read-only export: `code context <componentId> --dir ./mp-read -o json`.

## From MagicPath back into the kit (parity)
1. Lock the approved revision (`selection -o json` → `selectedRevisionId`).
2. `inspect <generatedName> -o json` — read the source; translate layout, spacing, type and tokens into
   `dashboard.html` (vanilla JS/CSS — do not add React to the single-file dashboard) or `app/web/`.
3. Parity check: screenshots at 430/1280 side by side with the approved revision; DOM/runtime evidence before changes;
   record intentional deviations. Visual parity ≠ workflow regression — `npm test` covers the flows.
4. Numbers: run the tests — the design never touches computation.
