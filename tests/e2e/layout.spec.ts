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
  for (const group of ['About us', 'Learn', 'Results and reviews', 'Get started']) await expect(menu.getByRole('heading', { name: group })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page went on a study tour');
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

test('long text staff type keeps its line breaks on the website', async ({ page }) => {
  for (const [path, selector] of [['/ask', '[data-faq] details p'], ['/founders', '.leader .bio'], ['/story', '.chapter-story'], ['/life', '.summary']]) {
    await page.goto(path);
    expect(await page.locator(selector).first().evaluate(el => getComputedStyle(el).whiteSpace), `${path} ${selector}`).toBe('pre-line');
  }
});

test('on a phone the menu offers booking a demo and calling before the page links', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'wide screens keep these in the header');
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  const menu = page.locator('#site-menu');
  await expect(menu.getByRole('link', { name: 'Book a free demo' })).toBeVisible();
  await expect(menu.locator('a[href^="tel:"]')).toBeVisible();
});

test('the current page is marked in the header and the menu', async ({ page }, info) => {
  await page.goto('/results');
  if (info.project.name === 'desktop') await expect(page.locator('.quick a[href="/results"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-menu a[href="/results"]')).toHaveAttribute('aria-current', 'page');
});

test('on the demo page the phone bar offers a call, not another booking', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/demo');
  const bar = page.locator('.mobile-bar');
  await expect(bar.getByRole('link', { name: 'Book free demo' })).toHaveCount(0);
  await expect(bar.locator('a[href^="tel:"]')).toBeVisible();
});

test('the footer ends the page on phones, with no blank strip under it', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/contact');
  const gap = await page.evaluate(() => document.documentElement.scrollHeight - (document.querySelector('.site-footer')!.getBoundingClientRect().bottom + scrollY));
  expect(gap).toBeLessThanOrEqual(1);
});

test('footer links are big enough to tap', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/');
  const heights = await page.locator('.site-footer a').evaluateAll(links => links.map(a => Math.round(a.getBoundingClientRect().height)));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
});

test('on a wide screen opening the menu moves focus to its first page link', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'wide screens hide the menu buttons');
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-menu .menu-grid a').first()).toBeFocused();
});

test('a blog card shows a clear focus ring when its link has keyboard focus', async ({ page }) => {
  await page.goto('/blog');
  await page.keyboard.press('Tab');
  await page.locator('.post h3 a').first().focus();
  const outline = await page.locator('.post').first().evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});
