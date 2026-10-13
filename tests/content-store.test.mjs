import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ContentStore, normalizePhone, formatPhone } from '../server/content-store.mjs';

const seeded = () => { const s = new ContentStore(new DatabaseSync(':memory:')); s.applySeed(); return s; };

test('seeding fills every section and is applied only once', () => {
  const store = seeded();
  store.applySeed();
  assert.equal(store.stats().length, 4);
  assert.equal(store.leaders().length, 4);
  assert.equal(store.centres().length, 9);
  assert.equal(store.timeline().length, 14);
  assert.equal(store.jobs().length, 12);
});

test('content deleted by staff is not re-seeded on restart', () => {
  const store = seeded();
  store.db.exec('DELETE FROM jobs');
  store.applySeed();
  assert.deepEqual(store.jobs(), []);
});

test('unpublished rows are hidden', () => {
  const store = seeded();
  store.db.exec('UPDATE testimonials SET published=0');
  assert.deepEqual(store.testimonials('feedback'), []);
  assert.deepEqual(store.testimonials('alumni'), []);
});

test('timeline runs 2014 to Next, with four featured chapters', () => {
  const store = seeded();
  const years = store.timeline().map(c => c.yearLabel);
  assert.equal(years[0], '2014');
  assert.equal(years.at(-1), 'Next');
  assert.deepEqual(store.timeline({ featured: true }).map(c => c.yearLabel), ['2014', '2018', '2021', '2026']);
  for (const c of store.timeline()) for (const m of c.media) { assert.match(m.src, /^\/seed\/img\/timeline-/); assert.ok(m.alt.length > 10); }
});

test('founders appear in the client order with matched photos', () => {
  const leaders = seeded().leaders();
  assert.deepEqual(leaders.map(l => l.name), ['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']);
  assert.deepEqual(leaders.map(l => l.photo), ['/seed/img/leader-mohamed-rayees', '/seed/img/leader-dhanesh-narayanan-achari', '/seed/img/leader-mohamed-shihas', '/seed/img/leader-shanu']);
});

test('every result names its exam and year', () => {
  for (const r of seeded().results()) { assert.ok(r.exam.length > 0); assert.match(r.year, /^\d{4}/); }
});

test('settings decode JSON and WhatsApp starts unset', () => {
  const s = seeded().settings();
  assert.equal(s.whatsapp, null);
  assert.equal(s.phone, '+918891910919');
  assert.equal(s.social.length, 6);
  assert.equal(s.vision.priorities.length, 5);
});

test('growth points ascend by year', () => {
  const years = seeded().growth().map(g => g.year);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
});

test('phone numbers are stored tel-safe and display grouped', () => {
  assert.equal(normalizePhone('79071 26725'), '+917907126725');
  assert.equal(normalizePhone('6282-179991'), '+916282179991');
  assert.equal(normalizePhone('+91 88919 10919'), '+918891910919');
  assert.throws(() => normalizePhone('12345'), /Indian mobile/);
  assert.equal(formatPhone('+917907126725'), '+91 79071 26725');
  for (const c of seeded().centres()) assert.match(c.phone, /^\+91[6-9]\d{9}$/);
});

test('a settings key missing from an existing database is restored, and edited values are kept', () => {
  const store = seeded();
  store.db.exec("DELETE FROM settings WHERE key = 'social'; UPDATE settings SET value = '\"Edited\"' WHERE key = 'heroHeadline';");
  store.applySeed();
  assert.equal(store.settings().social.length, 6);
  assert.equal(store.settings().heroHeadline, 'Edited');
});

test('settings fall back to seed defaults for keys missing at runtime', () => {
  const store = seeded();
  store.db.exec("DELETE FROM settings WHERE key IN ('social', 'vision', 'hours')");
  const s = store.settings();
  assert.equal(s.social.length, 6);
  assert.equal(s.vision.priorities.length, 5);
  assert.equal(s.hours, '5–9 pm');
});

test('main phone and WhatsApp settings are normalized, or dropped when invalid', () => {
  const store = seeded();
  store.db.exec(`UPDATE settings SET value = '"88919 10919"' WHERE key = 'phone'; UPDATE settings SET value = '"not a number"' WHERE key = 'whatsapp';`);
  assert.equal(store.settings().phone, '+918891910919');
  assert.equal(store.settings().whatsapp, null);
});
