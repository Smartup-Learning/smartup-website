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

// Opacity of an element on each frame after it is scrolled into view.
const opacitiesAfterScroll = (page: import('@playwright/test').Page, selector: string) => page.evaluate(sel => new Promise<number[]>(resolve => {
  const element = document.querySelector(sel)!;
  const seen: number[] = [];
  const tick = () => { seen.push(Number(getComputedStyle(element).opacity)); if (seen.length < 50) requestAnimationFrame(tick); else resolve(seen); };
  element.scrollIntoView({ block: 'center', behavior: 'instant' });
  tick();
}), selector);
// A fade only ever gets brighter: a drop means the element was shown and then hidden again (a flicker).
const drops = (seen: number[]) => seen.filter((value, i) => i > 0 && value < seen[i - 1] - 0.01);

test('a card fading into view never flashes at full strength first', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __siteReady?: boolean }).__siteReady);
  for (const selector of ['#results .section-head', '#results [data-reveal-item]', '#feedback [data-reveal-item]']) {
    const seen = await opacitiesAfterScroll(page, selector);
    expect(drops(seen), `${selector}: ${seen.map(v => v.toFixed(2)).join(' ')}`).toEqual([]);
    expect(seen.at(-1)).toBeGreaterThan(0.5);
  }
});

test('on a connection too slow for the scripts, content the page already showed is not faded again', async ({ page }) => {
  // The scripts arrive after the 2.5 s backup timer has shown everything.
  await page.route('**/_astro/*.js', async route => { await new Promise(r => setTimeout(r, 3500)); await route.continue(); });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __siteReady?: boolean }).__siteReady, undefined, { timeout: 15000 });
  for (const selector of ['#results .section-head', '#results [data-reveal-item]']) {
    const seen = await opacitiesAfterScroll(page, selector);
    expect(seen.every(v => v === 1), `${selector}: ${seen.map(v => v.toFixed(2)).join(' ')}`).toBe(true);
  }
});

test('on the violet bands a poster waits on a soft violet placeholder, not a pale box that flashes', async ({ page }) => {
  await page.goto('/');
  const shades = await page.locator('#results .poster').first().evaluate(poster => {
    const rgba = (color: string) => color.match(/[\d.]+/g)!.map(Number);
    const [r, g, b, a = 1] = rgba(getComputedStyle(poster).backgroundColor);
    const [sr, sg, sb] = rgba(getComputedStyle(poster.closest('section')!).backgroundColor);
    const mix = [r * a + sr * (1 - a), g * a + sg * (1 - a), b * a + sb * (1 - a)];
    const luminance = (c: number[]) => c.reduce((sum, v, i) => sum + [0.2126, 0.7152, 0.0722][i] * ((v / 255) <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4), 0);
    return { placeholder: luminance(mix), section: luminance([sr, sg, sb]) };
  });
  // Close to the band's own shade: the contrast between them stays under 1.5:1.
  expect((shades.placeholder + 0.05) / (shades.section + 0.05)).toBeLessThan(1.5);
});

test('the owl renders with two animatable eyes', async ({ page }) => {
  await page.goto('/');
  const owl = page.locator('.hero svg.owl').first();
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
