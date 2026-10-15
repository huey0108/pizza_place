// Customer generation. Deterministic given a seed.

export function unlockedCustomers(customersData, day) {
  return customersData.filter((c) => c.unlockDay <= day);
}

export function unlockedRecipes(recipesData, day) {
  return recipesData.filter((r) => r.unlockDay <= day);
}

// Build the day's customer queue: who they are, what they order, arrival time.
export function buildCustomerQueue({ day, rng, customersData, recipesData, economy }) {
  const customers = unlockedCustomers(customersData, day);
  const recipes = unlockedRecipes(recipesData, day);
  const count = economy.customerCountByDay[Math.min(day - 1, economy.customerCountByDay.length - 1)];
  const dayLen = economy.dayLengthSeconds;

  const queue = [];
  for (let i = 0; i < count; i++) {
    const customer = rng.pickWeighted(customers);
    const recipe = rng.pick(recipes);
    // Picky customers want one extra topping
    let requiredToppings = [...recipe.requires];
    if (customer.requiresExtraTopping) {
      const extras = recipe.requires.filter((t) => t !== 'sauce' && t !== 'cheese');
      if (extras.length > 0) requiredToppings.push(rng.pick(extras));
    }
    // Spread arrivals across the day (first customer arrives early)
    const arrivalAt = Math.floor((i / count) * dayLen * 0.85);
    const patience = Math.round(economy.customerPatienceSeconds * customer.patienceMultiplier);
    queue.push({
      index: i,
      customerId: customer.id,
      customerName: customer.name,
      tipMultiplier: customer.tipMultiplier,
      recipeId: recipe.id,
      recipeName: recipe.name,
      menuPrice: recipe.price,
      requiredToppings,
      arrivalAt,
      patienceSeconds: patience,
    });
  }
  return queue;
}
