import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { createRng } from '../rules/rng.js';
import { buildCustomerQueue } from '../rules/customers.js';
import { scorePizza, WAIT, payment } from '../rules/scoring.js';
import { hasStock, consume, ovenCount } from '../rules/economy.js';
import {
  newKitchen, startPizza, addTopping, tapOven, tapPizza, takeForCustomer,
  binPizza, tickOvens, bakeStage, bakeGrade, whereIs,
} from '../rules/kitchen.js';
import economyData from '../data/economy.json';
import recipesData from '../data/recipes.json';
import customersData from '../data/customers.json';

const BAKE_SECONDS = economyData.bakeSeconds;
const PIZZA_SIZE = 130;

// Toppings sit on a golden-angle spiral so they spread out without randomness.
function toppingOffset(i) {
  const angle = i * 2.39996, r = 14 + (i % 3) * 10;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

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
    this.kitchen = newKitchen({ ovens: ovenCount(this.state), counterSlots: economyData.counterSlots });
    this.pizzaViews = new Map();  // pizza id → { sprite, toppings, offsets, x, y, stage }
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
    this.selRing.setDepth(5);
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
    // Counter positions side-by-side, centred on the counter
    const n = economyData.counterSlots;
    this.counterSlots = Array.from({ length: n }, (_, i) => ({ x: counterX + (i - (n - 1) / 2) * 140, y: counterY }));

    const newBtn = this.add.rectangle(counterX - 220, counterY + 10, 110, 80, 0xffb347, 0.95).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(counterX - 220, counterY + 10, '+ dough', { fontFamily: 'Georgia', fontSize: '20px', color: '#2a1a0e', fontStyle: 'bold' }).setOrigin(0.5);
    newBtn.on('pointerdown', () => this.startPizza());

    const bin = this.add.rectangle(counterX + 220, counterY + 10, 110, 80, 0x555, 0.95).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(counterX + 220, counterY + 10, '🗑 bin', { fontFamily: 'Georgia', fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    bin.on('pointerdown', () => this.binSelected());

    // Ovens: overlay invisible interaction zones on top of baked-in oven art
    const ovenPositions = [{ x: 240, y: 180 }, { x: 820, y: 180 }];
    this.ovenSlots = this.kitchen.ovens.map((_, i) => {
      const pos = ovenPositions[i] || { x: 200 + i * 220, y: 200 };
      if (i >= 1) { const o = this.add.image(pos.x, pos.y, 'oven'); o.setScale(200 / Math.max(o.width, o.height)); }
      const zone = this.add.rectangle(pos.x, pos.y, 200, 150, 0x000, 0.01).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.handleOven(i));
      return { x: pos.x, y: pos.y };
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

  // === Kitchen state → sprites ===

  apply(result) {
    this.kitchen = result.kitchen;
    this.renderKitchen();
    return result;
  }

  slotPos(where) {
    return where.place === 'counter' ? this.counterSlots[where.index] : this.ovenSlots[where.index];
  }

  // Sync sprites to this.kitchen: create new pizzas, slide moved ones, retexture on bake, drop gone ones.
  renderKitchen() {
    const k = this.kitchen;
    for (const [id, view] of this.pizzaViews) {
      if (!k.pizzas[id]) { this.destroyView(view); this.pizzaViews.delete(id); }
    }
    for (const p of Object.values(k.pizzas)) {
      const pos = this.slotPos(whereIs(k, p.id));
      let view = this.pizzaViews.get(p.id);
      if (!view) {
        const sprite = this.add.image(pos.x, pos.y, 'pizza-base-raw').setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => this.onPizzaTap(p.id));
        view = { sprite, toppings: [], offsets: [], x: pos.x, y: pos.y, stage: null };
        this.pizzaViews.set(p.id, view);
      }
      while (view.toppings.length < p.toppings.length) {
        const i = view.toppings.length;
        const [dx, dy] = toppingOffset(i);
        view.offsets.push([dx, dy]);
        view.toppings.push(this.add.image(view.x + dx, view.y + dy, `topping-${p.toppings[i]}`).setDisplaySize(40, 40));
      }
      if (view.x !== pos.x || view.y !== pos.y) {
        view.x = pos.x; view.y = pos.y;
        this.tweens.add({ targets: view.sprite, x: pos.x, y: pos.y, duration: 300 });
        view.toppings.forEach((t, i) => {
          this.tweens.add({ targets: t, x: pos.x + view.offsets[i][0], y: pos.y + view.offsets[i][1], duration: 300 });
        });
      }
      const stage = bakeStage(p.bakeTime, BAKE_SECONDS);
      if (stage !== view.stage) {
        const tex = (stage === 'burnt') ? 'pizza-base-burnt' : (stage === 'raw') ? 'pizza-base-raw' : 'pizza-base-golden';
        view.sprite.setTexture(tex);
        view.sprite.setScale(PIZZA_SIZE / Math.max(view.sprite.width, view.sprite.height));
        if (stage === 'burnt' && view.stage !== null) sfx.burn();
        view.stage = stage;
      }
    }
    this.updateSelRing();
  }

  updateSelRing() {
    const view = this.kitchen.selected != null ? this.pizzaViews.get(this.kitchen.selected) : null;
    if (view) this.selRing.setPosition(view.sprite.x, view.sprite.y).setVisible(true);
    else this.selRing.setVisible(false);
  }

  destroyView(view) {
    view.sprite.destroy();
    for (const t of view.toppings) t.destroy();
  }

  // === Counter ===

  startPizza() {
    const r = startPizza(this.kitchen);
    if (r.event === 'counterFull') { this.flash('Counter is full — bake or bin one first!'); sfx.hmph(); return; }
    if (!hasStock(this.state, 'dough', 1)) { sfx.hmph(); this.flash('Out of dough! Tap 🏠 to buy more.'); return; }
    this.state = consume(this.state, 'dough', 1);
    this.apply(r);
    sfx.pop();
    this.updateHud();
  }

  addTopping(id) {
    const r = addTopping(this.kitchen, id);
    if (r.event === 'noPizza') { this.flash('Tap + dough first!'); sfx.hmph(); return; }
    if (!hasStock(this.state, id, 1)) { sfx.hmph(); this.flash(`Out of ${id}!`); return; }
    this.state = consume(this.state, id, 1);
    this.apply(r);
    sfx.tap();
    this.updateHud();
  }

  onPizzaTap(id) {
    const r = tapPizza(this.kitchen, id, BAKE_SECONDS);
    if (r.event === 'selected') { sfx.tap(); this.apply(r); }
    else if (r.event !== 'ignored') this.ovenFeedback(r);
  }

  // === Ovens ===

  handleOven(idx) {
    this.ovenFeedback(tapOven(this.kitchen, idx, BAKE_SECONDS));
  }

  ovenFeedback(r) {
    switch (r.event) {
      case 'inserted': this.apply(r); sfx.sizzle(); break;
      case 'swapped': this.apply(r); sfx.sizzle(); this.flash('🔄 Swapped! Tap a customer to serve.'); break;
      case 'takenOut': this.apply(r); sfx.pop(); this.flash('Baked! Tap a customer to serve.'); break;
      case 'notReady': sfx.hmph(); this.flash('⏳ Still baking…'); break;
      case 'counterFull': sfx.hmph(); this.flash('Counter full — serve or bin one first!'); break;
      case 'needsToppings': sfx.hmph(); this.flash('Add toppings first!'); break;
      default: sfx.hmph(); this.flash('Nothing to put in — tap + dough first!');
    }
  }

  // === Serving / bin ===

  servePizza(customer) {
    const r = takeForCustomer(this.kitchen, customer.order.requiredToppings, BAKE_SECONDS);
    if (!r.pizza) {
      sfx.hmph();
      this.flash(r.event === 'notReady' ? '⏳ Still baking…' : 'Bake a pizza first!');
      return;
    }
    // Slide the served pizza to the customer before it disappears
    const view = this.pizzaViews.get(r.pizza.id);
    if (view) {
      this.pizzaViews.delete(r.pizza.id);
      this.tweens.add({
        targets: [view.sprite, ...view.toppings], x: customer.x, y: customer.y, alpha: 0, duration: 350,
        onComplete: () => this.destroyView(view),
      });
    }
    this.apply(r);
    const { stars } = scorePizza({
      requiredToppings: customer.order.requiredToppings,
      placedToppings: r.pizza.toppings,
      bake: bakeGrade(bakeStage(r.pizza.bakeTime, BAKE_SECONDS)),
      wait: customer.waitState,
    });
    const paid = payment({ menuPrice: customer.order.menuPrice, stars, tipByStars: economyData.tipByStars, tipMultiplier: customer.order.tipMultiplier });
    this.coinsEarned += paid;
    this.starsEarned += stars;
    this.pizzasServed += 1;
    sfx.coin();
    if (stars === 3) sfx.star();
    else if (stars === 1) sfx.hmph();
    this.showServedFeedback(customer, stars, paid);
    this.removeCustomer(customer, true);
    this.updateHud();
  }

  binSelected() {
    const r = binPizza(this.kitchen);
    if (r.event !== 'binned') return;
    this.apply(r);
    sfx.hmph();
  }

  showServedFeedback(customer, stars, paid) {
    const t = this.add.text(customer.x, customer.y - 100, `${'⭐'.repeat(stars)}  £${paid}`, { fontFamily: 'Georgia', fontSize: '36px', color: '#1a1a1a', fontStyle: 'bold', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
  }

  tick(dt) {
    this.elapsed += dt;
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
    this.kitchen = tickOvens(this.kitchen, dt);
    this.renderKitchen();
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
