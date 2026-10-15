// Day start/end transitions. Pure.

import { earn } from './economy.js';

export function newGameState({ startingMoney = 20, seed } = {}) {
  return {
    version: 1,
    day: 1,
    money: startingMoney,
    reputation: 0,
    fridge: { dough: 5, sauce: 5, cheese: 5, pepperoni: 2, mushroom: 2, pepper: 2, olive: 0, pineapple: 0 },
    unlocked: ['margherita'],
    upgrades: [],
    seed: seed ?? Math.floor(Math.random() * 1e9),
    stats: { totalEarned: 0, totalStars: 0, pizzasServed: 0 },
  };
}

// Called at end of service: fold in the day's results and advance.
export function endDay(state, { coinsEarned, starsEarned, pizzasServed }) {
  let s = earn(state, coinsEarned);
  s = {
    ...s,
    reputation: s.reputation + starsEarned,
    stats: {
      totalEarned: s.stats.totalEarned + coinsEarned,
      totalStars: s.stats.totalStars + starsEarned,
      pizzasServed: s.stats.pizzasServed + pizzasServed,
    },
  };
  return s;
}

export function nextDay(state) {
  return { ...state, day: state.day + 1 };
}

// Migrate old saves to current version.
export function migrate(state) {
  if (!state) return newGameState();
  if (state.version === 1) return state; // current
  return state;
}
