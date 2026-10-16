import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { clearSave } from '../rules/save.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  init(data) { this.state = data.state; }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2a1a0e');

    // Full-bleed concept-art backdrop (shop exterior)
    const bg = this.add.image(width / 2, height / 2, 'bg-title');
    const sx = width / bg.width, sy = height / bg.height;
    bg.setScale(Math.max(sx, sy)); // cover

    // Soft readability overlay at top for title text
    this.add.rectangle(width / 2, 240, width, 320, 0x000000, 0.35);

    this.add.image(width / 2, 110, 'logo').setScale(0.75);
    this.add.text(width / 2, 240, "Zofia's Pizzeria", {
      fontFamily: 'Georgia, serif', fontSize: '72px', color: '#fff6e0',
      fontStyle: 'bold', stroke: '#2a1a0e', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, 320, `Day ${this.state.day}  ·  £${this.state.money}  ·  ⭐ ${this.state.reputation}`, {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#fff6e0',
      stroke: '#2a1a0e', strokeThickness: 5,
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
