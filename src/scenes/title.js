import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { clearSave } from '../rules/save.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  init(data) { this.state = data.state; }

  create() {
    const { width, height } = this.scale;
    // Warm background
    this.cameras.main.setBackgroundColor('#ffb347');
    // Decorative pizza slices
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const img = this.add.image(x, y, 'logo').setScale(0.3).setAlpha(0.15);
      img.setAngle(Phaser.Math.Between(0, 360));
    }

    this.add.image(width / 2, 180, 'logo').setScale(1.0);
    this.add.text(width / 2, 320, "Zofia's Pizzeria", {
      fontFamily: 'Georgia, serif', fontSize: '72px', color: '#2a1a0e',
      fontStyle: 'bold', stroke: '#fff', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, 400, `Day ${this.state.day}  ·  £${this.state.money}  ·  ⭐ ${this.state.reputation}`, {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: '#2a1a0e',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, 540, 360, 96, 0x4caf50).setStrokeStyle(6, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 540, 'Open the shop!', { fontFamily: 'Georgia, serif', fontSize: '42px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerdown', () => { sfx.tap(); this.scene.start('Morning', { state: this.state }); });

    // Reset button bottom-right (tiny)
    const reset = this.add.text(width - 24, height - 24, 'start over', { fontFamily: 'system-ui', fontSize: '18px', color: '#2a1a0e' }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    reset.on('pointerdown', () => {
      sfx.tap();
      if (window.confirm('Start a brand new game? Your shop will be lost.')) {
        clearSave();
        window.location.reload();
      }
    });

    this.add.text(width / 2, height - 24, "a game by Zofia & Dad  ·  made with ❤", {
      fontFamily: 'system-ui', fontSize: '18px', color: '#2a1a0e',
    }).setOrigin(0.5, 1);
  }
}
