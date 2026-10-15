// Money, fridge stock, buying, upgrades. All pure.

export function canAfford(state, cost) {
  return state.money >= cost;
}

export function buy(state, cost) {
  if (!canAfford(state, cost)) throw new Error('refused: not enough money');
  return { ...state, money: Math.max(0, state.money - cost) };
}

export function earn(state, amount) {
  return { ...state, money: state.money + Math.max(0, amount) };
}

export function buyIngredient(state, ingredientId, quantity, unitCost) {
  const total = unitCost * quantity;
  const s = buy(state, total);
  const fridge = { ...s.fridge, [ingredientId]: (s.fridge[ingredientId] ?? 0) + quantity };
  return { ...s, fridge };
}

export function hasStock(state, ingredientId, amount = 1) {
  return (state.fridge[ingredientId] ?? 0) >= amount;
}

export function consume(state, ingredientId, amount = 1) {
  if (!hasStock(state, ingredientId, amount)) throw new Error(`out of stock: ${ingredientId}`);
  const fridge = { ...state.fridge, [ingredientId]: state.fridge[ingredientId] - amount };
  return { ...state, fridge };
}

export function consumePizzaIngredients(state, toppings) {
  // Each pizza always eats a dough; sauce/cheese/other toppings per placement.
  let s = consume(state, 'dough', 1);
  for (const t of toppings) s = consume(s, t, 1);
  return s;
}

export function applyUpgrade(state, upgradeDef) {
  const s = buy(state, upgradeDef.cost);
  const upgrades = s.upgrades.includes(upgradeDef.id) ? s.upgrades : [...s.upgrades, upgradeDef.id];
  return { ...s, upgrades };
}

export function ovenCount(state) {
  return 1 + (state.upgrades.includes('second-oven') ? 1 : 0);
}

export function counterCapacity(state) {
  return 1 + (state.upgrades.includes('bigger-counter') ? 1 : 0);
}
