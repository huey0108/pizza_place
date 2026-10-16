// Counter + oven bookkeeping for one service. Pure: (kitchen, input) → { kitchen, event, ... }.
// A pizza lives in exactly one place: a counter slot or an oven. Only counter pizzas can be selected.
// Stock (dough, toppings) is not handled here — the scene checks/consumes it via economy.js.

import { toppingCheck, bakeCheck, BAKE } from './scoring.js';

export function newKitchen({ ovens = 1, counterSlots = 2 } = {}) {
  return {
    nextId: 1,
    pizzas: {},                               // id → { id, toppings: [], bakeTime: 0 }
    counter: Array(counterSlots).fill(null),  // pizza id per counter slot
    ovens: Array(ovens).fill(null),           // pizza id per oven
    selected: null,                           // counter pizza id
  };
}

export function bakeStage(bakeTime, bakeSeconds) {
  if (bakeTime >= bakeSeconds.burnt) return 'burnt';
  if (bakeTime >= bakeSeconds.slightlyOver) return 'slightlyOver';
  if (bakeTime >= bakeSeconds.golden) return 'golden';
  if (bakeTime >= bakeSeconds.slightlyUnder) return 'slightlyUnder';
  return 'raw';
}

// Bake stage → scoring.js BAKE grade.
export function bakeGrade(stage) {
  if (stage === 'golden') return BAKE.GOLDEN;
  if (stage === 'slightlyUnder' || stage === 'slightlyOver') return BAKE.SLIGHTLY;
  if (stage === 'burnt') return BAKE.BURNT;
  return BAKE.RAW;
}

export function whereIs(k, id) {
  const c = k.counter.indexOf(id);
  if (c >= 0) return { place: 'counter', index: c };
  const o = k.ovens.indexOf(id);
  if (o >= 0) return { place: 'oven', index: o };
  return null;
}

// Never been in an oven, so it can still take toppings and go in.
const isUnbaked = (p) => p.bakeTime === 0;
const counterPizzas = (k) => k.counter.filter((id) => id != null).map((id) => k.pizzas[id]);

// Selected pizza if it matches, else the newest counter pizza that matches.
function counterTarget(k, match = () => true) {
  const sel = k.selected != null ? k.pizzas[k.selected] : null;
  if (sel && match(sel)) return sel;
  const options = counterPizzas(k).filter(match);
  return options.length ? options.reduce((a, b) => (b.id > a.id ? b : a)) : null;
}

function removePizza(k, id) {
  const pizzas = { ...k.pizzas };
  delete pizzas[id];
  return {
    ...k,
    pizzas,
    counter: k.counter.map((x) => (x === id ? null : x)),
    ovens: k.ovens.map((x) => (x === id ? null : x)),
    selected: k.selected === id ? null : k.selected,
  };
}

export function startPizza(k) {
  const slot = k.counter.indexOf(null);
  if (slot < 0) return { kitchen: k, event: 'counterFull' };
  const id = k.nextId;
  const counter = [...k.counter];
  counter[slot] = id;
  return {
    kitchen: { ...k, nextId: id + 1, pizzas: { ...k.pizzas, [id]: { id, toppings: [], bakeTime: 0 } }, counter, selected: id },
    event: 'started',
    pizzaId: id,
  };
}

// Toppings always land on an unbaked counter pizza (the selected one if it's unbaked).
export function addTopping(k, topping) {
  const p = counterTarget(k, isUnbaked);
  if (!p) return { kitchen: k, event: 'noPizza' };
  const pizza = { ...p, toppings: [...p.toppings, topping] };
  return { kitchen: { ...k, pizzas: { ...k.pizzas, [p.id]: pizza }, selected: p.id }, event: 'added', pizzaId: p.id };
}

export function selectPizza(k, id) {
  if (!k.counter.includes(id)) return { kitchen: k, event: 'ignored' };
  return { kitchen: { ...k, selected: id }, event: 'selected', pizzaId: id };
}

