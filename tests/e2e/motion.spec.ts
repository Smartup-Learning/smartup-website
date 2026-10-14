import { test, expect } from '@playwright/test';
import { gzipSync } from 'node:zlib';

const FINAL = ['12+', '9', '30,000+', '107'];

test('proof numbers count up to their final values', async ({ page }) => {
  await page.goto('/');
  await page.locator('.stats').scrollIntoViewIfNeeded();
  const values = page.locator('.stats [data-count-to]');
  await expect(values).toHaveText(FINAL, { timeout: 5000 });
});

test('with reduced motion everything is visible at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.stats [data-count-to]')).toHaveText(FINAL);
  const hidden = await page.locator('[data-reveal], [data-reveal-item]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  expect(hidden).toBe(0);
});

test('without JavaScript numbers and content are visible', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.stats [data-count-to]')).toHaveText(FINAL);
  const hidden = await page.locator('[data-reveal], [data-reveal-item]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  expect(hidden).toBe(0);
  await context.close();
});

test('the owl renders with two animatable eyes', async ({ page }) => {
  await page.goto('/');
  const owl = page.locator('svg.owl').first();
  await expect(owl).toBeVisible();
  await expect(owl.locator('g.owl-eye')).toHaveCount(2);
});

test('page JavaScript stays under 50 KB gzipped', async ({ page, request }) => {
  const scripts = new Set<string>();
  page.on('response', r => { if (r.request().resourceType() === 'script') scripts.add(r.url()); });
  for (const path of ['/', '/story']) await page.goto(path);
  let total = 0;
  for (const url of scripts) total += gzipSync(await (await request.get(url)).body()).length;
  expect(total).toBeLessThan(50 * 1024);
});

for (const path of ['/faculty', '/results']) {
  test(`every card in the longest grid on ${path} appears on a small phone`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4173${path}`);
    const groups = page.locator('[data-reveal="group"]');
    const sizes = await groups.evaluateAll(els => els.map(e => e.querySelectorAll('[data-reveal-item]').length));
    // Cards folded away behind "Show all" are not drawn, so the middle of the visible cards is checked.
    const items = groups.nth(sizes.indexOf(Math.max(...sizes))).locator('[data-reveal-item]:visible');
    const middle = items.nth(Math.floor((await items.count()) / 2));
    await middle.scrollIntoViewIfNeeded();
    await expect.poll(() => middle.evaluate(e => getComputedStyle(e).opacity), { timeout: 4000 }).toBe('1');
    await context.close();
  });
}
