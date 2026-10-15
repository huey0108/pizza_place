# Zofia's Pizzeria

A browser game where you run a tiny pizza shop one day at a time. Built with **Phaser + Vite** following `Pizza Shop Game — Build Spec.md`.

## Play locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Tests

```bash
npm test             # Vitest unit tests (rules layer)
npm run simulate     # balance simulator (CSV + console summary)
npm run e2e          # Playwright browser smoke test (installs Chromium first)
```

Install Playwright browsers once: `npx playwright install chromium`.

## Deploy to GitHub Pages

The repo includes `.github/workflows/deploy.yml`.

1. Create a GitHub repo (public — free Pages requires it).
2. Push: see "First push" below.
3. In **Settings → Pages**, set source to **GitHub Actions**.
4. Push to `main`; the live link appears in the Actions summary within a couple of minutes.

Vite's base path is set automatically from the repo name during CI build.

### First push (local → GitHub)

```bash
# one-time git identity
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"

git init -b main
git add .
git commit -m "Session 1: scaffold"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Authenticate with a GitHub personal access token (classic, `repo` scope) as the password, or install `gh` and run `gh auth login`.

## Layout

```
src/
  main.js              Phaser bootstrap + asset preload
  scenes/              Title · Morning · Kitchen · Summary · Upgrades
  rules/               Pure JS: scoring, economy, customers, day, rng, save
  data/                recipes, toppings, customers, upgrades, economy (JSON)
  ui/                  sfx (WebAudio), assets (SVG loader + fallbacks)
public/assets/art/     SVGs (optional — fallbacks are built in)
tests/unit/            Vitest tests for the rules layer
tests/e2e/             Playwright smoke test
tools/simulate.js      Balance simulator (bot plays rules layer, prints table)
```

Rules layer has no Phaser and no DOM — it is pure functions, fully unit-tested.
Scenes only draw and dispatch; every number lives in `src/data/*.json`.

## Project rules

See `CLAUDE.md` at the repo root — short list of invariants the code holds to.

## Credits

- Game design & spec: Hubert · built in session with Claude Code.
- No analytics, no cookies, no accounts.
- `<meta name="robots" content="noindex">` is set.
