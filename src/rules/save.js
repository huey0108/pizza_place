// Save/load via localStorage. The only impure module in rules/ — isolated.
import { migrate, newGameState } from './day.js';

const KEY = 'zofias-pizzeria-save-v1';

export function saveGame(state) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota, ignore */ }
}

export function loadGame() {
  if (typeof localStorage === 'undefined') return newGameState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newGameState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    return newGameState();
  }
}

export function clearSave() {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
