import { test, expect } from '@playwright/test';

test('choosing a subject shows only that group', async ({ page }) => {
  await page.goto('/faculty');
  const people = page.locator('#team-list > li');
  const total = await people.count();
  await page.getByRole('button', { name: 'Chemistry' }).click();
  await expect(page.getByRole('button', { name: 'Chemistry' })).toHaveAttribute('aria-pressed', 'true');
  const visible = await people.evaluateAll(items => items.filter(i => !(i as HTMLElement).hidden).length);
  expect(visible).toBe(5);
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(people.filter({ visible: true })).toHaveCount(total);
});

test('without JavaScript everyone is listed and the chips are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/faculty');
  await expect(page.locator('#team-list > li')).toHaveCount(35);
  await expect(page.getByRole('button', { name: 'Chemistry' })).toBeHidden();
  await context.close();
});

test('choosing a year on Results shows only that year', async ({ page }) => {
  await page.goto('/results');
  await page.getByRole('button', { name: '2023' }).click();
  await expect(page.locator('section[data-year]:visible')).toHaveCount(1);
  await expect(page.locator('section[data-year="2023"]')).toBeVisible();
});

test('choosing a board on Results narrows every year to that board', async ({ page }) => {
  await page.goto('/results');
  await page.getByRole('button', { name: 'CBSE', exact: true }).click();
  const visible = await page.locator('[data-filter-tags]').evaluateAll(els => els.filter(e => !(e as HTMLElement).hidden).map(e => (e as HTMLElement).dataset.filterTags ?? ''));
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.every(tags => tags.split(' ').includes('cbse'))).toBe(true);
  await page.getByRole('button', { name: 'All boards' }).click();
  await page.getByRole('button', { name: '2023' }).click();
  await expect(page.locator('section[data-year]:visible')).toHaveCount(1);
});

test('on a phone the filter buttons sit in one row that scrolls sideways', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  for (const path of ['/life', '/faculty', '/results']) {
    await page.goto(path);
    const tops = await page.locator('[data-filter-for]').first().locator('button').evaluateAll(buttons => buttons.map(b => Math.round(b.getBoundingClientRect().top)));
    expect(new Set(tops).size, path).toBe(1);
  }
});
