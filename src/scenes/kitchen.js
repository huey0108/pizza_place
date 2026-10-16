import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { createRng } from '../rules/rng.js';
import { buildCustomerQueue } from '../rules/customers.js';
import { scorePizza, BAKE, WAIT, payment } from '../rules/scoring.js';
import { hasStock, consumePizzaIngredients, ovenCount } from '../rules/economy.js';
import economyData from '../data/economy.json';
import recipesData from '../data/recipes.json';
import customersData from '../data/customers.json';
import toppingsData from '../data/toppings.json';

// Bake stages by seconds in oven
const BAKE_TIMES = { raw: 0, slightlyUnder: 6, golden: 10, slightlyOver: 14, burnt: 18 };

export class KitchenScene extends Phaser.Scene {
  constructor() { super('Kitchen'); }
  init(data) { this.state = data.state; }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a0f08');

    // Full-bleed concept-art backdrop (kitchen interior)
    const bg = this.add.image(width / 2, height / 2, 'bg-kitchen');
    const sx = width / bg.width, sy = height / bg.height;
    bg.setScale(Math.max(sx, sy));
    // Light overlay so UI elements pop
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.18);

    // Build customer queue for the day
    const rng = createRng(this.state.seed + this.state.day * 977);
    this.queue = buildCustomerQueue({
      day: this.state.day, rng,
      customersData, recipesData, economy: economyData,
    });
    this.activeCustomers = []; // on-screen
    this.pizzasInProgress = []; // on counter
    this.ovens = Array.from({ length: ovenCount(this.state) }, () => null); // each slot: pizza or null
    this.counterPizza = null; // the pizza currently being built
    this.coinsEarned = 0;
    this.starsEarned = 0;
    this.pizzasServed = 0;
    this.dayLen = economyData.dayLengthSeconds;
    this.elapsed = 0;
    this.stockLabels = {}; // populated by layoutIngredientTrays

    this.layoutStations(width, height);
    this.layoutIngredientTrays(width, height);
    this.layoutUI(width, height);

    this.time.addEvent({ delay: 100, loop: true, callback: () => this.tick(0.1) });
  }

  layoutUI(width, height) {
    // Top bar
    this.add.rectangle(0, 0, width, 60, 0x2a1a0e).setOrigin(0, 0);
    // Pause button (home icon) on the far left — freeze day and go back to Title
    const pauseBtn = this.add.rectangle(42, 30, 60, 44, 0xffb347).setStrokeStyle(3, 0xffe28a).setInteractive({ useHandCursor: true });
    this.add.text(42, 30, '🏠', { fontSize: '24px' }).setOrigin(0.5);
    pauseBtn.on('pointerdown', () => this.pauseToShop());
    this.timerText = this.add.text(90, 30, '', { fontFamily: 'Georgia', fontSize: '28px', color: '#fff' }).setOrigin(0, 0.5);
    this.moneyText = this.add.text(width - 20, 30, '', { fontFamily: 'Georgia', fontSize: '28px', color: '#ffd700' }).setOrigin(1, 0.5);
    this.updateHud();
  }

  // Called by the pause button. Freezes the Kitchen scene (timer stops) and shows Title
  // with a "Resume day" option. Title wakes us when the player comes back.
  pauseToShop() {
    sfx.tap();
    // Launch Title overlaid; mark ourselves asleep so the timer tick halts.
    this.scene.launch('Title', { state: this.state, resumeFromKitchen: true });
    this.scene.sleep();
  }

  layoutStations(width, height) {
    // Counter position matches the wooden counter baked into the backdrop (~x=490, y=380).
    const counterX = 490, counterY = 380;
    // Transparent interaction zone — no visible beige rect anymore
    this.counterZone = this.add.rectangle(counterX, counterY, 240, 180, 0x000000, 0.0).setStrokeStyle(0);
    this.counterX = counterX; this.counterY = counterY;
    // +dough and bin buttons flanking the counter
    const newBtn = this.add.rectangle(counterX - 190, counterY + 10, 110, 80, 0xffb347, 0.95).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(counterX - 190, counterY + 10, '+ dough', { fontFamily: 'Georgia', fontSize: '20px', color: '#2a1a0e', fontStyle: 'bold' }).setOrigin(0.5);
    newBtn.on('pointerdown', () => this.startPizza());
    const bin = this.add.rectangle(counterX + 190, counterY + 10, 110, 80, 0x555, 0.95).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(counterX + 190, counterY + 10, '🗑 bin', { fontFamily: 'Georgia', fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    bin.on('pointerdown', () => this.binPizza());

    // Ovens: overlay invisible interaction slots on top of the baked-in oven in the backdrop.
    // The backdrop art has one oven on the left (~x=200, y=200). Second-oven upgrade adds another.
    const ovenPositions = [{ x: 240, y: 180 }, { x: 820, y: 180 }];
    this.ovenSlots = this.ovens.map((_, i) => {
      const pos = ovenPositions[i] || { x: 200 + i * 220, y: 200 };
      // Only draw a visible oven sprite for extra ovens beyond what's in the backdrop
      if (i >= 1) { const o = this.add.image(pos.x, pos.y, 'oven'); o.setScale(200 / Math.max(o.width, o.height)); }
      const slot = { x: pos.x, y: pos.y, index: i, pizzaSprite: null, bakeTime: 0, bakeStage: 'raw' };
      // Clickable zone over the oven mouth
      const zone = this.add.rectangle(pos.x, pos.y, 200, 150, 0x000, 0.01).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.handleOven(i));
      return slot;
    });

    // Customer waiting area (right side)
    this.customerSlots = [0, 1, 2].map((i) => ({ x: 870, y: 220 + i * 170, occupied: null }));
  }

  layoutIngredientTrays(width, height) {
    // Along the bottom. Dough is placed via +dough button; other toppings via tap-to-add-to-current-pizza.
    const items = [
      { id: 'sauce', art: 'topping-sauce' },
      { id: 'cheese', art: 'topping-cheese' },
      { id: 'pepperoni', art: 'topping-pepperoni' },
      { id: 'mushroom', art: 'topping-mushroom' },
      { id: 'pepper', art: 'topping-pepper' },
      { id: 'olive', art: 'topping-olive' },
      { id: 'pineapple', art: 'topping-pineapple' },
    ];
    const cellW = 110;
    const total = items.length * cellW;
    const startX = (width - total) / 2 + cellW / 2;
    this.stockLabels = {};
    items.forEach((it, i) => {
      const x = startX + i * cellW;
      const y = height - 70;
      const bg = this.add.rectangle(x, y, cellW - 10, 100, 0xffffff).setStrokeStyle(3, 0x2a1a0e).setInteractive({ useHandCursor: true });
      this.add.image(x, y - 10, it.art).setDisplaySize(64, 64);
      const stock = this.add.text(x, y + 32, `×${this.state.fridge[it.id] ?? 0}`, { fontFamily: 'Georgia', fontSize: '18px', color: '#1a1a1a' }).setOrigin(0.5);
      this.stockLabels[it.id] = stock;
      bg.on('pointerdown', () => this.addTopping(it.id));
    });
  }

  updateHud() {
    const remaining = Math.max(0, this.dayLen - Math.floor(this.elapsed));
    this.timerText.setText(`⏱ ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`);
    this.moneyText.setText(`£${this.state.money + this.coinsEarned}  ·  ⭐${this.starsEarned}  ·  🍕${this.pizzasServed}`);
    for (const [id, label] of Object.entries(this.stockLabels)) {
      label.setText(`×${this.state.fridge[id] ?? 0}`);
    }
  }

  startPizza() {
    if (this.counterPizza) { sfx.hmph(); return; }
    if (!hasStock(this.state, 'dough', 1)) { sfx.hmph(); this.flash('out of dough!'); return; }
    this.state = { ...this.state, fridge: { ...this.state.fridge, dough: this.state.fridge.dough - 1 } };
    const sprite = this.add.image(this.counterX, this.counterY, 'pizza-base-raw'); sprite.setScale(170 / Math.max(sprite.width, sprite.height));
    this.counterPizza = { sprite, toppings: [], toppingSprites: [], bakeStage: 'raw' };
    sfx.pop();
    this.updateHud();
  }

  addTopping(id) {
    if (!this.counterPizza) { this.flash('tap +dough first'); sfx.hmph(); return; }
    if (!hasStock(this.state, id, 1)) { sfx.hmph(); this.flash(`out of ${id}!`); return; }
    this.state = { ...this.state, fridge: { ...this.state.fridge, [id]: this.state.fridge[id] - 1 } };
    this.counterPizza.toppings.push(id);
    // Scatter the topping on the pizza
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 50;
    const tx = this.counterX + Math.cos(angle) * r;
    const ty = this.counterY + Math.sin(angle) * r;
    const s = this.add.image(tx, ty, `topping-${id}`).setDisplaySize(50, 50);
    this.counterPizza.toppingSprites.push(s);
    sfx.tap();
    this.updateHud();
  }

  handleOven(idx) {
    const slot = this.ovenSlots[idx];
    if (slot.pizzaSprite) {
      // Take out of oven: move to counter area and offer to serve
      this.takeFromOven(idx);
    } else if (this.counterPizza) {
      // Put the counter pizza in
      this.putInOven(idx);
    }
  }

  putInOven(idx) {
    const slot = this.ovenSlots[idx];
    const p = this.counterPizza;
    this.tweens.add({ targets: p.sprite, x: slot.x, y: slot.y, duration: 300 });
    for (const t of p.toppingSprites) {
      this.tweens.add({ targets: t, x: slot.x + (t.x - p.sprite.x), y: slot.y + (t.y - p.sprite.y), duration: 300 });
    }
    slot.pizzaSprite = p.sprite;
    slot.pizzaData = p;
    slot.bakeTime = 0;
    slot.bakeStage = 'raw';
    this.counterPizza = null;
    sfx.sizzle();
  }

  takeFromOven(idx) {
    const slot = this.ovenSlots[idx];
    const p = slot.pizzaData;
    p.bakeStage = slot.bakeStage;
    // Move back to counter
    this.tweens.add({ targets: p.sprite, x: this.counterX, y: this.counterY, duration: 300 });
    for (const t of p.toppingSprites) {
      const dx = t.x - slot.x; const dy = t.y - slot.y;
      this.tweens.add({ targets: t, x: this.counterX + dx, y: this.counterY + dy, duration: 300 });
    }
    this.counterPizza = p;
    slot.pizzaSprite = null; slot.pizzaData = null; slot.bakeTime = 0; slot.bakeStage = 'raw';
    sfx.pop();
    // Try to auto-serve: find a customer whose order best matches
    this.time.delayedCall(350, () => this.offerServe());
  }

  offerServe() {
    if (!this.counterPizza || this.activeCustomers.length === 0) return;
    // Serve the oldest waiting customer (first in line)
    const customer = this.activeCustomers[0];
    this.servePizza(customer);
  }

  servePizza(customer) {
    if (!this.counterPizza) return;
    const p = this.counterPizza;
    const bakeMap = { raw: BAKE.RAW, slightlyUnder: BAKE.SLIGHTLY, golden: BAKE.GOLDEN, slightlyOver: BAKE.SLIGHTLY, burnt: BAKE.BURNT };
    const waitState = customer.waitState;
    const { stars } = scorePizza({
      requiredToppings: customer.order.requiredToppings,
      placedToppings: p.toppings,
      bake: bakeMap[p.bakeStage],
      wait: waitState,
    });
    const paid = payment({ menuPrice: customer.order.menuPrice, stars, tipByStars: economyData.tipByStars, tipMultiplier: customer.order.tipMultiplier });
    this.coinsEarned += paid;
    this.starsEarned += stars;
    this.pizzasServed += 1;
    sfx.coin();
    if (stars === 3) sfx.star();
    else if (stars === 1) sfx.hmph();
    // Pop stars above customer
    this.showServedFeedback(customer, stars, paid);
    // Remove pizza + customer
    p.sprite.destroy();
    for (const t of p.toppingSprites) t.destroy();
    this.counterPizza = null;
    this.removeCustomer(customer, true);
    this.updateHud();
  }

  binPizza() {
    if (!this.counterPizza) return;
    this.counterPizza.sprite.destroy();
    for (const t of this.counterPizza.toppingSprites) t.destroy();
    this.counterPizza = null;
    sfx.hmph();
  }

  showServedFeedback(customer, stars, paid) {
    const t = this.add.text(customer.x, customer.y - 100, `${'⭐'.repeat(stars)}  £${paid}`, { fontFamily: 'Georgia', fontSize: '36px', color: '#1a1a1a', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
  }

  // Main tick (10 fps). dt in seconds.
  tick(dt) {
    this.elapsed += dt;
    // (fit helper is inlined where needed)
    // Spawn customers whose arrivalAt <= elapsed
    while (this.queue.length > 0 && this.queue[0].arrivalAt <= this.elapsed) {
      const next = this.queue.shift();
      this.spawnCustomer(next);
    }
    // Age customers
    const toLeave = [];
    for (const c of this.activeCustomers) {
      c.waited += dt;
      const frac = c.waited / c.order.patienceSeconds;
      if (frac < 0.5) c.waitState = WAIT.HAPPY;
      else if (frac < 1.0) c.waitState = WAIT.NEUTRAL;
      else c.waitState = WAIT.GRUMPY;
      c.faceSprite.setTexture(`face-${c.waitState}`);
      if (frac >= 1.3) toLeave.push(c); // leave in a huff
    }
    for (const c of toLeave) { sfx.hmph(); this.removeCustomer(c, false); }
    // Bake pizzas
    for (const slot of this.ovenSlots) {
      if (slot.pizzaSprite) {
        slot.bakeTime += dt;
        const t = slot.bakeTime;
        let stage = 'raw';
        if (t >= BAKE_TIMES.burnt) stage = 'burnt';
        else if (t >= BAKE_TIMES.slightlyOver) stage = 'slightlyOver';
        else if (t >= BAKE_TIMES.golden) stage = 'golden';
        else if (t >= BAKE_TIMES.slightlyUnder) stage = 'slightlyUnder';
        if (stage !== slot.bakeStage) {
          slot.bakeStage = stage;
          const tex = (stage === 'burnt') ? 'pizza-base-burnt' : (stage === 'raw') ? 'pizza-base-raw' : 'pizza-base-golden';
          slot.pizzaSprite.setTexture(tex);
          if (stage === 'burnt') sfx.burn();
        }
      }
    }
    this.updateHud();
    // End of day?
    if (this.elapsed >= this.dayLen && this.activeCustomers.length === 0 && this.queue.length === 0) {
      this.endService();
    } else if (this.elapsed >= this.dayLen + 30) {
      // Hard end
      this.endService();
    }
  }

  spawnCustomer(order) {
    // Find a slot
    const slot = this.customerSlots.find((s) => !s.occupied);
    if (!slot) { this.queue.unshift({ ...order, arrivalAt: this.elapsed + 2 }); return; }
    slot.occupied = true;
    const sprite = this.add.image(slot.x, slot.y, `customer-${order.customerId}`); sprite.setScale(190 / Math.max(sprite.width, sprite.height));
    const face = this.add.image(slot.x + 60, slot.y - 80, 'face-happy').setDisplaySize(44, 44);
    // Order bubble: dough + toppings icons
    const bubble = this.add.container(slot.x - 130, slot.y - 50);
    const bg = this.add.rectangle(0, 0, 140, 100, 0xffffff).setStrokeStyle(3, 0x1a1a1a);
    bubble.add(bg);
    const icons = order.requiredToppings;
    const perRow = 4;
    icons.forEach((t, i) => {
      const r = Math.floor(i / perRow), c = i % perRow;
      const img = this.add.image(-50 + c * 30, -25 + r * 30, `topping-${t}`).setDisplaySize(28, 28);
      bubble.add(img);
    });
    const customer = {
      ...order, order, x: slot.x, y: slot.y,
      waited: 0, waitState: WAIT.HAPPY,
      sprite, faceSprite: face, bubble, slot,
    };
    this.activeCustomers.push(customer);
    sfx.ding();
    // Tap on customer serves current pizza
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => this.servePizza(customer));
  }

  removeCustomer(customer, served) {
    customer.sprite.destroy(); customer.faceSprite.destroy(); customer.bubble.destroy();
    customer.slot.occupied = false;
    this.activeCustomers = this.activeCustomers.filter((c) => c !== customer);
  }

  flash(msg) {
    const t = this.add.text(this.counterX, this.counterY - 150, msg, { fontFamily: 'Georgia', fontSize: '28px', color: '#d94a3f', fontStyle: 'bold', backgroundColor: '#fff', padding: { x: 10, y: 6 } }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  endService() {
    this.scene.start('Summary', { state: this.state, coinsEarned: this.coinsEarned, starsEarned: this.starsEarned, pizzasServed: this.pizzasServed });
  }
}
