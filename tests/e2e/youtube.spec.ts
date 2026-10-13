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
