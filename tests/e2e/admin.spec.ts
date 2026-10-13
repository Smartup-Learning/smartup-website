import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

const PASSWORD = 'e2e-only-password-0000';

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Admin password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#login-error')).toHaveText('The password is incorrect.');
});

test.describe('signed in', () => {
  // One sign-in per browser project keeps the run under the login limit (10 per 15 minutes).
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  const unique = (label: string) => `${label} ${test.info().project.name} ${Date.now()}`;

  test.beforeAll(async ({ browser }, testInfo) => {
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use;
    const context = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL: 'http://127.0.0.1:4173' });
    page = await context.newPage();
    await page.goto('/admin');
    await page.getByLabel('Admin password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
  });

  test.afterAll(async () => { await page.context().close(); });

  // The row's main button; its Move up/down buttons also mention the title, so match by class.
  const openRow = (text: string) => page.locator('.row-main', { hasText: text }).click();
  async function deleteOpenItem() {
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('#admin-toast')).toContainText('Deleted');
  }

  test('adding an FAQ shows it on the Ask page, and deleting it removes it', async () => {
    const question = unique('E2E: is there a weekend batch?');
    await page.goto('/admin#/content/faqs');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Topic').fill('E2E');
    await page.getByLabel('Question', { exact: true }).fill(question);
    await page.getByLabel('Answer', { exact: true }).fill('Yes, on Saturdays.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const ask = await page.context().newPage();
    await ask.goto('/ask');
    await expect(ask.getByText(question)).toBeVisible();
    await ask.close();
    await openRow(question);
    await deleteOpenItem();
    const after = await page.context().newPage();
    await after.goto('/ask');
    await expect(after.getByText(question)).toHaveCount(0);
    await after.close();
  });

  test('a new job opening appears on the Careers page', async () => {
    const title = unique('E2E Geography teacher');
    await page.goto('/admin#/content/jobs');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Role', { exact: true }).fill(title);
    await page.getByLabel('Type').selectOption('Part time');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const careers = await page.context().newPage();
    await careers.goto('/careers');
    await expect(careers.getByRole('heading', { name: title })).toBeVisible();
    await careers.close();
    await openRow(title);
    await deleteOpenItem();
  });

  test('the admin fits a 360px phone without sideways scrolling', async () => {
    const original = page.viewportSize();
    await page.setViewportSize({ width: 360, height: 740 });
    try {
      const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      await page.goto('/admin#/content/faculty');
      await expect(page.locator('#admin-main h1')).toHaveText('Faculty');
      await fits();
      await page.locator('.row-main').first().click();
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
      await fits();
      await page.goto('/admin#/content/faqs');
      await expect(page.locator('#admin-main h1')).toHaveText('FAQ');
      await fits();
      await page.goto('/admin#/settings');
      await expect(page.locator('#admin-main h1')).toHaveText('Settings');
      await fits();
    } finally {
      if (original) await page.setViewportSize(original);
    }
  });
});
