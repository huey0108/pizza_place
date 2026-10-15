import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { applyUpgrade, canAfford } from '../rules/economy.js';
import { saveGame } from '../rules/save.js';
import upgradesData from '../data/upgrades.json';

export class UpgradesScene extends Phaser.Scene {
  constructor() { super('Upgrades'); }
  init(data) { this.state = data.state; saveGame(this.state); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f5c842');

    this.add.text(width / 2, 60, 'Shop Upgrades', { fontFamily: 'Georgia', fontSize: '48px', color: '#2a1a0e', fontStyle: 'bold' }).setOrigin(0.5);
    this.moneyText = this.add.text(width - 40, 60, `£${this.state.money}`, { fontFamily: 'Georgia', fontSize: '36px', color: '#2a1a0e' }).setOrigin(1, 0.5);

    const available = upgradesData.filter((u) => u.unlockDay <= this.state.day && !this.state.upgrades.includes(u.id));
    if (available.length === 0) {
      this.add.text(width / 2, height / 2, 'Nothing new today.', { fontFamily: 'Georgia', fontSize: '32px', color: '#2a1a0e' }).setOrigin(0.5);
    }
    available.forEach((u, i) => {
      const y = 180 + i * 110;
      const bg = this.add.rectangle(width / 2, y, 600, 90, 0xffffff).setStrokeStyle(4, 0x2a1a0e).setInteractive({ useHandCursor: true });
      this.add.text(width / 2 - 280, y, u.name, { fontFamily: 'Georgia', fontSize: '28px', color: '#2a1a0e' }).setOrigin(0, 0.5);
      this.add.text(width / 2 + 280, y, `£${u.cost}`, { fontFamily: 'Georgia', fontSize: '32px', color: '#2a1a0e', fontStyle: 'bold' }).setOrigin(1, 0.5);
      bg.on('pointerdown', () => {
        if (!canAfford(this.state, u.cost)) { sfx.hmph(); return; }
        this.state = applyUpgrade(this.state, u);
        saveGame(this.state);
        sfx.star();
        this.scene.restart({ state: this.state });
      });
    });

    const btn = this.add.rectangle(width / 2, height - 80, 420, 90, 0x4caf50).setStrokeStyle(6, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 80, `Start Day ${this.state.day} →`, { fontFamily: 'Georgia', fontSize: '38px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerdown', () => { sfx.tap(); this.scene.start('Morning', { state: this.state }); });
  }
}
