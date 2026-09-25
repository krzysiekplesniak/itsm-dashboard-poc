# Measurement methods (each replaced a naive method that lied)

1. **Contrast by canvas, not getComputedStyle** — `oklch()`/semi-transparent backgrounds are not parsed reliably.
   Resolve colours by painting on a 1×1 canvas (`fillStyle` → `getImageData`), composite the background chain on
   white, compute WCAG luminance; thresholds 4.5 (text) / 3.0 (large text ≥ 24 px or ≥ 18.66 px bold, UI, focus ring).
2. **Focus with a real Tab key**, not `.focus()` (`:focus-visible` only reacts to keyboard) — Playwright
   `page.keyboard.press('Tab')`, then read `document.activeElement` and measure the ring against the element background.
3. **Touch targets with getBoundingClientRect** on the clickable element itself (≥ 44×44).
4. **Automatic audits scoped to the component** — on a MagicPath host the page adds its own chrome
   ("Made with MagicPath", remix, cookies); findings outside the component subtree are host noise. Full Lighthouse only
   on our own deploy (localhost / Pages / Codespaces).
5. **Accessible names**: `aria-label || title || innerText` non-empty on every interactive element.
6. **Click-through**: walk real paths (card → details → back; filter → values → clear) after every navigation change.
7. **Screenshots at ~430 px and ~1280 px**; compare with the approved mockup; proportions from bounding boxes.
8. **Numbers unchanged**: `cd app && npm test` and `bash plugin/scripts/selftest.sh` green before and after a redesign.
