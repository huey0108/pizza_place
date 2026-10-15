import { describe, it, expect } from 'vitest';
import { buy, earn, buyIngredient, consume, hasStock, canAfford, applyUpgrade } from '../../src/rules/economy.js';

const base = { money: 20, fridge: { dough: 2, cheese: 1 }, upgrades: [] };

describe('money', () => {
  it('earns and spends', () => {
    expect(earn(base, 10).money).toBe(30);
    expect(buy(base, 5).money).toBe(15);
  });
  it('refuses purchase that would go below zero', () => {
    expect(() => buy(base, 999)).toThrow(/refused/);
  });
  it('canAfford matches buy behavior', () => {
    expect(canAfford(base, 20)).toBe(true);
    expect(canAfford(base, 21)).toBe(false);
  });
});

describe('fridge', () => {
  it('buys an ingredient and deducts money', () => {
    const s = buyIngredient(base, 'sauce', 3, 1);
    expect(s.money).toBe(17);
    expect(s.fridge.sauce).toBe(3);
    expect(s.fridge.dough).toBe(2);
  });
  it('consume reduces stock, throws when empty', () => {
    const s = consume(base, 'dough', 1);
    expect(s.fridge.dough).toBe(1);
    expect(() => consume(base, 'olive', 1)).toThrow(/out of stock/);
  });
  it('hasStock reports availability', () => {
    expect(hasStock(base, 'dough', 2)).toBe(true);
    expect(hasStock(base, 'dough', 3)).toBe(false);
  });
});

describe('upgrades', () => {
  it('applying an upgrade deducts money and records it', () => {
    const s = applyUpgrade(base, { id: 'second-oven', cost: 10 });
    expect(s.money).toBe(10);
    expect(s.upgrades).toContain('second-oven');
  });
  it('cannot buy an upgrade you cannot afford', () => {
    expect(() => applyUpgrade(base, { id: 'mega', cost: 999 })).toThrow(/refused/);
  });
});
