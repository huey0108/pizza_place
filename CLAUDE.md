# Zofia's Pizzeria — Build Rules

Target player: 8 years old. Fun > features. Short "days" (~5 min).

## Non-negotiables
- **Rules stay pure**: modules in `src/rules/` have no Phaser, no DOM, no `window`. Pure functions (state, input) → new state. Fully unit-tested.
- **Scenes only draw**: `src/scenes/` reads state and calls rules. Never mutate money/stars/stock directly in a scene.
- **Data is JSON**: recipes, toppings, customers, upgrades, economy numbers live in `src/data/*.json`. Zofia tweaks these.
- **Deterministic**: all randomness goes through `rules/rng.js` (seeded). The same seed replays the same day.
- **No network calls, no cookies, no analytics, no accounts.** Saves live in `localStorage` only.
- **Readable without reading**: pictures, numbers, sounds. No prose UI for the player.
- **Touch targets ≥ 48 px.** Tap or drag. Mouse and touch both work.

## When adding a feature
1. Change the data file if numbers are involved.
2. Add/extend a rules module with a unit test.
3. Wire the scene to call the rule.
4. Verify on tablet-sized viewport.
