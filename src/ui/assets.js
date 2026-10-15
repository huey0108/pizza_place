// Asset keys and fallback inline SVGs for when files are missing.
// If /assets/art/<key>.svg exists it is loaded; otherwise an inline fallback is used.

export const ART_KEYS = [
  'pizza-base-raw', 'pizza-base-golden', 'pizza-base-burnt',
  'topping-sauce', 'topping-cheese', 'topping-pepperoni', 'topping-mushroom',
  'topping-pepper', 'topping-olive', 'topping-pineapple',
  'customer-regular', 'customer-hurry', 'customer-picky', 'customer-vip', 'customer-kid',
  'oven', 'coin', 'star', 'face-happy', 'face-neutral', 'face-grumpy', 'logo',
];

// Minimal fallbacks so the game never fails to load, even without the art agent.
function colorCircle(fill, stroke = '#000') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="56" fill="${fill}" stroke="${stroke}" stroke-width="4"/></svg>`;
}
function colorBlob(fill, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="52" fill="${fill}" stroke="#2a1a0e" stroke-width="4"/><text x="64" y="76" font-family="Arial Black" font-size="40" text-anchor="middle" fill="white">${label}</text></svg>`;
}
function customerBlob(bodyColor, hatColor = null) {
  const hat = hatColor ? `<rect x="40" y="18" width="48" height="12" fill="${hatColor}" stroke="#000" stroke-width="3"/><rect x="48" y="4" width="32" height="18" fill="${hatColor}" stroke="#000" stroke-width="3"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <ellipse cx="64" cy="100" rx="40" ry="24" fill="${bodyColor}" stroke="#000" stroke-width="3"/>
    <circle cx="64" cy="52" r="30" fill="#ffd9b3" stroke="#000" stroke-width="3"/>
    <circle cx="54" cy="50" r="4" fill="#000"/><circle cx="74" cy="50" r="4" fill="#000"/>
    <path d="M 50 64 Q 64 72 78 64" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${hat}
  </svg>`;
}

export const FALLBACK_SVGS = {
  'pizza-base-raw':    colorCircle('#f5e6c8', '#c9a97a'),
  'pizza-base-golden': colorCircle('#d9a05b', '#8b5a2b'),
  'pizza-base-burnt':  colorCircle('#3a2416', '#1a0e08'),
  'topping-sauce':     colorBlob('#d94a3f', ''),
  'topping-cheese':    colorBlob('#f4d35e', ''),
  'topping-pepperoni': colorBlob('#b84a3a', ''),
  'topping-mushroom':  colorBlob('#8b6f47', ''),
  'topping-pepper':    colorBlob('#4caf50', ''),
  'topping-olive':     colorBlob('#2d2d2d', ''),
  'topping-pineapple': colorBlob('#f5c842', ''),
  'customer-regular':  customerBlob('#5a9fd4'),
  'customer-hurry':    customerBlob('#e07a5f'),
  'customer-picky':    customerBlob('#81b29a'),
  'customer-vip':      customerBlob('#2a2a2a', '#1a1a1a'),
  'customer-kid':      customerBlob('#f4a6cd'),
  'oven': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 192"><rect x="8" y="8" width="240" height="176" fill="#8b4513" stroke="#3a1f0a" stroke-width="6" rx="20"/><ellipse cx="128" cy="104" rx="80" ry="60" fill="#1a0e08"/><ellipse cx="128" cy="104" rx="70" ry="50" fill="#ff6b35"/></svg>`,
  'coin': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="56" fill="#ffd700" stroke="#b8860b" stroke-width="4"/><text x="64" y="82" font-family="Georgia" font-size="60" font-weight="bold" text-anchor="middle" fill="#8b6508">£</text></svg>`,
  'star': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><polygon points="64,8 78,48 120,48 86,74 100,116 64,90 28,116 42,74 8,48 50,48" fill="#ffd700" stroke="#b8860b" stroke-width="3"/></svg>`,
  'face-happy':   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="52" fill="#7ed957" stroke="#000" stroke-width="4"/><circle cx="48" cy="54" r="5" fill="#000"/><circle cx="80" cy="54" r="5" fill="#000"/><path d="M 42 76 Q 64 94 86 76" stroke="#000" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  'face-neutral': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="52" fill="#ffd700" stroke="#000" stroke-width="4"/><circle cx="48" cy="54" r="5" fill="#000"/><circle cx="80" cy="54" r="5" fill="#000"/><line x1="42" y1="82" x2="86" y2="82" stroke="#000" stroke-width="5" stroke-linecap="round"/></svg>`,
  'face-grumpy':  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="52" fill="#ff6b6b" stroke="#000" stroke-width="4"/><circle cx="48" cy="54" r="5" fill="#000"/><circle cx="80" cy="54" r="5" fill="#000"/><path d="M 42 88 Q 64 72 86 88" stroke="#000" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  'logo': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><polygon points="200,20 360,180 40,180" fill="#f4c842" stroke="#8b5a2b" stroke-width="6"/><circle cx="160" cy="130" r="14" fill="#d94a3f"/><circle cx="240" cy="130" r="14" fill="#d94a3f"/><circle cx="200" cy="90" r="12" fill="#4caf50"/></svg>`,
};

// Convert SVG string to a Blob URL for Phaser to load as an image.
export function svgToUrl(svgString) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

// Try fetch from /assets/art/, fall back to inline FALLBACK_SVGS.
export async function loadArtAsBlobUrls(baseUrl = './assets/art/') {
  const out = {};
  await Promise.all(ART_KEYS.map(async (key) => {
    try {
      const res = await fetch(`${baseUrl}${key}.svg`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<svg')) {
          out[key] = svgToUrl(text);
          return;
        }
      }
    } catch (e) { /* fall through */ }
    out[key] = svgToUrl(FALLBACK_SVGS[key] ?? colorCircle('#888'));
  }));
  return out;
}
