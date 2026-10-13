import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';
import { InboxStore } from '../server/inbox.mjs';

const booking = { name: 'Asha', phone: '9895085731', grade: '9', board: 'CBSE', mode: 'Online', centre: '', preferred_time: '' };
const question = { name: 'Meera', phone: '9895085731', question: 'Do you teach Class 8 maths online?' };
const postJson = (site, kind, data) => site.call(`/api/forms/${kind}`, { method: 'POST', json: data, signedIn: false });
const postForm = (site, kind, data) => fetch(`${site.base}/api/forms/${kind}`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });

test('a demo booking sent as JSON is saved for the team', async t => {
  const site = await startSite(t);
  assert.equal((await postJson(site, 'demo', booking)).status, 201);
  const [saved] = new InboxStore(site.db).list('demo');
  assert.equal(saved.phone, '+919895085731');
  assert.equal(saved.status, 'new');
});

test('invalid details come back as field messages and nothing is saved', async t => {
  const site = await startSite(t);
  const r = await postJson(site, 'demo', { ...booking, phone: '123' });
  assert.equal(r.status, 400);
  assert.ok(r.data.fields.phone);
  assert.equal(new InboxStore(site.db).list('demo').length, 0);
});

test('a filled honeypot looks like success but saves nothing', async t => {
  const site = await startSite(t);
  assert.equal((await postJson(site, 'demo', { ...booking, website: 'spam' })).status, 201);
  assert.equal(new InboxStore(site.db).list('demo').length, 0);
});

test('without JavaScript a booking redirects to the thanks page, and a bad one back to the form', async t => {
  const site = await startSite(t);
  const ok = await postForm(site, 'demo', booking);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('location'), '/thanks?form=demo');
  const bad = await postForm(site, 'demo', { ...booking, grade: '' });
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('location'), '/demo?error=invalid#book');
  assert.equal(new InboxStore(site.db).list('demo').length, 1);
});

test('careers and ask forms save to their own inboxes', async t => {
  const site = await startSite(t);
  const role = site.content.jobs()[0].title;
  assert.equal((await postJson(site, 'careers', { name: 'Ravi', phone: '9895085731', email: 'ravi@example.com', role, experience: '', message: '', cv_url: '' })).status, 201);
  assert.equal((await postJson(site, 'ask', question)).status, 201);
  const inbox = new InboxStore(site.db);
  assert.equal(inbox.list('careers')[0].role, role);
  assert.equal(inbox.list('ask').length, 1);
});

test('form posts are limited per visitor', async t => {
  const site = await startSite(t);
  for (let i = 0; i < 20; i++) assert.equal((await postJson(site, 'ask', question)).status, 201);
  assert.equal((await postJson(site, 'ask', question)).status, 429);
  assert.equal((await postForm(site, 'ask', question)).headers.get('location'), '/ask?error=busy#ask-form');
});

test('oversized, wrongly typed, malformed and unknown form posts are refused', async t => {
  const site = await startSite(t);
  const raw = (body, type) => site.call('/api/forms/demo', { method: 'POST', body, headers: { 'Content-Type': type }, signedIn: false });
  assert.equal((await raw(JSON.stringify({ name: 'x'.repeat(25000) }), 'application/json')).status, 413);
  assert.equal((await raw('hello', 'text/plain')).status, 415);
  assert.equal((await raw('[1]', 'application/json')).status, 400);
  assert.equal((await postJson(site, 'nope', booking)).status, 404);
  assert.equal((await site.call('/api/forms/demo', { signedIn: false })).status, 405);
});
