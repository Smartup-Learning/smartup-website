import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';
import { readBuffer } from '../server/read-body.mjs';

const routes = {
  forms: async ({ req, respond }) => respond(200, { hit: 'forms', length: (await readBuffer(req, 64)).length }),
  admin: async ({ route, respond }) => respond(200, { hit: 'admin', route }),
};

test('the session check tells the admin page whether staff are signed in', async t => {
  const site = await startSite(t, { routes });
  assert.equal((await site.call('/api/admin/session', { signedIn: false })).status, 401);
  await site.signIn();
  assert.equal((await site.call('/api/admin/session')).status, 200);
});

test('form routes accept plain HTML posts from this site but not from other sites', async t => {
  const site = await startSite(t, { routes });
  const post = headers => fetch(`${site.base}/api/forms/demo`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: 'name=Asha' });
  const plain = await post({});
  assert.equal(plain.status, 200);
  assert.deepEqual(await plain.json(), { hit: 'forms', length: 9 });
  assert.equal((await post({ Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ Origin: 'null' })).status, 403);
  assert.equal((await post({ 'Sec-Fetch-Site': 'cross-site' })).status, 403);
});

test('a body larger than the route allows is answered with 413', async t => {
  const site = await startSite(t, { routes });
  const r = await fetch(`${site.base}/api/forms/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(100) });
  assert.equal(r.status, 413);
});

test('admin extension routes run only for signed-in staff, after the Quest routes', async t => {
  const site = await startSite(t, { routes });
  assert.equal((await site.call('/api/admin/content/faqs', { signedIn: false })).status, 401);
  await site.signIn();
  assert.deepEqual((await site.call('/api/admin/content/faqs')).data, { hit: 'admin', route: '/api/admin/content/faqs' });
  assert.ok(Array.isArray((await site.call('/api/admin/questions')).data.questions), 'Quest admin routes still answer first');
});

test('media uploads may send image bytes; other admin writes must send JSON', async t => {
  const site = await startSite(t, { routes });
  await site.signIn();
  assert.equal((await site.call('/api/admin/media', { method: 'POST', body: Buffer.from('png'), headers: { 'Content-Type': 'image/png' } })).status, 200);
  assert.equal((await site.call('/api/admin/content/faqs', { method: 'POST', body: 'x', headers: { 'Content-Type': 'text/plain' } })).status, 403);
  assert.equal((await site.call('/api/admin/media', { method: 'POST', body: Buffer.from('png'), headers: { 'Content-Type': 'image/png', 'X-Smartup-Request': '' } })).status, 403);
});
