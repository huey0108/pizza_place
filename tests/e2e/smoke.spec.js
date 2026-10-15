import { test, expect } from '@playwright/test';

test('game loads and shows the title', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('/');
  // Wait for Phaser canvas to appear
  await page.waitForSelector('#game canvas', { timeout: 15000 });
  // The scene renders inside canvas — give it a moment to animate in
  await page.waitForTimeout(1500);
  // No console errors
  expect(errors.filter((e) => !e.includes('AudioContext'))).toEqual([]);
});

test('canvas sized to viewport', async ({ page }) => {
  await page.goto('/');
  const canvas = await page.waitForSelector('#game canvas');
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(100);
  expect(box.height).toBeGreaterThan(100);
});
