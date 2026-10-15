import { describe, it, expect } from 'vitest';
import { scorePizza, toppingCheck, bakeCheck, waitCheck, payment, BAKE, WAIT } from '../../src/rules/scoring.js';

describe('toppingCheck', () => {
  it('scores 3 when toppings exactly match', () => {
    expect(toppingCheck(['sauce', 'cheese'], ['sauce', 'cheese'])).toBe(3);
  });
  it('scores 2 with one missing', () => {
    expect(toppingCheck(['sauce', 'cheese', 'pepperoni'], ['sauce', 'cheese'])).toBe(2);
  });
  it('scores 2 with one extra', () => {
    expect(toppingCheck(['sauce', 'cheese'], ['sauce', 'cheese', 'pineapple'])).toBe(2);
  });
  it('scores 1 with two or more wrong', () => {
    expect(toppingCheck(['sauce', 'cheese', 'pepperoni'], ['sauce'])).toBe(1);
    expect(toppingCheck(['sauce'], ['sauce', 'pineapple', 'olive'])).toBe(1);
  });
  it('ignores order', () => {
    expect(toppingCheck(['sauce', 'cheese', 'pepperoni'], ['pepperoni', 'cheese', 'sauce'])).toBe(3);
  });
});

describe('bakeCheck', () => {
  it('golden → 3', () => expect(bakeCheck(BAKE.GOLDEN)).toBe(3));
  it('slightly → 2', () => expect(bakeCheck(BAKE.SLIGHTLY)).toBe(2));
  it('burnt → 1', () => expect(bakeCheck(BAKE.BURNT)).toBe(1));
  it('raw → 1',   () => expect(bakeCheck(BAKE.RAW)).toBe(1));
});

describe('waitCheck', () => {
  it('maps happy/neutral/grumpy to 3/2/1', () => {
    expect(waitCheck(WAIT.HAPPY)).toBe(3);
    expect(waitCheck(WAIT.NEUTRAL)).toBe(2);
    expect(waitCheck(WAIT.GRUMPY)).toBe(1);
  });
});

describe('scorePizza', () => {
  it('perfect pizza → 3 stars', () => {
    const r = scorePizza({
      requiredToppings: ['sauce', 'cheese'],
      placedToppings: ['sauce', 'cheese'],
      bake: BAKE.GOLDEN, wait: WAIT.HAPPY,
    });
    expect(r.stars).toBe(3);
  });
  it('burnt pizza never scores more than 1 on bake', () => {
    const r = scorePizza({
      requiredToppings: ['sauce', 'cheese'],
      placedToppings: ['sauce', 'cheese'],
      bake: BAKE.BURNT, wait: WAIT.HAPPY,
    });
    expect(r.breakdown.bake).toBe(1);
    expect(r.stars).toBe(1);
  });
  it('one missing topping scores 2 stars on toppings', () => {
    const r = scorePizza({
      requiredToppings: ['sauce', 'cheese', 'pepperoni'],
      placedToppings: ['sauce', 'cheese'],
      bake: BAKE.GOLDEN, wait: WAIT.HAPPY,
    });
    expect(r.breakdown.toppings).toBe(2);
    expect(r.stars).toBe(2);
  });
  it('overall stars = min of the three checks', () => {
    const r = scorePizza({
      requiredToppings: ['sauce'],
      placedToppings: ['sauce'],
      bake: BAKE.GOLDEN, wait: WAIT.GRUMPY,
    });
    expect(r.stars).toBe(1);
  });
});

describe('payment', () => {
  const tipByStars = { '1': 0, '2': 1, '3': 2 };
  it('3 stars → price + £2 tip', () => {
    expect(payment({ menuPrice: 6, stars: 3, tipByStars })).toBe(8);
  });
  it('1 star → price only', () => {
    expect(payment({ menuPrice: 6, stars: 1, tipByStars })).toBe(6);
  });
  it('tip multiplier applies (VIP)', () => {
    expect(payment({ menuPrice: 6, stars: 3, tipByStars, tipMultiplier: 3 })).toBe(6 + 6);
  });
  it('0 stars → 0', () => {
    expect(payment({ menuPrice: 6, stars: 0, tipByStars })).toBe(0);
  });
});
