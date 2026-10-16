import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { buyIngredient, canAfford } from '../rules/economy.js';
import { saveGame } from '../rules/save.js';
import toppingsData from '../data/toppings.json';
import economyData from '../data/economy.json';

export class MorningScene extends Phaser.Scene {
  constructor() { super('Morning'); }
  init(data) {
    this.state = data.state;
    // When true, Morning was launched as a pause-overlay from Kitchen; we must wake Kitchen on exit, not start it fresh.
    this.resumeFromKitchen = !!data.resumeFromKitchen;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#8ec5e8');

    // 3D fridge backdrop (fridge on left, clear wall on right for UI)
    const bg = this.add.image(width / 2, height / 2, 'bg-morning');
    const sx = width / bg.width, sy = height / bg.height;
    bg.setScale(Math.max(sx, sy));
    // Soft translucent panel over right half so buttons/text pop
    this.add.rectangle(width * 0.72, height / 2, width * 0.56, height, 0xffffff, 0.35);

    // Header
    const title = this.resumeFromKitchen
      ? `🏃 Quick trip to the fridge — Day ${this.state.day}`
      : `Morning — Day ${this.state.day}`;
    this.add.text(width - 30, 40, title, {
      fontFamily: 'Georgia', fontSize: '28px', color: '#1a1a1a', fontStyle: 'bold',
      stroke: '#fff', strokeThickness: 3,
    }).setOrigin(1, 0.5);

    this.moneyText = this.add.text(width - 30, 85, this.moneyLabel(), {
      fontFamily: 'Georgia', fontSize: '26px', color: '#1a1a1a',
      stroke: '#fff', strokeThickness: 3,
    }).setOrigin(1, 0.5);

    this.add.text(width - 30, 125, 'Tap to buy one portion — £1 each', {
      fontFamily: 'system-ui', fontSize: '17px', color: '#2a1a0e',
    }).setOrigin(1, 0.5);

    // Buy grid on the RIGHT half (over the clear wall area)
    const items = [{ id: 'dough', name: 'Dough', artKey: 'pizza-base-raw' }];
    for (const t of toppingsData) items.push({ id: t.id, name: t.name, artKey: `topping-${t.id}` });

    const cols = 2;
    const cellW = 180, cellH = 95;
    const gridW = cols * cellW;
    const gridRight = width - 40;
    const gridLeft = gridRight - gridW;
    const startY = 180;

    this.stockTexts = {};
    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridLeft + col * cellW + cellW / 2;
      const y = startY + row * cellH;

      const bg = this.add.rectangle(x, y, cellW - 14, cellH - 12, 0xffffff, 0.95).setStrokeStyle(3, 0x1a1a1a).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x - 55, y, item.artKey);
      icon.setScale(60 / Math.max(icon.width, icon.height));
      this.add.text(x - 10, y - 12, item.name, { fontFamily: 'Georgia', fontSize: '18px', color: '#1a1a1a', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const stock = this.add.text(x - 10, y + 14, `in fridge: ${this.state.fridge[item.id] ?? 0}`, { fontFamily: 'system-ui', fontSize: '15px', color: '#555' }).setOrigin(0, 0.5);
      this.stockTexts[item.id] = stock;
      bg.on('pointerdown', () => this.buyOne(item.id, bg));
    });

    // Primary action button
    const btnLabel = this.resumeFromKitchen ? '▶ Back to the kitchen!' : 'Open for business!';
    const startBtn = this.add.rectangle(gridLeft + gridW / 2, height - 80, gridW + 20, 90, 0x4caf50)
      .setStrokeStyle(6, 0x1a1a1a).setInteractive({ useHandCursor: true });
    this.add.text(gridLeft + gridW / 2, height - 80, btnLabel, {
      fontFamily: 'Georgia', fontSize: '28px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    startBtn.on('pointerdown', () => {
      sfx.ding();
      saveGame(this.state);
      if (this.resumeFromKitchen) {
        this.scene.wake('Kitchen', { state: this.state });
        this.scene.stop();
      } else {
        this.scene.start('Kitchen', { state: this.state });
      }
    });

    if (this.resumeFromKitchen) {
      this.add.text(gridLeft + gridW / 2, height - 150, '⏸ The clock is paused — buy what you need, then go back!', {
        fontFamily: 'Georgia', fontSize: '15px', color: '#2a1a0e', fontStyle: 'italic',
      }).setOrigin(0.5);
    }
  }

  moneyLabel() {
    return `£${this.state.money}  ·  ⭐ ${this.state.reputation}`;
  }

  buyOne(id, bg) {
    const cost = economyData.ingredientCosts[id] ?? 1;
    if (!canAfford(this.state, cost)) {
      sfx.hmph();
      this.tweens.add({ targets: bg, x: bg.x + 10, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    this.state = buyIngredient(this.state, id, 1, cost);
    this.stockTexts[id].setText(`in fridge: ${this.state.fridge[id] ?? 0}`);
    this.moneyText.setText(this.moneyLabel());
    sfx.coin();
    saveGame(this.state);
  }
}
