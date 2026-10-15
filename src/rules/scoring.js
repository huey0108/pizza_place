// Pizza scoring: toppings, bake, wait → stars + payment.
// Pure function. No side effects.

export const BAKE = { RAW: 'raw', GOLDEN: 'golden', SLIGHTLY: 'slightly', BURNT: 'burnt' };
export const WAIT = { HAPPY: 'happy', NEUTRAL: 'neutral', GRUMPY: 'grumpy' };

// Compare required vs placed toppings (multisets).
export function toppingCheck(required, placed) {
  const req = new Map();
  for (const t of required) req.set(t, (req.get(t) ?? 0) + 1);
  const got = new Map();
  for (const t of placed) got.set(t, (got.get(t) ?? 0) + 1);
  let missing = 0, extra = 0;
  for (const [t, n] of req) {
    const g = got.get(t) ?? 0;
    if (g < n) missing += (n - g);
  }
  for (const [t, n] of got) {
    const r = req.get(t) ?? 0;
    if (n > r) extra += (n - r);
  }
  const wrong = missing + extra;
  if (wrong === 0) return 3;
  if (wrong === 1) return 2;
  return 1;
}

export function bakeCheck(bake) {
  if (bake === BAKE.GOLDEN) return 3;
  if (bake === BAKE.SLIGHTLY) return 2;
  return 1; // raw or burnt
}

export function waitCheck(wait) {
  if (wait === WAIT.HAPPY) return 3;
  if (wait === WAIT.NEUTRAL) return 2;
  return 1;
}

// Overall stars: min of three checks (classic "weakest link").
// Returns { stars, breakdown }.
export function scorePizza({ requiredToppings, placedToppings, bake, wait }) {
  const tStars = toppingCheck(requiredToppings, placedToppings);
  const bStars = bakeCheck(bake);
  const wStars = waitCheck(wait);
  const stars = Math.min(tStars, bStars, wStars);
  return { stars, breakdown: { toppings: tStars, bake: bStars, wait: wStars } };
}

// Price + tip for a served pizza. Tip multiplier comes from customer type.
export function payment({ menuPrice, stars, tipByStars, tipMultiplier = 1.0 }) {
  if (stars <= 0) return 0;
  const baseTip = tipByStars[String(stars)] ?? 0;
  const tip = Math.round(baseTip * tipMultiplier);
  return menuPrice + tip;
}
