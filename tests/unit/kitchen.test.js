import { describe, it, expect } from 'vitest';
import {
  newKitchen, bakeStage, bakeGrade, whereIs, startPizza, addTopping, selectPizza,
  tapOven, tapPizza, takeForCustomer, binPizza, tickOvens,
} from '../../src/rules/kitchen.js';
import economy from '../../src/data/economy.json';

const BS = economy.bakeSeconds;
const MARGHERITA = ['sauce', 'cheese'];

// Build a pizza on the counter with toppings.
function prep(k, toppings = MARGHERITA) {
  let r = startPizza(k);
  let kk = r.kitchen;
  for (const t of toppings) kk = addTopping(kk, t).kitchen;
  return { kitchen: kk, id: r.pizzaId };
}

describe('bake stages', () => {
  it('follows the data timings', () => {
    expect(bakeStage(0, BS)).toBe('raw');
    expect(bakeStage(BS.slightlyUnder, BS)).toBe('slightlyUnder');
    expect(bakeStage(BS.golden, BS)).toBe('golden');
    expect(bakeStage(BS.slightlyOver, BS)).toBe('slightlyOver');
    expect(bakeStage(BS.burnt + 5, BS)).toBe('burnt');
  });
  it('maps to scoring grades', () => {
    expect(bakeGrade('golden')).toBe('golden');
    expect(bakeGrade('slightlyUnder')).toBe('slightly');
    expect(bakeGrade('slightlyOver')).toBe('slightly');
    expect(bakeGrade('raw')).toBe('raw');
    expect(bakeGrade('burnt')).toBe('burnt');
  });
});

describe('counter', () => {
  it('new pizzas fill the counter and get selected', () => {
    let k = newKitchen({ counterSlots: 2 });
    const a = startPizza(k); k = a.kitchen;
    const b = startPizza(k); k = b.kitchen;
    expect(k.counter).toEqual([a.pizzaId, b.pizzaId]);
    expect(k.selected).toBe(b.pizzaId);
    expect(startPizza(k).event).toBe('counterFull');
  });
  it('toppings go on the selected pizza', () => {
    let k = newKitchen();
    const a = startPizza(k); k = a.kitchen;
    k = startPizza(k).kitchen;
    k = selectPizza(k, a.pizzaId).kitchen;
    k = addTopping(k, 'sauce').kitchen;
    expect(k.pizzas[a.pizzaId].toppings).toEqual(['sauce']);
  });
  it('toppings need a pizza', () => {
    expect(addTopping(newKitchen(), 'sauce').event).toBe('noPizza');
  });
  it('bin removes the selected counter pizza', () => {
    let { kitchen: k, id } = prep(newKitchen());
    const r = binPizza(k);
    expect(r.event).toBe('binned');
    expect(r.kitchen.pizzas[id]).toBeUndefined();
    expect(r.kitchen.counter).toEqual([null, null]);
    expect(binPizza(r.kitchen).event).toBe('nothingToBin');
  });
});

describe('oven', () => {
  it('puts the prepped pizza in an empty oven', () => {
    let { kitchen: k, id } = prep(newKitchen());
    const r = tapOven(k, 0, BS);
    expect(r.event).toBe('inserted');
    expect(whereIs(r.kitchen, id)).toEqual({ place: 'oven', index: 0 });
    expect(r.kitchen.selected).toBe(null);
  });
  it('will not bake bare dough', () => {
    const k = startPizza(newKitchen()).kitchen;
    expect(tapOven(k, 0, BS).event).toBe('needsToppings');
    expect(tapOven(newKitchen(), 0, BS).event).toBe('nothingToBake');
  });
  it('bakes only while inside', () => {
    let { kitchen: k, id } = prep(newKitchen());
    k = tapOven(k, 0, BS).kitchen;
    k = tickOvens(k, 3);
    k = tickOvens(k, 2);
    expect(k.pizzas[id].bakeTime).toBe(5);
  });
  it('does not let a raw pizza come out early', () => {
    let { kitchen: k, id } = prep(newKitchen());
    k = tapOven(k, 0, BS).kitchen;
    k = tickOvens(k, 1);
    const r = tapOven(k, 0, BS);
    expect(r.event).toBe('notReady');
    expect(whereIs(r.kitchen, id).place).toBe('oven');
  });
  it('takes a baked pizza out when nothing is prepped', () => {
    let { kitchen: k, id } = prep(newKitchen());
    k = tapOven(k, 0, BS).kitchen;
    k = tickOvens(k, BS.golden);
    const r = tapOven(k, 0, BS);
    expect(r.event).toBe('takenOut');
    expect(whereIs(r.kitchen, id).place).toBe('counter');
    expect(r.kitchen.selected).toBe(id);
    expect(r.kitchen.ovens).toEqual([null]);
  });
  it('a taken-out pizza does not go back in', () => {
    let { kitchen: k } = prep(newKitchen());
    k = tapOven(k, 0, BS).kitchen;
    k = tickOvens(k, BS.golden);
    k = tapOven(k, 0, BS).kitchen;
    expect(tapOven(k, 0, BS).event).toBe('nothingToBake');
  });
  it('tapping the pizza inside the oven works like tapping the oven', () => {
    let { kitchen: k, id } = prep(newKitchen());
    k = tapOven(k, 0, BS).kitchen;
    k = tickOvens(k, BS.golden);
    const r = tapPizza(k, id, BS);
    expect(r.event).toBe('takenOut');
    expect(r.kitchen.selected).toBe(id);
  });
  it('never selects an oven pizza', () => {
    let { kitchen: k, id } = prep(newKitchen());
    k = tapOven(k, 0, BS).kitchen;
    expect(selectPizza(k, id).kitchen.selected).toBe(null);
  });
});

