import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSiteServer } from '../server.mjs';
import { AssessmentStore } from '../server/assessment.mjs';
import { ContentStore } from '../server/content-store.mjs';

async function start(prepare = () => {}) {
  const store = new AssessmentStore(':memory:');
  const content = new ContentStore(store.db);
  content.applySeed();
  prepare(content);
  const server = createSiteServer({ store, content });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = async path => { const r = await fetch(base + path); assert.equal(r.status, 200, path); return r.text(); };
  return { html, content, close: () => new Promise(r => server.close(() => { store.close(); r(); })) };
}

test('Our Story lists every chapter in order, the growth data and the vision', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/story');
  const years = [...page.matchAll(/data-year="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(years, ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', 'Next']);
  assert.match(page, /30,000\+/);
  assert.match(page, /Shaping the future of learning/);
  assert.match(page, /Vision 2030/);
});

test('a chapter edited by staff appears on the next request', async t => {
  const site = await start(content => content.db.prepare("UPDATE timeline_entries SET title = 'Edited chapter title' WHERE year_label = '2015'").run());
  t.after(site.close);
  assert.match(await site.html('/story'), /Edited chapter title/);
});

test('story intro does not double up "more than" with a plus sign', async t => {
  const site = await start();
  t.after(site.close);
  assert.doesNotMatch(await site.html('/story'), /more than \d[\d,]*\+/);
});

test('homepage sections follow the client order', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  const ids = [...page.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['about', 'founders', 'results', 'feedback', 'alumni', 'courses', 'careers']);
});

test('sections with no published content are left out, heading and all', async t => {
  const site = await start(content => {
    content.db.exec("UPDATE testimonials SET published = 0; UPDATE jobs SET published = 0; UPDATE results SET published = 0;");
  });
  t.after(site.close);
  const page = await site.html('/');
  for (const id of ['results', 'feedback', 'alumni', 'careers']) assert.doesNotMatch(page, new RegExp(`id="${id}"`), id);
  assert.match(page, /id="courses"/);
});

test('results always name exam and year', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  assert.match(page, /SSLC · 2026/);
  assert.match(page, /Class 10 · 2026/);
});

test('pages still render when settings keys go missing while running', async t => {
  const site = await start();
  t.after(site.close);
  site.content.db.exec("DELETE FROM settings WHERE key IN ('social', 'phone', 'vision', 'heroHeadline')");
  for (const path of ['/', '/story']) assert.doesNotMatch(await site.html(path), /Internal server error|undefined/, path);
});

test('written testimonials render as quotes, not empty video players', async t => {
  const site = await start(content => content.db.prepare("INSERT INTO testimonials(kind, section, title, person, quote, sort) VALUES('written', 'feedback', 'A parent', 'Parent of a Class 10 student', 'Smartup changed how my son studies.', 9)").run());
  t.after(site.close);
  const page = await site.html('/');
  assert.match(page, /<blockquote[^>]*>[\s\S]*Smartup changed how my son studies\.[\s\S]*<\/blockquote>/);
  assert.doesNotMatch(page, /src=""/);
});
