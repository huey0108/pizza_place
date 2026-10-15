import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/rules/rng.js';
import { buildCustomerQueue } from '../../src/rules/customers.js';
import customersData from '../../src/data/customers.json';
import recipesData from '../../src/data/recipes.json';
import economyData from '../../src/data/economy.json';

describe('rng', () => {
  it('same seed → same sequence', () => {
    const a = createRng(42), b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBeCloseTo(b.next(), 10);
  });
  it('different seed → different sequence', () => {
    const a = createRng(1), b = createRng(2);
    expect(a.next()).not.toBeCloseTo(b.next(), 5);
  });
  it('pickWeighted respects weights (statistical)', () => {
    const r = createRng(123);
    const arr = [{ v: 'a', weight: 1 }, { v: 'b', weight: 9 }];
    let bs = 0;
    for (let i = 0; i < 1000; i++) if (r.pickWeighted(arr).v === 'b') bs++;
    expect(bs).toBeGreaterThan(800); // ~900
  });
});

describe('customer queue determinism', () => {
  it('same seed and day produces identical queue', () => {
    const rng1 = createRng(999);
    const rng2 = createRng(999);
    const q1 = buildCustomerQueue({ day: 1, rng: rng1, customersData, recipesData, economy: economyData });
    const q2 = buildCustomerQueue({ day: 1, rng: rng2, customersData, recipesData, economy: economyData });
    expect(JSON.stringify(q1)).toBe(JSON.stringify(q2));
  });
  it('day 1 only unlocks margherita', () => {
    const r = createRng(1);
    const q = buildCustomerQueue({ day: 1, rng: r, customersData, recipesData, economy: economyData });
    for (const c of q) expect(c.recipeId).toBe('margherita');
  });
});

describe('recipes integrity', () => {
  const validToppings = new Set(['sauce', 'cheese', 'pepperoni', 'mushroom', 'pepper', 'olive', 'pineapple']);
  it('every recipe uses only known toppings', () => {
    for (const r of recipesData) {
      for (const t of r.requires) expect(validToppings.has(t)).toBe(true);
    }
  });
});
