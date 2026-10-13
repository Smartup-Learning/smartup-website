import { test, expect } from '@playwright/test';

test('no YouTube player loads until a video is tapped', async ({ page }) => {
  const youtubeScripts: string[] = [];
  page.on('request', r => { if (/youtube\.com|youtube-nocookie\.com/.test(r.url()) && r.resourceType() !== 'image') youtubeScripts.push(r.url()); });
  await page.goto('/founders');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(youtubeScripts).toEqual([]);
  await page.locator('[data-yt] a').first().click();
  await expect(page.locator('iframe').first()).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1/);
});

test('without JavaScript a video opens on YouTube', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/founders');
  await expect(page.locator('[data-yt] a').first()).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/watch\?v=/);
  await context.close();
});

test('a tapped video plays at the size of its thumbnail and takes focus', async ({ page }) => {
  await page.goto('/testimonials');
  for (const format of ['landscape', 'portrait']) {
    const figure = page.locator(`.yt--${format}`).first();
    const before = await figure.locator('a.yt-frame').boundingBox();
    await figure.locator('a.yt-frame').click();
    const iframe = figure.locator('iframe');
    const after = await iframe.boundingBox();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
    await expect(iframe).toBeFocused();
  }
});
