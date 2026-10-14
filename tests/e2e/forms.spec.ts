import { test, expect, type Page } from '@playwright/test';

async function fillDemo(page: Page, phone = '98950 85731') {
  await page.getByLabel("Student's name").fill(`E2E Booking ${test.info().project.name}`);
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByLabel('Class', { exact: true }).selectOption('9');
  await page.getByLabel('Board').selectOption('CBSE');
  await page.getByLabel('Online or at a centre?').selectOption('Online');
}

test('booking a demo shows a confirmation and offers a call while WhatsApp is not set up', async ({ page }) => {
  await page.goto('/demo');
  await fillDemo(page);
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue on WhatsApp' })).toHaveCount(0);
  await expect(page.locator('[data-form-done]').getByRole('link', { name: /^Call / })).toBeVisible();
});

test('a wrong phone number is explained next to the field', async ({ page }) => {
  await page.goto('/demo');
  await fillDemo(page, '12345');
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page.locator('[data-error-for="phone"]')).toHaveText('Enter a 10-digit Indian mobile number.');
  await expect(page.getByLabel('Mobile number')).toBeFocused();
});

test('without JavaScript the form posts and lands on the thanks page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/demo');
  await fillDemo(page);
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page).toHaveURL(/\/thanks\?form=demo$/);
  await expect(page.getByRole('heading', { name: 'Your demo class request is in' })).toBeVisible();
  await context.close();
});

test('an empty demo form lists every missing detail at once, without sending anything', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', r => { if (r.method() === 'POST') posts.push(r.url()); });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page.locator('[data-form-error]')).toContainText(/Please check 5 details/);
  await expect(page.getByLabel("Student's name")).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel("Student's name")).toBeFocused();
  await expect(page.locator('[data-error-for="board"]')).toHaveText('Choose a board.');
  expect(posts).toEqual([]);
});

test('a field explains its problem as soon as you leave it, and clears once fixed', async ({ page }) => {
  await page.goto('/demo');
  const phone = page.getByLabel('Mobile number');
  await phone.fill('12345');
  await phone.blur();
  await expect(page.locator('[data-error-for="phone"]')).toHaveText('Enter a 10-digit Indian mobile number.');
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await phone.fill('98950 85731');
  await phone.blur();
  await expect(page.locator('[data-error-for="phone"]')).toBeHidden();
  await expect(phone).not.toHaveAttribute('aria-invalid', 'true');
});

test('choosing a centre is needed only for learning at a centre', async ({ page }) => {
  await page.goto('/demo');
  await fillDemo(page);
  await page.getByLabel('Online or at a centre?').selectOption('At a centre');
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page.locator('[data-error-for="centre"]')).toHaveText('Choose a centre.');
});
