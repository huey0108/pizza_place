import { describe, it, expect } from 'vitest';
import { newGameState, endDay, nextDay, migrate } from '../../src/rules/day.js';

describe('day transitions', () => {
  it('new game has sensible defaults', () => {
    const s = newGameState({ seed: 7 });
    expect(s.day).toBe(1);
    expect(s.money).toBe(20);
    expect(s.version).toBe(1);
  });
  it('endDay folds in money, stars, pizzas', () => {
    const s = newGameState({ seed: 1 });
    const r = endDay(s, { coinsEarned: 15, starsEarned: 6, pizzasServed: 3 });
    expect(r.money).toBe(35);
    expect(r.reputation).toBe(6);
    expect(r.stats.totalEarned).toBe(15);
    expect(r.stats.pizzasServed).toBe(3);
  });
  it('nextDay advances the day', () => {
    const s = newGameState({ seed: 1 });
    expect(nextDay(s).day).toBe(2);
  });
  it('migrate on current version is identity', () => {
    const s = newGameState({ seed: 1 });
    expect(migrate(s)).toEqual(s);
  });
  it('migrate undefined returns a fresh game', () => {
    expect(migrate(undefined).day).toBe(1);
  });
});