// One tap on an oven does the obvious thing:
//   empty oven            → put the prepped pizza in
//   pizza still raw       → wait (never pull it out too early)
//   baked + one prepped   → swap them
//   baked, nothing prepped→ take it out to the counter
export function tapOven(k, ovenIndex, bakeSeconds) {
  const inOven = k.ovens[ovenIndex];
  const prepped = counterTarget(k, (p) => isUnbaked(p) && p.toppings.length > 0);

  if (inOven == null) {
    if (!prepped) {
      const bare = counterTarget(k, isUnbaked);
      return { kitchen: k, event: bare ? 'needsToppings' : 'nothingToBake' };
    }
    const counter = k.counter.map((x) => (x === prepped.id ? null : x));
    const ovens = [...k.ovens];
    ovens[ovenIndex] = prepped.id;
    return {
      kitchen: { ...k, counter, ovens, selected: k.selected === prepped.id ? null : k.selected },
      event: 'inserted',
      pizzaId: prepped.id,
    };
  }

  if (bakeStage(k.pizzas[inOven].bakeTime, bakeSeconds) === 'raw') {
    return { kitchen: k, event: 'notReady', pizzaId: inOven };
  }

  if (prepped) {
    const counter = k.counter.map((x) => (x === prepped.id ? inOven : x));
    const ovens = [...k.ovens];
    ovens[ovenIndex] = prepped.id;
    return { kitchen: { ...k, counter, ovens, selected: inOven }, event: 'swapped', pizzaId: inOven, insertedId: prepped.id };
  }

  const free = k.counter.indexOf(null);
  if (free < 0) return { kitchen: k, event: 'counterFull' };
  const counter = [...k.counter];
  counter[free] = inOven;
  const ovens = [...k.ovens];
  ovens[ovenIndex] = null;
  return { kitchen: { ...k, counter, ovens, selected: inOven }, event: 'takenOut', pizzaId: inOven };
}

// Tapping a pizza: on the counter it gets selected; in an oven it acts like tapping that oven.
export function tapPizza(k, id, bakeSeconds) {
  const where = whereIs(k, id);
  if (where?.place === 'oven') return tapOven(k, where.index, bakeSeconds);
  return selectPizza(k, id);
}

// Customer tapped: hand over the best baked pizza for their order — from the counter or
// straight out of an oven. Raw pizzas are never served.
export function takeForCustomer(k, requiredToppings, bakeSeconds) {
  const candidates = [
    ...counterPizzas(k).filter((p) => !isUnbaked(p)),
    ...k.ovens.filter((id) => id != null).map((id) => k.pizzas[id])
      .filter((p) => bakeStage(p.bakeTime, bakeSeconds) !== 'raw'),
  ];
  if (candidates.length === 0) {
    const baking = k.ovens.some((id) => id != null);
    return { kitchen: k, event: baking ? 'notReady' : 'nothingBaked', pizza: null };
  }
  const score = (p) => [
    toppingCheck(requiredToppings, p.toppings),
    bakeCheck(bakeGrade(bakeStage(p.bakeTime, bakeSeconds))),
  ];
  const best = candidates.reduce((a, b) => {
    const [at, ab] = score(a), [bt, bb] = score(b);
    if (bt !== at) return bt > at ? b : a;
    if (bb !== ab) return bb > ab ? b : a;
    return b.id < a.id ? b : a;
  });
  const from = whereIs(k, best.id);
  return { kitchen: removePizza(k, best.id), event: 'served', pizza: best, from };
}

// Bin the selected counter pizza (or the newest one). Oven pizzas must come out first.
export function binPizza(k) {
  const p = counterTarget(k);
  if (!p) return { kitchen: k, event: 'nothingToBin' };
  return { kitchen: removePizza(k, p.id), event: 'binned', pizzaId: p.id };
}

export function tickOvens(k, dt) {
  const pizzas = { ...k.pizzas };
  for (const id of k.ovens) {
    if (id != null) pizzas[id] = { ...pizzas[id], bakeTime: pizzas[id].bakeTime + dt };
  }
  return { ...k, pizzas };
}
