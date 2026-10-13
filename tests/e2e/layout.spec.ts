import { test, expect } from '@playwright/test';
import { PAGES } from './pages';

test('no horizontal overflow on a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('menu opens, lists all four groups and closes with Escape', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const menu = page.locator('#site-menu');
  await expect(menu).toBeVisible();
  for (const group of ['About us', 'Learn', 'Proof', 'Join']) await expect(menu.getByRole('heading', { name: group })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('phone bar offers a demo and a call while WhatsApp is unset', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/');
  const bar = page.locator('.mobile-bar');
  await expect(bar.getByRole('link', { name: 'Book free demo' })).toBeVisible();
  await expect(bar.locator('a[href="tel:+918891910919"]')).toBeVisible();
  await expect(bar.getByText('WhatsApp')).toHaveCount(0);
});

test('every phone link is tel-safe', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="tel:"]').evaluateAll(links => links.map(a => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThanOrEqual(10);
  for (const href of hrefs) expect(href).toMatch(/^tel:\+91[6-9]\d{9}$/);
});

test('without JavaScript the menu link jumps to the footer navigation', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('href', '#footer-nav');
  await expect(page.locator('#footer-nav')).toBeVisible();
  await context.close();
});

test('unknown pages show the branded 404 with status 404', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("We couldn't find that page");
});

test('keyboard focus stays inside the open menu', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && (!!el.closest('#site-menu') || el.matches('[data-menu-toggle]') || el.closest('.site-header') !== null);
    });
    expect(inside, `Tab ${i + 1} left the menu`).toBe(true);
  }
});

test('proof numbers fit their boxes on a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const overflowing = await page.locator('.stat').evaluateAll(stats => stats.filter(s => {
    const value = s.querySelector('.stat-value') as HTMLElement;
    return value.scrollWidth > s.clientWidth;
  }).length);
  expect(overflowing).toBe(0);
});

test('phone, email and breadcrumb links on inner pages are at least 44px tall', async ({ page }) => {
  for (const [path, selector] of [['/contact', '.lines a'], ['/demo', '.near a'], ['/blog/board-exam-90-day-plan', '.eyebrow a, .share a, .related a']]) {
    await page.goto(path);
    const heights = await page.locator(selector).evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
    expect(heights.length, path).toBeGreaterThan(0);
    for (const h of heights) expect(h, `${path} ${selector}`).toBeGreaterThanOrEqual(44);
  }
});
