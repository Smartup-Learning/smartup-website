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

  test('a fee saved on a programme shows on Courses, then is cleared again', async () => {
    await page.goto('/admin#/content/programmes');
    await openRow('Smartup Pro');
    const fee = page.getByLabel(/^Fee/);
    await fee.fill('From ₹3,000 a month (E2E)');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const courses = await page.context().newPage();
    await courses.goto('/courses');
    await expect(courses.getByText('From ₹3,000 a month (E2E)').first()).toBeVisible();
    await courses.close();
    await openRow('Smartup Pro');
    await page.getByLabel(/^Fee/).fill('');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    // The list returns once the save is done.
    await expect(page.locator('#admin-main h1')).toHaveText('Programmes and fees');
  });

  test('moving to another screen while a save is still running keeps the new screen', async () => {
    await page.goto('/admin#/content/faqs');
    await page.locator('.row-main').first().click();
    let release = () => {};
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/admin/content/faqs/*', async route => { await held; await route.continue(); });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.goto('/admin#/settings');
    await expect(page.locator('#admin-main h1')).toHaveText('Settings');
    // After the save, the admin reloads the FAQ list; once that answer is in, the screen must still be Settings.
    const reloaded = page.waitForResponse(r => r.request().method() === 'GET' && r.url().endsWith('/api/admin/content/faqs'));
    release();
    await reloaded;
    await page.waitForTimeout(300);
    await expect(page.locator('#admin-main h1')).toHaveText('Settings');
    await page.unroute('**/api/admin/content/faqs/*');
  });

  test('changing the classes taught in Settings changes the demo form, then it is restored', async () => {
    await page.goto('/admin#/settings');
    const to = page.getByLabel('To class', { exact: true });
    const saveSettings = async () => {
      const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/api/admin/settings'));
      await page.getByRole('button', { name: 'Save settings' }).click();
      expect((await saved).status()).toBe(200);
    };
    await to.fill('10');
    await saveSettings();
    const demo = await page.context().newPage();
    await demo.goto('/demo');
    await expect(demo.getByLabel('Class', { exact: true }).locator('option', { hasText: 'Plus One' })).toHaveCount(0);
    await demo.close();
    await to.fill('12');
    await saveSettings();
  });

  test('the homepage hero has its own screen, and Settings no longer shows it', async () => {
    await page.goto('/admin#/settings');
    await expect(page.locator('#admin-main h1')).toHaveText('Settings');
    await expect(page.getByLabel('Homepage headline')).toHaveCount(0);
    await page.goto('/admin#/hero');
    await expect(page.locator('#admin-main h1')).toHaveText('Homepage hero');
    await expect(page.getByLabel('Main phone number')).toHaveCount(0);
    const highlight = page.getByLabel('Highlighted word (underlined in yellow)');
    const original = await highlight.inputValue();
    const saveHero = async () => {
      const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/api/admin/settings'));
      await page.getByRole('button', { name: 'Save hero' }).click();
      expect((await saved).status()).toBe(200);
    };
    await highlight.fill('E2Eword');
    await saveHero();
    const home = await page.context().newPage();
    await home.goto('/');
    await expect(home.locator('#hero-title .marker')).toHaveText('E2Eword');
    await home.close();
    await highlight.fill(original);
    await saveHero();
  });

  test('on a short desktop window the menu scrolls on its own, without scrolling the page', async () => {
    test.skip(test.info().project.name !== 'desktop', 'the menu is a collapsible list on phones');
    const original = page.viewportSize();
    await page.setViewportSize({ width: 1280, height: 500 });
    try {
      await page.goto('/admin#/content/faqs');
      await expect(page.locator('#admin-main h1')).toHaveText('FAQ');
      const nav = page.locator('#admin-nav');
      const sizes = await nav.evaluate(el => ({ scroll: el.scrollHeight, client: el.clientHeight }));
      expect(sizes.scroll).toBeGreaterThan(sizes.client);
      await nav.hover();
      const pageBefore = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 200);
      await expect.poll(() => nav.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(pageBefore);
    } finally {
      if (original) await page.setViewportSize(original);
    }
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

  test('when the session ends mid-edit, signing in again keeps what was typed', async () => {
    const question = unique('E2E: is the library open on Sundays?');
    await page.goto('/admin#/content/faqs');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Topic').fill('E2E');
    await page.getByLabel('Question', { exact: true }).fill(question);
    await page.getByLabel('Answer', { exact: true }).fill('Yes, from 10 am.');
    // End the session on the server, as an 8-hour expiry would.
    await page.request.post('/api/admin/logout', { headers: { 'X-Smartup-Request': '1' }, data: {} });
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByLabel('Admin password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByLabel('Question', { exact: true })).toHaveValue(question);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    await openRow(question);
    await deleteOpenItem();
  });

  test('a photo uploaded with an alumni story shows on the Alumni page, then both are removed', async () => {
    const name = unique('E2E Alumna');
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#5f2ea8' } }).png().toBuffer();
    await page.goto('/admin#/content/alumni');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel(/^Photo/).setInputFiles({ name: 'alumna.png', mimeType: 'image/png', buffer: png });
    await page.getByLabel('Describe the new photo').fill(`Portrait for ${name}`);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.locator('.field-image code')).toHaveText(/^\/media\/u-/);
    await page.getByLabel(/^Describe the photo/).fill(`Portrait for ${name}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const alumni = await page.context().newPage();
    await alumni.goto('/alumni');
    await expect(alumni.getByRole('heading', { name })).toBeVisible();
    const src = await alumni.locator(`img[alt="Portrait for ${name}"]`).getAttribute('src');
    expect((await alumni.request.get(src!)).status()).toBe(200);
    await alumni.close();
    await openRow(name);
    await deleteOpenItem();
    await page.goto('/admin#/media');
    const tile = page.locator('.media-grid li', { hasText: `Portrait for ${name}` });
    page.once('dialog', dialog => dialog.accept());
    await tile.getByRole('button', { name: 'Delete' }).click();
    await expect(tile).toHaveCount(0);
  });

  test('a demo booking reaches the inbox, can be marked contacted, exported and deleted', async () => {
    const name = unique('E2E Parent');
    const site = await page.context().newPage();
    await site.goto('/demo');
    await site.getByLabel("Student's name").fill(name);
    await site.getByLabel('Mobile number').fill('98950 85731');
    await site.getByLabel('Class', { exact: true }).selectOption('9');
    await site.getByLabel('Board').selectOption('CBSE');
    await site.getByLabel('Online or at a centre?').selectOption('Online');
    await site.getByRole('button', { name: 'Book my free demo' }).click();
    await expect(site.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
    await site.close();
    await page.goto('/admin#/inbox/demo');
    const entry = page.locator('details.entry', { hasText: name });
    await expect(page.locator('#admin-main')).not.toContainText('null');
    await entry.locator('summary').click();
    await entry.getByLabel('Status').selectOption('contacted');
    await entry.getByLabel('Notes').fill('Called, demo on Monday');
    await entry.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const csv = await page.request.get('/api/admin/inbox/demo/export');
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain(name);
    page.once('dialog', dialog => dialog.accept());
    await entry.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('details.entry', { hasText: name })).toHaveCount(0);
  });

  test('visitor text in the inbox is shown as text, never as markup', async () => {
    const name = '<img src=x onerror="document.title=1">';
    const question = unique('E2E markup check');
    expect((await page.request.post('/api/forms/ask', { data: { name, phone: '9895085731', question } })).status()).toBe(201);
    await page.goto('/admin#/inbox/ask');
    const entry = page.locator('details.entry', { hasText: question });
    await expect(entry.locator('summary')).toContainText(name);
    await expect(page.locator('#admin-main img[src="x"]')).toHaveCount(0);
    expect(await page.title()).not.toBe('1');
    await entry.locator('summary').click();
    page.once('dialog', dialog => dialog.accept());
    await entry.getByRole('button', { name: 'Delete' }).click();
    await expect(entry).toHaveCount(0);
  });

  test('an answered question can be published to the FAQ', async () => {
    const question = unique('E2E: do you run a crash course before exams?');
    expect((await page.request.post('/api/forms/ask', { data: { name: 'E2E Student', phone: '9895085731', question } })).status()).toBe(201);
    // The previous test left the page on this same address, so reload to fetch the new question.
    await page.goto('/admin#/inbox/ask');
    await page.reload();
    const entry = page.locator('details.entry', { hasText: question });
    await entry.locator('summary').click();
    await entry.getByLabel('FAQ topic').fill('E2E');
    await entry.getByLabel('Answer', { exact: true }).fill('Yes, every January.');
    await entry.getByRole('button', { name: 'Publish to FAQ' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Published');
    const ask = await page.context().newPage();
    await ask.goto('/ask');
    await expect(ask.getByText(question)).toBeVisible();
    await ask.close();
    await page.goto('/admin#/content/faqs');
    await openRow(question);
    await deleteOpenItem();
  });
});
