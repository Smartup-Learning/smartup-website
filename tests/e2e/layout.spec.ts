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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page isn't here yet");
});
