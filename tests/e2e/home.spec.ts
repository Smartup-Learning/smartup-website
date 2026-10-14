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

test('the careers band says how many openings there are and links to them', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#careers')).toContainText(/\d+ openings for teachers/);
  await expect(page.locator('#careers').getByRole('link', { name: /See all \d+ openings/ })).toHaveAttribute('href', '/careers');
});

test('without JavaScript the course tab buttons are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('tab', { name: 'CBSE' })).toBeHidden();
  await context.close();
});

test('the four proof numbers are spaced evenly on a wide screen', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'four in a row from 900px');
  for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    // Columns sit an equal distance apart, and no number runs close to the next one.
    const columns = await page.locator('.hero .stat').evaluateAll(stats => stats.map(s => { const r = s.getBoundingClientRect(); return [r.left, r.right]; }));
    const columnGaps = columns.slice(1).map(([left], i) => left - columns[i][1]);
    expect(Math.max(...columnGaps) - Math.min(...columnGaps), `${width}px columns ${columnGaps}`).toBeLessThanOrEqual(2);
    const values = await page.locator('.hero .stat-value > span[aria-hidden]').evaluateAll(spans => spans.map(s => { const r = s.getBoundingClientRect(); return [r.left, r.right]; }));
    const valueGaps = values.slice(1).map(([left], i) => left - values[i][1]);
    expect(Math.min(...valueGaps), `${width}px numbers ${valueGaps}`).toBeGreaterThan(48);
  }
});

test('story pictures line up whatever the length of their titles', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'four in a row from 900px');
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const tops = await page.locator('.timeline--teaser .chapter .media-frame').evaluateAll(frames => frames.map(f => Math.round(f.getBoundingClientRect().top)));
    expect(new Set(tops).size, `${width}px: ${tops}`).toBe(1);
  }
});
