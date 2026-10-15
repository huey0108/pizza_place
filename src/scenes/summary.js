import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { endDay, nextDay } from '../rules/day.js';
import { saveGame } from '../rules/save.js';

export class SummaryScene extends Phaser.Scene {
  constructor() { super('Summary'); }
  init(data) {
    this.result = data;
    this.state = endDay(data.state, { coinsEarned: data.coinsEarned, starsEarned: data.starsEarned, pizzasServed: data.pizzasServed });
    saveGame(this.state);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2a1a0e');

    this.add.text(width / 2, 80, `End of Day ${this.result.state.day}`, {
      fontFamily: 'Georgia', fontSize: '56px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    const rows = [
      ['Pizzas served', `${this.result.pizzasServed}`],
      ['Stars earned',  `⭐ ${this.result.starsEarned}`],
      ['Coins earned',  `£${this.result.coinsEarned}`],
      ['Total money',   `£${this.state.money}`],
      ['Reputation',    `${this.state.reputation}`],
    ];
    rows.forEach((row, i) => {
      const y = 200 + i * 60;
      this.add.text(width / 2 - 200, y, row[0], { fontFamily: 'Georgia', fontSize: '32px', color: '#fff' }).setOrigin(0, 0.5);
      this.add.text(width / 2 + 200, y, row[1], { fontFamily: 'Georgia', fontSize: '32px', color: '#ffd700' }).setOrigin(1, 0.5);
    });

    // Confetti-ish bursts
    sfx.party();
    for (let i = 0; i < 20; i++) {
      const c = this.add.circle(width / 2 + (Math.random() - 0.5) * 400, 150, 6, Phaser.Display.Color.RandomRGB().color);
      this.tweens.add({ targets: c, y: height + 50, x: c.x + (Math.random() - 0.5) * 200, duration: 2000 + Math.random() * 1000, onComplete: () => c.destroy() });
    }

    // Day 10 celebration
    if (this.state.day === 10 && this.state.stats.totalEarned >= 150) {
      this.add.text(width / 2, 560, '🏆 Pizzeria of the Year! 🏆', {
        fontFamily: 'Georgia', fontSize: '42px', color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    const btn = this.add.rectangle(width / 2, height - 100, 420, 90, 0x4caf50).setStrokeStyle(6, 0xffd700).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 100, 'Shop upgrades →', { fontFamily: 'Georgia', fontSize: '38px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      sfx.tap();
      this.scene.start('Upgrades', { state: nextDay(this.state) });
    });
  }
}
