import { test, expect } from '@playwright/test';

test('hero leads with the trust headline and the demo action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make parents proud');
  await expect(page.locator('.hero').getByRole('link', { name: 'Book free demo' })).toHaveAttribute('href', '/demo');
  await expect(page.locator('.hero').getByRole('link', { name: 'Our story' })).toHaveAttribute('href', '/story');
});

test('about shows four featured chapters and links to the story', async ({ page }) => {
  await page.goto('/');
  const about = page.locator('#about');
  await expect(about.locator('li.chapter')).toHaveCount(4);
  await expect(about.getByRole('link', { name: 'Read our story' })).toHaveAttribute('href', '/story');
});

test('founders appear in the client order with photos', async ({ page }) => {
  await page.goto('/');
  const names = page.locator('#founders .founder-name');
  await expect(names).toHaveText(['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']);
  await expect(page.locator('#founders img')).toHaveCount(4);
});

test('videos never download before a tap', async ({ page }) => {
  await page.goto('/');
  const videos = page.locator('video');
  await expect(videos).toHaveCount(6);
  for (const video of await videos.all()) {
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('poster', /-poster\.webp$/);
  }
});

test('images below the hero load lazily', async ({ page }) => {
  await page.goto('/');
  const eager = await page.locator('main img:not([data-priority])').evaluateAll(imgs => imgs.filter(i => i.getAttribute('loading') !== 'lazy').length);
  expect(eager).toBe(0);
});

test('course tabs switch boards with the keyboard', async ({ page }) => {
  await page.goto('/');
  const cbse = page.getByRole('tab', { name: 'CBSE' });
  const state = page.getByRole('tab', { name: 'State Board' });
  await expect(cbse).toHaveAttribute('aria-selected', 'true');
  await cbse.focus();
  await page.keyboard.press('ArrowRight');
  await expect(state).toHaveAttribute('aria-selected', 'true');
  await expect(state).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'State Board' })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'CBSE' })).toBeHidden();
});

test('without JavaScript both boards are readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByText('Smartup Pro')).toBeVisible();
  await expect(page.getByText('State Board programme', { exact: true }).first()).toBeVisible();
  await context.close();
});

test('careers preview lists openings and links to all of them', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#careers .job')).toHaveCount(6);
  await expect(page.locator('#careers').getByRole('link', { name: /See all \d+ openings/ })).toHaveAttribute('href', '/careers');
});

test('without JavaScript the course tab buttons are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('tab', { name: 'CBSE' })).toBeHidden();
  await context.close();
});
