import { test, expect } from '@playwright/test';

test('on a wide screen a scrolling row runs to the screen edge and its arrows move it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'arrows show from 900px');
  await page.goto('/videos');
  const wrap = page.locator('.rail-wrap[data-overflow]').first();
  await wrap.scrollIntoViewIfNeeded();
  const rail = wrap.locator('.rail');
  const right = await rail.evaluate(el => el.getBoundingClientRect().right);
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  expect(right).toBeGreaterThanOrEqual(viewport - 1);
  const previous = wrap.getByRole('button', { name: 'Previous' });
  const next = wrap.getByRole('button', { name: 'Next' });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await expect(previous).toBeEnabled();
});

test('rows that fit have no arrows, and phones swipe without them', async ({ page }, info) => {
  await page.goto('/videos');
  if (info.project.name === 'mobile') {
    await expect(page.locator('.rail-wrap button:visible')).toHaveCount(0);
  } else {
    for (const wrap of await page.locator('.rail-wrap:not([data-overflow])').all()) await expect(wrap.locator('button:visible')).toHaveCount(0);
  }
});
