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

test('on a wide screen a tapped video plays at the size of its thumbnail and takes focus', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'phones open a larger player');
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

test('starting a second video stops the first one', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'phones play one video at a time in the player');
  await page.goto('/videos');
  const links = page.locator('[data-yt] a.yt-frame');
  await links.nth(0).click();
  await expect(page.locator('[data-yt] iframe')).toHaveCount(1);
  await page.locator('[data-yt] a.yt-frame').nth(1).click();
  await expect(page.locator('[data-yt] iframe')).toHaveCount(1);
  await expect(page.locator('[data-yt]').nth(0).locator('a.yt-frame')).toBeVisible();
});

test('on a phone a tapped video opens large in a player that closes again', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/videos');
  await page.locator('[data-yt] a.yt-frame').first().click();
  const player = page.locator('dialog.video-player');
  await expect(player).toBeVisible();
  const frame = (await player.locator('iframe').boundingBox())!;
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(frame.width).toBeGreaterThanOrEqual(width * 0.9);
  await player.getByRole('button', { name: 'Close' }).click();
  await expect(player).toBeHidden();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('the play badge sits in the corner, clear of the title printed on the thumbnail', async ({ page }) => {
  await page.goto('/videos');
  const frame = (await page.locator('[data-yt] .yt-frame').first().boundingBox())!;
  const badge = (await page.locator('[data-yt] .yt-play').first().boundingBox())!;
  expect(badge.x - frame.x).toBeLessThan(frame.width * 0.2);
  expect(frame.y + frame.height - (badge.y + badge.height)).toBeLessThan(frame.height * 0.2);
});

test('on a phone Escape closes the video player', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/videos');
  await page.locator('[data-yt] a.yt-frame').first().click();
  const player = page.locator('dialog.video-player');
  await expect(player).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(player).toBeHidden();
});
