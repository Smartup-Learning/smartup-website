import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';

const booking = { name: 'Asha', phone: '9895085731', grade: '9', board: 'CBSE', mode: 'Online' };
const send = (site, kind, data) => site.call(`/api/forms/${kind}`, { method: 'POST', json: data, signedIn: false });

test('a booking from the website appears in the admin inbox and its count', async t => {
  const site = await startSite(t);
  await send(site, 'demo', booking);
  assert.equal((await site.call('/api/admin/inbox/demo', { signedIn: false })).status, 401);
  await site.signIn();
  assert.equal((await site.call('/api/admin/inbox/demo')).data.items[0].name, 'Asha');
  assert.deepEqual((await site.call('/api/admin/inbox')).data.counts, { demo: 1, careers: 0, ask: 0 });
  assert.deepEqual(Object.keys((await site.call('/api/admin/schema')).data.inboxes), ['demo', 'careers', 'ask']);
});

test('staff can update the status and notes, then delete an entry', async t => {
  const site = await startSite(t);
  await send(site, 'demo', booking);
  await site.signIn();
  const [entry] = (await site.call('/api/admin/inbox/demo')).data.items;
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'PUT', json: { status: 'contacted', notes: 'Demo fixed for Monday' } })).status, 200);
  const [updated] = (await site.call('/api/admin/inbox/demo')).data.items;
  assert.equal(updated.status, 'contacted');
  assert.equal(updated.notes, 'Demo fixed for Monday');
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'PUT', json: { status: 'lost' } })).status, 400);
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'DELETE', json: {} })).status, 200);
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'DELETE', json: {} })).status, 404);
  assert.equal((await site.call('/api/admin/inbox/nope')).status, 404);
});

test('the CSV export downloads every booking with formulas neutralised', async t => {
  const site = await startSite(t);
  await send(site, 'demo', { ...booking, name: '=HYPERLINK("http://x")' });
  assert.equal((await site.call('/api/admin/inbox/demo/export', { signedIn: false })).status, 401);
  await site.signIn();
  const csv = await site.call('/api/admin/inbox/demo/export');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /^text\/csv/);
  assert.match(csv.headers.get('content-disposition'), /^attachment; filename="smartup-demo-\d{4}-\d{2}-\d{2}\.csv"$/);
  assert.match(csv.text, /"'=HYPERLINK\(""http:\/\/x""\)"/);
});

test('an answered question can be published to the FAQ', async t => {
  const site = await startSite(t);
  await send(site, 'ask', { name: 'Meera', phone: '9895085731', question: 'do u teach class 8 online??' });
  await site.signIn();
  const [question] = (await site.call('/api/admin/inbox/ask')).data.items;
  const published = await site.call(`/api/admin/inbox/ask/${question.id}/publish`, { method: 'POST', json: { category: 'Programmes', question: 'Do you teach Class 8 online?', answer: 'Yes. Class 8 is taught online and at every centre.' } });
  assert.equal(published.status, 201);
  assert.match(await site.page('/ask'), /Do you teach Class 8 online\?/);
  assert.equal((await site.call('/api/admin/inbox/ask')).data.items[0].status, 'closed');
  const bad = await site.call(`/api/admin/inbox/ask/${question.id}/publish`, { method: 'POST', json: { category: '', question: 'Q', answer: '' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.fields.category);
});