describe('the swap flow: bake one, prep the next, serve, swap', () => {
  function bakingAndPrepped() {
    let a = prep(newKitchen());
    let k = tapOven(a.kitchen, 0, BS).kitchen;
    const b = prep(k, ['sauce', 'cheese', 'pepperoni']);
    k = tickOvens(b.kitchen, BS.golden);
    return { k, a: a.id, b: b.id };
  }

  it('one oven tap swaps the baked pizza out and the prepped one in', () => {
    const { k, a, b } = bakingAndPrepped();
    const r = tapOven(k, 0, BS);
    expect(r.event).toBe('swapped');
    expect(whereIs(r.kitchen, a).place).toBe('counter');
    expect(whereIs(r.kitchen, b)).toEqual({ place: 'oven', index: 0 });
    expect(r.kitchen.selected).toBe(a);
    expect(r.kitchen.pizzas[b].bakeTime).toBe(0);
  });

  it('a second tap right after a swap does not swap back', () => {
    const { k, a, b } = bakingAndPrepped();
    const once = tapOven(k, 0, BS).kitchen;
    const twice = tapOven(once, 0, BS);
    expect(twice.event).toBe('notReady');
    expect(whereIs(twice.kitchen, a).place).toBe('counter');
    expect(whereIs(twice.kitchen, b).place).toBe('oven');
  });

  it('tapping the customer serves the baked oven pizza, not the raw one being prepped', () => {
    const { k, a, b } = bakingAndPrepped();
    const r = takeForCustomer(k, MARGHERITA, BS);
    expect(r.event).toBe('served');
    expect(r.pizza.id).toBe(a);
    expect(r.from).toEqual({ place: 'oven', index: 0 });
    expect(r.kitchen.ovens).toEqual([null]);
    expect(whereIs(r.kitchen, b).place).toBe('counter');
    // ...then one oven tap puts the prepped pizza in
    const next = tapOven(r.kitchen, 0, BS);
    expect(next.event).toBe('inserted');
    expect(whereIs(next.kitchen, b).place).toBe('oven');
  });

  it('serve after swap hands over the baked pizza and frees the counter', () => {
    const { k, a } = bakingAndPrepped();
    const swapped = tapOven(k, 0, BS).kitchen;
    const r = takeForCustomer(swapped, MARGHERITA, BS);
    expect(r.pizza.id).toBe(a);
    expect(r.from.place).toBe('counter');
    expect(r.kitchen.counter).toEqual([null, null]);
  });
});

describe('serving', () => {
  it('never serves a raw pizza', () => {
    let { kitchen: k } = prep(newKitchen());
    expect(takeForCustomer(k, MARGHERITA, BS).event).toBe('nothingBaked');
    k = tapOven(k, 0, BS).kitchen;
    k = tickOvens(k, 1);
    const r = takeForCustomer(k, MARGHERITA, BS);
    expect(r.event).toBe('notReady');
    expect(r.pizza).toBe(null);
  });
  it('picks the pizza that matches the order best', () => {
    let k = newKitchen({ ovens: 2 });
    const pep = prep(k, ['sauce', 'cheese', 'pepperoni']); k = tapOven(pep.kitchen, 0, BS).kitchen;
    const mar = prep(k, MARGHERITA); k = tapOven(mar.kitchen, 1, BS).kitchen;
    k = tickOvens(k, BS.golden);
    expect(takeForCustomer(k, MARGHERITA, BS).pizza.id).toBe(mar.id);
    expect(takeForCustomer(k, ['sauce', 'cheese', 'pepperoni'], BS).pizza.id).toBe(pep.id);
  });
  it('prefers the better bake when toppings tie', () => {
    let k = newKitchen({ ovens: 2 });
    const first = prep(k); k = tapOven(first.kitchen, 0, BS).kitchen;
    k = tickOvens(k, BS.burnt - BS.golden);
    const second = prep(k); k = tapOven(second.kitchen, 1, BS).kitchen;
    k = tickOvens(k, BS.golden);
    // first is burnt now, second golden
    expect(takeForCustomer(k, MARGHERITA, BS).pizza.id).toBe(second.id);
  });
  it('does not change the kitchen it was given', () => {
    let { kitchen: k } = prep(newKitchen());
    k = tickOvens(tapOven(k, 0, BS).kitchen, BS.golden);
    const before = JSON.stringify(k);
    takeForCustomer(k, MARGHERITA, BS);
    tapOven(k, 0, BS);
    expect(JSON.stringify(k)).toBe(before);
  });
});
