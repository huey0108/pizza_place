import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { buyIngredient, canAfford } from '../rules/economy.js';
import { saveGame } from '../rules/save.js';
import toppingsData from '../data/toppings.json';
import economyData from '../data/economy.json';

export class MorningScene extends Phaser.Scene {
  constructor() { super('Morning'); }
  init(data) { this.state = data.state; }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#8ec5e8');

    this.add.text(width / 2, 50, `Morning — Day ${this.state.day}`, {
      fontFamily: 'Georgia', fontSize: '48px', color: '#1a1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.moneyText = this.add.text(width - 40, 50, this.moneyLabel(), {
      fontFamily: 'Georgia', fontSize: '36px', color: '#1a1a1a',
    }).setOrigin(1, 0.5);

    this.add.text(width / 2, 110, 'Tap an ingredient to buy one portion (£1 each)', {
      fontFamily: 'system-ui', fontSize: '22px', color: '#1a1a1a',
    }).setOrigin(0.5);

    // Dough always available
    const items = [{ id: 'dough', name: 'Dough', color: '#f5e6c8', artKey: 'pizza-base-raw' }];
    for (const t of toppingsData) items.push({ id: t.id, name: t.name, color: t.color, artKey: `topping-${t.id}` });

    const cols = 4;
    const cellW = 200, cellH = 220;
    const gridW = cols * cellW;
    const startX = (width - gridW) / 2 + cellW / 2;
    const startY = 200;

    this.stockTexts = {};
    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;

      const bg = this.add.rectangle(x, y, cellW - 16, cellH - 16, 0xffffff, 0.9).setStrokeStyle(4, 0x1a1a1a).setInteractive({ useHandCursor: true });
      this.add.image(x, y - 30, item.artKey).setDisplaySize(80, 80);
      this.add.text(x, y + 30, item.name, { fontFamily: 'Georgia', fontSize: '22px', color: '#1a1a1a' }).setOrigin(0.5);
      const stock = this.add.text(x, y + 60, `in fridge: ${this.state.fridge[item.id] ?? 0}`, { fontFamily: 'system-ui', fontSize: '18px', color: '#555' }).setOrigin(0.5);
      this.stockTexts[item.id] = stock;

      bg.on('pointerdown', () => this.buyOne(item.id, bg));
    });

    // Start service button
    const startBtn = this.add.rectangle(width / 2, height - 80, 420, 90, 0x4caf50).setStrokeStyle(6, 0x1a1a1a).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 80, 'Open for business!', { fontFamily: 'Georgia', fontSize: '38px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    startBtn.on('pointerdown', () => {
      sfx.ding();
      saveGame(this.state);
      this.scene.start('Kitchen', { state: this.state });
    });
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
