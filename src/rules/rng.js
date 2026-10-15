// Deterministic seeded RNG (Mulberry32). All randomness in the game flows through this.
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return {
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; },
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
    pickWeighted(arr, weightFn = (x) => x.weight ?? 1) {
      const total = arr.reduce((a, x) => a + weightFn(x), 0);
      let r = this.next() * total;
      for (const x of arr) { r -= weightFn(x); if (r <= 0) return x; }
      return arr[arr.length - 1];
    },
    chance(p) { return this.next() < p; },
  };
}
