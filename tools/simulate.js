// Balance simulator — plays the rules layer with a bot at 3 skill levels.
// Writes a CSV of money + reputation per day; prints a summary.
// Run: node tools/simulate.js [runs] [days]

import { createRng } from '../src/rules/rng.js';
import { newGameState, endDay, nextDay } from '../src/rules/day.js';
import { buyIngredient, canAfford, applyUpgrade, ovenCount } from '../src/rules/economy.js';
import { buildCustomerQueue } from '../src/rules/customers.js';
import { scorePizza, BAKE, WAIT, payment } from '../src/rules/scoring.js';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf-8'));
const toppingsData  = read('../src/data/toppings.json');
const recipesData   = read('../src/data/recipes.json');
const customersData = read('../src/data/customers.json');
const upgradesData  = read('../src/data/upgrades.json');
const economyData   = read('../src/data/economy.json');

const RUNS = parseInt(process.argv[2] ?? '200', 10);
const DAYS = parseInt(process.argv[3] ?? '10', 10);

const SKILLS = {
  careful: { toppingErr: 0.0,  bakeErr: 0.1, waitFactor: 1.0 },
  average: { toppingErr: 0.2,  bakeErr: 0.2, waitFactor: 0.9 },
  chaotic: { toppingErr: 0.5,  bakeErr: 0.4, waitFactor: 0.7 },
};

function playDay(state, skill, rng) {
  // Morning: buy enough ingredients for expected customers (greedy).
  const queue = buildCustomerQueue({ day: state.day, rng, customersData, recipesData, economy: economyData });
  const need = { dough: queue.length };
  for (const c of queue) for (const t of c.requiredToppings) need[t] = (need[t] ?? 0) + 1;
  for (const [id, want] of Object.entries(need)) {
    const have = state.fridge[id] ?? 0;
    const toBuy = Math.max(0, want - have);
    for (let i = 0; i < toBuy; i++) {
      if (!canAfford(state, 1)) break;
      state = buyIngredient(state, id, 1, 1);
    }
  }
  let coins = 0, stars = 0, served = 0;
  for (const c of queue) {
    // Correct toppings if we have stock and don't make a mistake
    const placed = [];
    for (const t of c.requiredToppings) {
      if (rng.next() < skill.toppingErr) continue; // miss
      if ((state.fridge[t] ?? 0) <= 0) continue;
      state = { ...state, fridge: { ...state.fridge, [t]: state.fridge[t] - 1 } };
      placed.push(t);
    }
    if ((state.fridge.dough ?? 0) <= 0) continue;
    state = { ...state, fridge: { ...state.fridge, dough: state.fridge.dough - 1 } };
    const bake = rng.next() < skill.bakeErr ? (rng.chance(0.5) ? BAKE.SLIGHTLY : BAKE.BURNT) : BAKE.GOLDEN;
    const wait = rng.next() < (1 - skill.waitFactor) ? (rng.chance(0.5) ? WAIT.NEUTRAL : WAIT.GRUMPY) : WAIT.HAPPY;
    const { stars: st } = scorePizza({ requiredToppings: c.requiredToppings, placedToppings: placed, bake, wait });
    const paid = payment({ menuPrice: c.menuPrice, stars: st, tipByStars: economyData.tipByStars, tipMultiplier: c.tipMultiplier });
    coins += paid; stars += st; served += 1;
  }
  state = endDay(state, { coinsEarned: coins, starsEarned: stars, pizzasServed: served });
  // Spend on affordable upgrades
  const available = upgradesData.filter((u) => u.unlockDay <= state.day && !state.upgrades.includes(u.id));
  available.sort((a, b) => b.cost - a.cost);
  for (const u of available) if (canAfford(state, u.cost)) state = applyUpgrade(state, u);
  return { state: nextDay(state), coins, stars };
}

function runSim(skillName) {
  const skill = SKILLS[skillName];
  const perDayMoney = Array.from({ length: DAYS }, () => []);
  let secondOvenDays = [];
  for (let r = 0; r < RUNS; r++) {
    const rng = createRng(1_000_000 + r);
    let state = newGameState({ seed: 1_000_000 + r });
    let gotSecondOven = -1;
    for (let d = 0; d < DAYS; d++) {
      const res = playDay(state, skill, rng);
      state = res.state;
      perDayMoney[d].push(state.money);
      if (gotSecondOven < 0 && state.upgrades.includes('second-oven')) gotSecondOven = d + 1;
    }
    if (gotSecondOven > 0) secondOvenDays.push(gotSecondOven);
  }
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    name: skillName,
    endMoneyAvg: avg(perDayMoney[DAYS - 1]),
    day10Hit150: perDayMoney[DAYS - 1].filter((m) => m >= 150).length / RUNS,
    secondOvenMedianDay: secondOvenDays.sort((a, b) => a - b)[Math.floor(secondOvenDays.length / 2)] ?? '—',
    perDayAvg: perDayMoney.map(avg),
  };
}

const results = Object.keys(SKILLS).map(runSim);
console.log(`\nZofia's Pizzeria — balance simulator (${RUNS} runs × ${DAYS} days)\n`);
console.log('skill       end£(avg)  day10≥£150  2nd-oven day');
for (const r of results) {
  console.log(`${r.name.padEnd(12)}${r.endMoneyAvg.toFixed(1).padStart(9)}  ${(r.day10Hit150 * 100).toFixed(0).padStart(10)}%  ${String(r.secondOvenMedianDay).padStart(12)}`);
}
console.log('\nPer-day avg money:');
console.log('day      ' + Array.from({ length: DAYS }, (_, i) => `d${i + 1}`.padStart(7)).join(''));
for (const r of results) {
  console.log(r.name.padEnd(9) + r.perDayAvg.map((v) => v.toFixed(0).padStart(7)).join(''));
}
