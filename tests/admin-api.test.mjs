import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startSite } from './helpers/site.mjs';
import { ContentStore } from '../server/content-store.mjs';
import { SECTIONS, validateRow } from '../server/admin-schema.mjs';
import { AdminContent } from '../server/admin-content.mjs';

test('every seeded row already passes its section rules, so staff can save it unchanged', () => {
  const content = new ContentStore(new DatabaseSync(':memory:'));
  content.applySeed();
  const admin = new AdminContent(content.db);
  for (const [key, section] of Object.entries(SECTIONS)) {
    for (const row of admin.list(key)) assert.deepEqual(validateRow(section, row).errors, {}, `${key} #${row.id}`);
  }
});

test('admin content and the schema need a signed-in session', async t => {
  const site = await startSite(t);
  assert.equal((await site.call('/api/admin/content/faqs', { signedIn: false })).status, 401);
  assert.equal((await site.call('/api/admin/schema', { signedIn: false })).status, 401);
});

test('the schema lists every section and settings field for the admin page', async t => {
  const site = await startSite(t);
  await site.signIn();
  const { data } = await site.call('/api/admin/schema');
  assert.deepEqual(Object.keys(data.sections), Object.keys(SECTIONS));
  assert.ok(data.settings.some(f => f.name === 'whatsapp'));
});

test('staff can add, edit, reorder and delete an FAQ, and the Ask page follows', async t => {
  const site = await startSite(t);
  await site.signIn();
  const created = await site.call('/api/admin/content/faqs', { method: 'POST', json: { category: 'Admissions', question: 'Is there a sibling discount?', answer: 'Ask our team at any centre.', published: true } });
  assert.equal(created.status, 201);
  const { id } = created.data;
  assert.match(await site.page('/ask'), /Is there a sibling discount\?/);
  assert.equal((await site.call(`/api/admin/content/faqs/${id}`, { method: 'PUT', json: { category: 'Admissions', question: 'Do siblings get a discount?', answer: 'Yes, ask at any centre.', published: true } })).status, 200);
  const ask = await site.page('/ask');
  assert.match(ask, /Do siblings get a discount\?/);
  assert.doesNotMatch(ask, /Is there a sibling discount/);
  const { items } = (await site.call('/api/admin/content/faqs')).data;
  assert.equal(items.at(-1).id, id, 'new items go to the end');
  const order = [id, ...items.filter(i => i.id !== id).map(i => i.id)];
  assert.equal((await site.call('/api/admin/content/faqs/order', { method: 'PUT', json: { ids: order } })).status, 200);
  assert.equal((await site.call('/api/admin/content/faqs')).data.items[0].id, id);
  assert.equal((await site.call(`/api/admin/content/faqs/${id}`, { method: 'DELETE', json: {} })).status, 200);
  assert.doesNotMatch(await site.page('/ask'), /Do siblings get a discount/);
  assert.equal((await site.call(`/api/admin/content/faqs/${id}`, { method: 'DELETE', json: {} })).status, 404);
});

test('hidden items stay in the admin list but leave the website', async t => {
  const site = await startSite(t);
  await site.signIn();
  const { data } = await site.call('/api/admin/content/faqs', { method: 'POST', json: { category: 'Admissions', question: 'A hidden draft question?', answer: 'Not yet.', published: false } });
  assert.doesNotMatch(await site.page('/ask'), /A hidden draft question/);
  const item = (await site.call('/api/admin/content/faqs')).data.items.find(i => i.id === data.id);
  assert.equal(item.published, false);
});

test('invalid input returns field messages; a used web address is refused', async t => {
  const site = await startSite(t);
  await site.signIn();
  const bad = await site.call('/api/admin/content/faqs', { method: 'POST', json: { category: '', question: '', answer: '' } });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.data.fields).sort(), ['answer', 'category', 'question']);
  const [post] = (await site.call('/api/admin/content/posts')).data.items;
  const dup = await site.call('/api/admin/content/posts', { method: 'POST', json: { ...post, title: 'Copy' } });
  assert.equal(dup.status, 409);
  assert.ok(dup.data.fields.slug);
});

test('unknown sections, ids and inherited names are not found', async t => {
  const site = await startSite(t);
  await site.signIn();
  for (const route of ['/api/admin/content/nope', '/api/admin/content/__proto__', '/api/admin/content/constructor', '/api/admin/nope']) assert.equal((await site.call(route)).status, 404, route);
  assert.equal((await site.call('/api/admin/content/faqs/99999', { method: 'PUT', json: { category: 'A', question: 'Question here?', answer: 'Answer here.' } })).status, 404);
});

test('settings load, save, and change the site; bad values are explained', async t => {
  const site = await startSite(t);
  await site.signIn();
  const { settings } = (await site.call('/api/admin/settings')).data;
  assert.equal(settings.whatsapp, null);
  assert.doesNotMatch(await site.page('/demo'), /wa\.me/);
  assert.equal((await site.call('/api/admin/settings', { method: 'PUT', json: { ...settings, whatsapp: '98950 85731', hours: '4–9 pm' } })).status, 200);
  assert.match(await site.page('/demo'), /wa\.me\/919895085731/);
  assert.match(await site.page("/contact"), /4–\u20609\u00a0pm/);
  const bad = await site.call('/api/admin/settings', { method: 'PUT', json: { ...settings, email: 'nope' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.fields.email);
});
