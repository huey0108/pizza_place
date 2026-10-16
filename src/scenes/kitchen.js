import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { createRng } from '../rules/rng.js';
import { buildCustomerQueue } from '../rules/customers.js';
import { scorePizza, BAKE, WAIT, payment } from '../rules/scoring.js';
import { hasStock, ovenCount } from '../rules/economy.js';
import economyData from '../data/economy.json';
import recipesData from '../data/recipes.json';
import customersData from '../data/customers.json';

// Bake stages by seconds in oven
const BAKE_TIMES = { raw: 0, slightlyUnder: 6, golden: 10, slightlyOver: 14, burnt: 18 };

// How many pizzas can sit on the counter at once (allows prepping a 2nd while first bakes)
const COUNTER_CAPACITY = 2;

export class KitchenScene extends Phaser.Scene {
  constructor() { super('Kitchen'); }
  init(data) { this.state = data.state; }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a0f08');

    // Full-bleed concept-art backdrop
    const bg = this.add.image(width / 2, height / 2, 'bg-kitchen');
    const sx = width / bg.width, sy = height / bg.height;
    bg.setScale(Math.max(sx, sy));
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.18);

    // Build customer queue for the day
    const rng = createRng(this.state.seed + this.state.day * 977);
    this.queue = buildCustomerQueue({
      day: this.state.day, rng,
      customersData, recipesData, economy: economyData,
    });
    this.activeCustomers = [];
    this.ovens = Array.from({ length: ovenCount(this.state) }, () => null);
    this.counterPizzas = [];      // up to COUNTER_CAPACITY pizzas on counter
    this.selectedPizza = null;    // reference into counterPizzas
    this.coinsEarned = 0;
    this.starsEarned = 0;
    this.pizzasServed = 0;
    this.dayLen = economyData.dayLengthSeconds;
    this.elapsed = 0;
    this.stockLabels = {};

    this.layoutStations(width, height);
    this.layoutIngredientTrays(width, height);
    this.layoutUI(width, height);

    // Selection ring (hidden until a pizza is selected)
    this.selRing = this.add.graphics();
    this.selRing.lineStyle(5, 0xffd54a, 1);
    this.selRing.strokeCircle(0, 0, 60);
    this.selRing.setVisible(false);

    // Pull state updates on wake (e.g. after mid-day fridge trip from Morning)
    this.events.on('wake', (sys, data) => {
      if (data && data.state) {
        this.state = data.state;
        this.updateHud();
      }
    });

    this.time.addEvent({ delay: 100, loop: true, callback: () => this.tick(0.1) });
  }

  layoutUI(width, height) {
    this.add.rectangle(0, 0, width, 60, 0x2a1a0e).setOrigin(0, 0);
    // Pause button — go to Morning (fridge) with timer frozen
    const pauseBtn = this.add.rectangle(42, 30, 60, 44, 0xffb347).setStrokeStyle(3, 0xffe28a).setInteractive({ useHandCursor: true });
    this.add.text(42, 30, '🏠', { fontSize: '24px' }).setOrigin(0.5);
    pauseBtn.on('pointerdown', () => this.pauseToShop());
    this.timerText = this.add.text(90, 30, '', { fontFamily: 'Georgia', fontSize: '28px', color: '#fff' }).setOrigin(0, 0.5);
    this.moneyText = this.add.text(width - 20, 30, '', { fontFamily: 'Georgia', fontSize: '28px', color: '#ffd700' }).setOrigin(1, 0.5);
    this.updateHud();
  }

  pauseToShop() {
    sfx.tap();
    this.scene.launch('Morning', { state: this.state, resumeFromKitchen: true });
    this.scene.sleep();
  }

  layoutStations(width, height) {
    const counterX = 490, counterY = 380;
    this.counterX = counterX; this.counterY = counterY;
    // Two counter positions, left & right, so two pizzas fit side-by-side
    this.counterSlots = [
      { x: counterX - 70, y: counterY, occupied: null },
      { x: counterX + 70, y: counterY, occupied: null },
    ];

    const newBtn = this.add.rectangle(counterX - 220, counterY + 10, 110, 80, 0xffb347, 0.95).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(counterX - 220, counterY + 10, '+ dough', { fontFamily: 'Georgia', fontSize: '20px', color: '#2a1a0e', fontStyle: 'bold' }).setOrigin(0.5);
    newBtn.on('pointerdown', () => this.startPizza());

    const bin = this.add.rectangle(counterX + 220, counterY + 10, 110, 80, 0x555, 0.95).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(counterX + 220, counterY + 10, '🗑 bin', { fontFamily: 'Georgia', fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    bin.on('pointerdown', () => this.binSelected());

    // Ovens: overlay invisible interaction zones on top of baked-in oven art
    const ovenPositions = [{ x: 240, y: 180 }, { x: 820, y: 180 }];
    this.ovenSlots = this.ovens.map((_, i) => {
      const pos = ovenPositions[i] || { x: 200 + i * 220, y: 200 };
      if (i >= 1) { const o = this.add.image(pos.x, pos.y, 'oven'); o.setScale(200 / Math.max(o.width, o.height)); }
      const slot = { x: pos.x, y: pos.y, index: i, pizzaSprite: null, bakeTime: 0, bakeStage: 'raw' };
      const zone = this.add.rectangle(pos.x, pos.y, 200, 150, 0x000, 0.01).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.handleOven(i));
      return slot;
    });

    // Customer waiting area (right column)
    this.customerSlots = [0, 1, 2].map((i) => ({ x: 870, y: 220 + i * 170, occupied: null }));
  }

  layoutIngredientTrays(width, height) {
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
    if (this.timerText) this.timerText.setText(`⏱ ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`);
    if (this.moneyText) this.moneyText.setText(`£${this.state.money + this.coinsEarned}  ·  ⭐${this.starsEarned}  ·  🍕${this.pizzasServed}`);
    for (const [id, label] of Object.entries(this.stockLabels)) {
      label.setText(`×${this.state.fridge[id] ?? 0}`);
    }
  }

  // === Counter / pizza selection ===

  selectPizza(p) {
    this.selectedPizza = p;
    if (p && this.selRing) {
      this.selRing.setPosition(p.sprite.x, p.sprite.y).setVisible(true);
    } else if (this.selRing) {
      this.selRing.setVisible(false);
    }
  }

  firstFreeCounterSlot() {
    return this.counterSlots.find((s) => !s.occupied) || null;
  }

  startPizza() {
    const slot = this.firstFreeCounterSlot();
    if (!slot) { this.flash('Counter is full — bake or bin one first!'); sfx.hmph(); return; }
    if (!hasStock(this.state, 'dough', 1)) { sfx.hmph(); this.flash('Out of dough! Tap 🏠 to buy more.'); return; }

    this.state = { ...this.state, fridge: { ...this.state.fridge, dough: this.state.fridge.dough - 1 } };
    const sprite = this.add.image(slot.x, slot.y, 'pizza-base-raw');
    sprite.setScale(130 / Math.max(sprite.width, sprite.height));
    sprite.setInteractive({ useHandCursor: true });

    const p = { sprite, toppings: [], toppingSprites: [], bakeStage: 'raw', slot };
    slot.occupied = p;
    this.counterPizzas.push(p);
    sprite.on('pointerdown', () => { sfx.tap(); this.selectPizza(p); });
    this.selectPizza(p); // new pizza is auto-selected
    sfx.pop();
    this.updateHud();
  }

  addTopping(id) {
    // If nothing selected, auto-pick the newest counter pizza
    if (!this.selectedPizza && this.counterPizzas.length > 0) {
      this.selectPizza(this.counterPizzas[this.counterPizzas.length - 1]);
    }
    const p = this.selectedPizza;
    if (!p) { this.flash('Tap + dough first!'); sfx.hmph(); return; }
    if (!hasStock(this.state, id, 1)) { sfx.hmph(); this.flash(`Out of ${id}!`); return; }
    this.state = { ...this.state, fridge: { ...this.state.fridge, [id]: this.state.fridge[id] - 1 } };
    p.toppings.push(id);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 35;
    const tx = p.sprite.x + Math.cos(angle) * r;
    const ty = p.sprite.y + Math.sin(angle) * r;
    const s = this.add.image(tx, ty, `topping-${id}`).setDisplaySize(40, 40);
    p.toppingSprites.push(s);
    sfx.tap();
    this.updateHud();
  }

  // === Ovens ===

  handleOven(idx) {
    const slot = this.ovenSlots[idx];
    const counterPizza = this.selectedPizza || this.counterPizzas[this.counterPizzas.length - 1];
    if (slot.pizzaSprite && counterPizza) {
      // SWAP: oven pizza comes out to counter, counter pizza goes in
      this.swapOven(idx, counterPizza);
    } else if (slot.pizzaSprite) {
      // Just take out (no auto-serve)
      this.takeFromOven(idx);
    } else if (counterPizza) {
      this.putInOven(idx, counterPizza);
    } else {
      sfx.hmph();
      this.flash('Nothing to put in — tap + dough first!');
    }
  }

  swapOven(idx, counterPizza) {
    const slot = this.ovenSlots[idx];
    const bakedPizza = slot.pizzaData;
    bakedPizza.bakeStage = slot.bakeStage;
    const counterSlot = counterPizza.slot;
    if (!counterSlot) { sfx.hmph(); return; }
    // Tween baked pizza → counter slot
    const bakedTarget = { x: counterSlot.x, y: counterSlot.y };
    this.tweens.add({ targets: bakedPizza.sprite, x: bakedTarget.x, y: bakedTarget.y, duration: 300 });
    const bpx = bakedPizza.sprite.x, bpy = bakedPizza.sprite.y;
    for (const t of bakedPizza.toppingSprites) {
      const dx = t.x - bpx, dy = t.y - bpy;
      this.tweens.add({ targets: t, x: bakedTarget.x + dx, y: bakedTarget.y + dy, duration: 300 });
    }
    // Tween counter pizza → oven
    this.tweens.add({ targets: counterPizza.sprite, x: slot.x, y: slot.y, duration: 300 });
    const cpx = counterPizza.sprite.x, cpy = counterPizza.sprite.y;
    for (const t of counterPizza.toppingSprites) {
      const dx = t.x - cpx, dy = t.y - cpy;
      this.tweens.add({ targets: t, x: slot.x + dx, y: slot.y + dy, duration: 300 });
    }
    // Rewire slot ownership
    counterSlot.occupied = bakedPizza;
    bakedPizza.slot = counterSlot;
    this.counterPizzas = this.counterPizzas.filter((x) => x !== counterPizza);
    this.counterPizzas.push(bakedPizza);
    counterPizza.slot = null;
    slot.pizzaSprite = counterPizza.sprite;
    slot.pizzaData = counterPizza;
    slot.bakeTime = 0;
    slot.bakeStage = 'raw';
    this.selectPizza(bakedPizza); // select the now-on-counter baked pizza
    sfx.sizzle();
    this.flash('🔄 Swapped! Tap a customer to serve.');
  }

  putInOven(idx, p) {
    const slot = this.ovenSlots[idx];
    this.tweens.add({ targets: p.sprite, x: slot.x, y: slot.y, duration: 300 });
    const px = p.sprite.x, py = p.sprite.y;
    for (const t of p.toppingSprites) {
      const dx = t.x - px, dy = t.y - py;
      this.tweens.add({ targets: t, x: slot.x + dx, y: slot.y + dy, duration: 300 });
    }
    slot.pizzaSprite = p.sprite;
    slot.pizzaData = p;
    slot.bakeTime = 0;
    slot.bakeStage = 'raw';
    // Free the counter slot
    if (p.slot) { p.slot.occupied = null; p.slot = null; }
    this.counterPizzas = this.counterPizzas.filter((x) => x !== p);
    if (this.selectedPizza === p) this.selectPizza(null);
    sfx.sizzle();
  }

  takeFromOven(idx) {
    const slot = this.ovenSlots[idx];
    const p = slot.pizzaData;
    p.bakeStage = slot.bakeStage;
    // Find a free counter slot; if none, pizza is served directly to the first waiting customer
    const freeSlot = this.firstFreeCounterSlot();
    if (!freeSlot) {
      // Hand straight to oldest customer if any; otherwise refuse (keep in oven)
      sfx.hmph();
      this.flash('Counter full — bin or serve one first!');
      return;
    }
    this.tweens.add({ targets: p.sprite, x: freeSlot.x, y: freeSlot.y, duration: 300 });
    const px = p.sprite.x, py = p.sprite.y;
    for (const t of p.toppingSprites) {
      const dx = t.x - px, dy = t.y - py;
      this.tweens.add({ targets: t, x: freeSlot.x + dx, y: freeSlot.y + dy, duration: 300 });
    }
    freeSlot.occupied = p; p.slot = freeSlot;
    this.counterPizzas.push(p);
    slot.pizzaSprite = null; slot.pizzaData = null; slot.bakeTime = 0; slot.bakeStage = 'raw';
    sfx.pop();
    this.selectPizza(p);
    this.flash('Baked! Tap the right customer to serve.');
  }

  // === Serving / bin ===

  servePizza(customer, pizzaArg) {
    const p = pizzaArg || this.selectedPizza || this.counterPizzas[0];
    if (!p) return;
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
    this.showServedFeedback(customer, stars, paid);
    this.destroyPizza(p);
    this.removeCustomer(customer, true);
    this.updateHud();
  }

  binSelected() {
    const p = this.selectedPizza || this.counterPizzas[this.counterPizzas.length - 1];
    if (!p) return;
    this.destroyPizza(p);
    sfx.hmph();
  }

  destroyPizza(p) {
    p.sprite.destroy();
    for (const t of p.toppingSprites) t.destroy();
    if (p.slot) { p.slot.occupied = null; p.slot = null; }
    this.counterPizzas = this.counterPizzas.filter((x) => x !== p);
    if (this.selectedPizza === p) this.selectPizza(null);
  }

  showServedFeedback(customer, stars, paid) {
    const t = this.add.text(customer.x, customer.y - 100, `${'⭐'.repeat(stars)}  £${paid}`, { fontFamily: 'Georgia', fontSize: '36px', color: '#1a1a1a', fontStyle: 'bold', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
  }

  tick(dt) {
    this.elapsed += dt;
    // Keep selection ring glued to selected pizza
    if (this.selectedPizza && this.selRing && this.selRing.visible) {
      this.selRing.setPosition(this.selectedPizza.sprite.x, this.selectedPizza.sprite.y);
    }
    while (this.queue.length > 0 && this.queue[0].arrivalAt <= this.elapsed) {
      const next = this.queue.shift();
      this.spawnCustomer(next);
    }
    const toLeave = [];
    for (const c of this.activeCustomers) {
      c.waited += dt;
      const frac = c.waited / c.order.patienceSeconds;
      if (frac < 0.5) c.waitState = WAIT.HAPPY;
      else if (frac < 1.0) c.waitState = WAIT.NEUTRAL;
      else c.waitState = WAIT.GRUMPY;
      c.faceSprite.setTexture(`face-${c.waitState}`);
      if (frac >= 1.3) toLeave.push(c);
    }
    for (const c of toLeave) { sfx.hmph(); this.removeCustomer(c, false); }
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
    if (this.elapsed >= this.dayLen && this.activeCustomers.length === 0 && this.queue.length === 0) {
      this.endService();
    } else if (this.elapsed >= this.dayLen + 30) {
      this.endService();
    }
  }

  spawnCustomer(order) {
    const slot = this.customerSlots.find((s) => !s.occupied);
    if (!slot) { this.queue.unshift({ ...order, arrivalAt: this.elapsed + 2 }); return; }
    slot.occupied = true;
    const sprite = this.add.image(slot.x, slot.y, `customer-${order.customerId}`); sprite.setScale(190 / Math.max(sprite.width, sprite.height));
    const face = this.add.image(slot.x + 60, slot.y - 80, 'face-happy').setDisplaySize(44, 44);
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
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => this.servePizza(customer));
  }

  removeCustomer(customer, served) {
    customer.sprite.destroy(); customer.faceSprite.destroy(); customer.bubble.destroy();
    customer.slot.occupied = false;
    this.activeCustomers = this.activeCustomers.filter((c) => c !== customer);
  }

  flash(msg) {
    const t = this.add.text(this.counterX, this.counterY - 170, msg, { fontFamily: 'Georgia', fontSize: '24px', color: '#d94a3f', fontStyle: 'bold', backgroundColor: '#fff', padding: { x: 10, y: 6 } }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }

  endService() {
    this.scene.start('Summary', { state: this.state, coinsEarned: this.coinsEarned, starsEarned: this.starsEarned, pizzasServed: this.pizzasServed });
  }
}
