import { test, expect } from '@playwright/test';

test('the line draws and the owl travels as you scroll', async ({ page }) => {
  await page.goto('/story');
  const progress = page.locator('[data-timeline-progress]');
  const scale = () => progress.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).d);
  const owlY = () => page.locator('[data-timeline-owl]').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).f);
  const startScale = await scale();
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-timeline]')!;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2 - window.innerHeight * 0.6);
  });
  await page.waitForTimeout(400);
  expect(await scale()).toBeGreaterThan(startScale + 0.2);
  expect(await owlY()).toBeGreaterThan(100);
});

test('every chapter is readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/story');
  const chapters = page.locator('li.chapter');
  await expect(chapters).toHaveCount(14);
  const hidden = await chapters.evaluateAll(els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  expect(hidden).toBe(0);
  const scale = await page.locator('[data-timeline-progress]').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).d);
  expect(scale).toBe(1);
});

test('the sticky year follows the reader on phones', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/story');
  await page.locator('li.chapter[data-year="2018"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-timeline-now]')).toHaveText('2018', { timeout: 3000 });
});
