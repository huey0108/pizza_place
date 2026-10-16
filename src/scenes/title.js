import Phaser from 'phaser';
import { sfx } from '../ui/sfx.js';
import { clearSave } from '../rules/save.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  init(data) {
    this.state = data.state;
    this.resumeFromKitchen = !!data.resumeFromKitchen;
  }

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

    const btnLabel = this.resumeFromKitchen ? '▶ Back to the kitchen!' : 'Open the shop!';
    const btn = this.add.rectangle(width / 2, 540, 440, 96, 0x4caf50).setStrokeStyle(6, 0x2a1a0e).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 540, btnLabel, { fontFamily: 'Georgia, serif', fontSize: '38px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      sfx.tap();
      if (this.resumeFromKitchen) {
        // Wake the paused Kitchen scene and stop ourselves (we were launched, not started)
        this.scene.wake('Kitchen');
        this.scene.stop();
      } else {
        this.scene.start('Morning', { state: this.state });
      }
    });

    // When paused mid-day, hint that time is frozen and show a tiny "end day now" escape hatch
    if (this.resumeFromKitchen) {
      this.add.text(width / 2, 620, '⏸ The clock is paused — take your time!', {
        fontFamily: 'Georgia', fontSize: '22px', color: '#fff6e0',
        stroke: '#2a1a0e', strokeThickness: 4,
      }).setOrigin(0.5);
    }

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
