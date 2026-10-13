import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSiteServer } from '../../server.mjs';
import { AssessmentStore } from '../../server/assessment.mjs';
import { ContentStore } from '../../server/content-store.mjs';

export const ADMIN_PASSWORD = 'synthetic-admin-password-for-tests';

/** Starts the full site on a free port with an in-memory database and a temporary uploads folder. */
export async function startSite(t, { prepare = () => {}, ...options } = {}) {
  const store = new AssessmentStore(':memory:');
  const content = new ContentStore(store.db);
  content.applySeed();
  prepare(content);
  const uploadsDir = mkdtempSync(path.join(tmpdir(), 'smartup-uploads-'));
  const server = createSiteServer({ store, content, adminPassword: ADMIN_PASSWORD, secureCookies: false, uploadsDir, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    store.close();
    rmSync(uploadsDir, { recursive: true, force: true });
  });
  let cookie = '';
  async function call(route, { method = 'GET', json, body, headers = {}, signedIn = true } = {}) {
    const response = await fetch(base + route, {
      method,
      redirect: 'manual',
      headers: { 'X-Smartup-Request': '1', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(signedIn && cookie ? { Cookie: cookie } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : body,
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* CSV, HTML or empty */ }
    return { status: response.status, data, text, headers: response.headers };
  }
  async function signIn() {
    const r = await call('/api/admin/login', { method: 'POST', json: { password: ADMIN_PASSWORD }, signedIn: false });
    assert.equal(r.status, 200);
    cookie = r.headers.get('set-cookie').split(';')[0];
  }
  async function page(route) {
    const r = await fetch(base + route);
    assert.equal(r.status, 200, route);
    return r.text();
  }
  return { base, store, content, db: store.db, uploadsDir, call, signIn, page };
}
