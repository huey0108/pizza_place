import Phaser from 'phaser';
import { TitleScene } from './scenes/title.js';
import { MorningScene } from './scenes/morning.js';
import { KitchenScene } from './scenes/kitchen.js';
import { SummaryScene } from './scenes/summary.js';
import { UpgradesScene } from './scenes/upgrades.js';
import { loadArtAsBlobUrls, ART_KEYS } from './ui/assets.js';
import { loadGame } from './rules/save.js';

const WIDTH = 1024;
const HEIGHT = 768;

async function boot() {
  // Pre-fetch art as blob URLs; Phaser then loads them in its own Preload.
  const base = import.meta.env.BASE_URL || '/';
  const artUrls = await loadArtAsBlobUrls(`${base}assets/art/`);

  class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    for (const key of ART_KEYS) this.load.image(key, artUrls[key]);
    this.load.image('bg-title',   `${base}assets/bg/title.png`);
    this.load.image('bg-kitchen', `${base}assets/bg/kitchen.png`);
  }
    create() {
      const state = loadGame();
      this.scene.start('Title', { state });
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#2b1a0f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WIDTH,
      height: HEIGHT,
    },
    scene: [BootScene, TitleScene, MorningScene, KitchenScene, SummaryScene, UpgradesScene],
    input: { activePointers: 3 },
  };

  // Clear "Loading…" placeholder.
  const el = document.getElementById('game');
  if (el) el.innerHTML = '';
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  const el = document.getElementById('game');
  if (el) el.innerHTML = `<div style="color:#ff6b6b;padding:40px;font-family:system-ui">Game failed to start: ${err.message}</div>`;
});

export { WIDTH, HEIGHT };
