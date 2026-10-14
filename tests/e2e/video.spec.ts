import { test, expect } from '@playwright/test';

test('a testimonial video shows our play button, then plays with controls', async ({ page }) => {
  await page.goto('/testimonials');
  const card = page.locator('.video-card').first();
  const video = card.locator('video');
  await expect(video).not.toHaveAttribute('controls', '');
  const play = card.getByRole('button', { name: /^Play/ });
  await play.click();
  await expect(play).toBeHidden();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.controls)).toBe(true);
});

test('the video frame takes the shape of the video and full screen shows the whole picture', async ({ page }) => {
  await page.goto('/testimonials');
  const video = page.locator('.video-card video').first();
  const box = (await page.locator('.video-card .video-frame').first().boundingBox())!;
  expect(Math.abs(box.width / box.height - 480 / 854)).toBeLessThan(0.02);
  await video.evaluate((v: HTMLVideoElement) => v.requestFullscreen());
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const style = await video.evaluate((v: HTMLVideoElement) => ({ fit: getComputedStyle(v).objectFit, radius: getComputedStyle(v).borderRadius }));
  expect(style).toEqual({ fit: 'contain', radius: '0px' });
});

test('without JavaScript a testimonial video still has its own controls', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/testimonials');
  await expect(page.locator('.video-card video').first()).toHaveAttribute('controls', '');
  await context.close();
});
