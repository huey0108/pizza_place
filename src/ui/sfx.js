// WebAudio-synthesized sound effects. No external files needed.
// Lazily creates one AudioContext on first user interaction.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* ignore */ }
  return ctx;
}

export function setMuted(v) { muted = !!v; }
export function isMuted() { return muted; }

function tone({ freq = 440, duration = 0.15, type = 'sine', gain = 0.2, sweep = 0 }) {
  if (muted) return;
  const c = ensureCtx(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (sweep) o.frequency.linearRampToValueAtTime(freq + sweep, c.currentTime + duration);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  o.connect(g); g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + duration);
}

function noise({ duration = 0.3, gain = 0.1 }) {
  if (muted) return;
  const c = ensureCtx(); if (!c) return;
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(g); g.connect(c.destination);
  src.start();
}

export const sfx = {
  tap:    () => tone({ freq: 600, duration: 0.06, type: 'square', gain: 0.08 }),
  pop:    () => tone({ freq: 300, duration: 0.1,  type: 'triangle', sweep: 200 }),
  ding:   () => { tone({ freq: 880, duration: 0.12 }); setTimeout(() => tone({ freq: 1320, duration: 0.18 }), 80); },
  yum:    () => { tone({ freq: 500, duration: 0.1, type: 'triangle', sweep: 300 }); setTimeout(() => tone({ freq: 800, duration: 0.15, type: 'triangle' }), 90); },
  hmph:   () => tone({ freq: 300, duration: 0.3, type: 'sawtooth', sweep: -150, gain: 0.15 }),
  sizzle: () => noise({ duration: 0.4, gain: 0.05 }),
  coin:   () => { tone({ freq: 1200, duration: 0.08, type: 'square' }); setTimeout(() => tone({ freq: 1800, duration: 0.08, type: 'square' }), 50); },
  burn:   () => tone({ freq: 200, duration: 0.4, type: 'sawtooth', sweep: -100, gain: 0.2 }),
  star:   () => { tone({ freq: 800, duration: 0.08, type: 'triangle' }); setTimeout(() => tone({ freq: 1200, duration: 0.08, type: 'triangle' }), 60); setTimeout(() => tone({ freq: 1600, duration: 0.15, type: 'triangle' }), 120); },
  party:  () => { for (let i = 0; i < 5; i++) setTimeout(() => tone({ freq: 400 + i * 200, duration: 0.1, type: 'triangle' }), i * 80); },
};
