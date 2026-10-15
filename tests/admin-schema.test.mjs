import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ContentStore } from '../server/content-store.mjs';
import { AdminContent } from '../server/admin-content.mjs';
import { SECTIONS, SETTINGS, cleanValue, validateRow, validateSettings, youtubeId, publicSchema } from '../server/admin-schema.mjs';

const field = (type, extra = {}) => ({ name: 'f', label: 'Field', type, ...extra });

test('text is trimmed, required and limited in length', () => {
  assert.equal(cleanValue(field('text', { max: 20 }), '  Two   words '), 'Two words');
  assert.throws(() => cleanValue(field('text', { required: true }), '  '), /required/);
  assert.throws(() => cleanValue(field('text', { max: 5 }), 'too long'), /under 5/);
  assert.equal(cleanValue(field('textarea'), 'a\r\nb'), 'a\nb');
  assert.throws(() => cleanValue(field('text', { pattern: '^\\d{4}', patternMessage: 'Start with the year.' }), 'Next'), /Start with the year/);
});

test('links must be web addresses', () => {
  assert.equal(cleanValue(field('url'), 'https://maps.app.goo.gl/x'), 'https://maps.app.goo.gl/x');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'maps.app.goo.gl/x']) assert.throws(() => cleanValue(field('url'), bad), /https:\/\//, bad);
});

test('YouTube links of every common shape become a video ID', () => {
  for (const link of ['dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1', 'https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ']) assert.equal(youtubeId(link), 'dQw4w9WgXcQ', link);
  assert.equal(youtubeId('https://vimeo.com/123'), null);
  assert.throws(() => cleanValue(field('youtube', { required: true }), 'nope'), /YouTube/);
});

test('images must come from the media library or the seed photos', () => {
  assert.equal(cleanValue(field('image'), '/media/u-abc-12345678'), '/media/u-abc-12345678');
  assert.equal(cleanValue(field('image'), '/seed/img/faculty-x'), '/seed/img/faculty-x');
  for (const bad of ['/media/../server', 'https://evil.example/x', '/media/u-x.webp']) assert.throws(() => cleanValue(field('image'), bad), /media library/, bad);
});

test('numbers, dates, slugs, phones, choices and checkboxes are checked', () => {
  assert.equal(cleanValue(field('int', { min: 0, max: 10 }), '7'), 7);
  assert.throws(() => cleanValue(field('int', { min: 0, max: 10 }), '11'), /0 to 10/);
  assert.throws(() => cleanValue(field('int'), '2.5'), /whole number/);
  assert.equal(cleanValue(field('date'), '2026-10-13'), '2026-10-13');
  assert.throws(() => cleanValue(field('date'), '2026-02-31'), /date like/);
  assert.throws(() => cleanValue(field('slug'), 'Board Exam'), /lowercase/);
  assert.equal(cleanValue(field('phone'), '98950 85731'), '+919895085731');
  assert.throws(() => cleanValue(field('select', { options: [{ value: 'a', label: 'A' }] }), 'b'), /options/);
  assert.equal(cleanValue(field('checkbox'), true), 1);
  assert.equal(cleanValue(field('checkbox'), undefined), 0);
  assert.throws(() => cleanValue(field('path', { prefix: '/seed/video/' }), '/etc/passwd'), /\/seed\/video\//);
});

test('lists check every item and say which one is wrong', () => {
  const photos = SECTIONS.events.fields.find(f => f.name === 'media');
  assert.deepEqual(cleanValue(photos, [{ src: '/media/u-a-1', alt: 'Stage' }]), [{ src: '/media/u-a-1', alt: 'Stage' }]);
  assert.throws(() => cleanValue(photos, [{ src: '/media/u-a-1', alt: 'Stage' }, { src: '/media/u-b-2', alt: '' }]), /Item 2: Describe the photo: This is required/);
});

test('rows are validated as a whole, including a photo needing its description', () => {
  const { values, errors } = validateRow(SECTIONS.faqs, { category: 'Admissions', question: 'When do classes start?', answer: 'In June.', published: true });
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { category: 'Admissions', question: 'When do classes start?', answer: 'In June.', published: 1 });
  assert.deepEqual(validateRow(SECTIONS.leaders, { name: 'A', role: 'B', photo: '/media/u-a-1', photo_alt: '' }).errors, { photo_alt: 'Describe the photo for people who cannot see it.' });
});

test('settings clean every field; an empty WhatsApp number means "not set"', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  store.applySeed();
  const current = Object.fromEntries(store.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
  const { values, errors } = validateSettings({ ...current, whatsapp: '', contactPhones: [{ label: 'Admissions', phone: '73560 72079' }] });
  assert.deepEqual(errors, {});
  assert.equal(values.whatsapp, null);
  assert.deepEqual(values.contactPhones, [{ label: 'Admissions', phone: '+917356072079' }]);
  assert.equal(validateSettings({ ...current, whatsapp: '98950 85731' }).values.whatsapp, '+919895085731');
  assert.ok(validateSettings({ ...current, social: [{ network: 'facebook', label: 'Facebook', url: 'javascript:x' }] }).errors.social);
});

test('every section field is a real column of its table', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  for (const [key, section] of Object.entries(SECTIONS)) {
    const columns = store.db.prepare(`PRAGMA table_info(${section.table})`).all().map(c => c.name);
    assert.ok(columns.length > 0, `${key}: table ${section.table} exists`);
    for (const f of section.fields) assert.ok(columns.includes(f.name), `${key}.${f.name}`);
  }
});

test('the schema sent to the admin page has no table names or server checks', () => {
  const schema = JSON.parse(JSON.stringify(publicSchema()));
  assert.equal(schema.faqs.label, 'FAQ');
  assert.equal(schema.faqs.table, undefined);
  assert.equal(schema.leaders.check, undefined);
  assert.equal(schema.faqs.sortable, true);
  assert.equal(SETTINGS.find(f => f.name === 'whatsapp').nullable, true);
});

test('staff can give a YouTube video its own cover image', () => {
  const cover = SECTIONS.videos.fields.find(f => f.name === 'cover');
  assert.equal(cover?.type, 'image');
  assert.ok(!cover.required);
});

test('a photo used as the homepage photo counts as in use, so it cannot be deleted', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  store.applySeed();
  store.db.prepare("UPDATE settings SET value = ? WHERE key = 'heroImage'").run(JSON.stringify('/media/u-hero1'));
  assert.ok(new AdminContent(store.db).references('/media/u-hero1').includes('Settings'));
  assert.deepEqual(new AdminContent(store.db).references('/media/u-unused'), []);
});

test('a homepage photo needs a description', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  store.applySeed();
  const settings = store.settings();
  assert.ok(validateSettings({ ...settings, heroImage: '/media/u-hero1', heroImageAlt: '' }).errors.heroImageAlt);
  assert.equal(validateSettings({ ...settings, heroImage: '', heroImageAlt: '' }).errors.heroImageAlt, undefined);
});

const seededSettings = () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  store.applySeed();
  return Object.fromEntries(store.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
};

test('staff can edit programmes, with features, a fee and the board they belong to', () => {
  const names = SECTIONS.programmes.fields.map(f => f.name);
  for (const name of ['board', 'name', 'group_size', 'key_points', 'features', 'fee', 'mentor_ratio', 'parent_meetings', 'published']) assert.ok(names.includes(name), name);
  assert.equal(SECTIONS.programmes.fields.find(f => f.name === 'features').type, 'lines');
});

test('centres have an address field', () => {
  assert.ok(SECTIONS.centres.fields.some(f => f.name === 'address'));
});

test('office phone numbers need a label and a real number', () => {
  const { errors } = validateSettings({ ...seededSettings(), contactPhones: [{ label: '', phone: '12345' }] });
  assert.ok(errors.contactPhones);
});

test('the class range must run from a lower class to a higher one, between 1 and 12', () => {
  assert.ok(validateSettings({ ...seededSettings(), classRange: { from: 10, to: 8 } }).errors.classRange);
  assert.ok(validateSettings({ ...seededSettings(), classRange: { from: 0, to: 12 } }).errors.classRange);
  assert.equal(validateSettings({ ...seededSettings(), classRange: { from: 5, to: 12 } }).errors.classRange, undefined);
});

test('course page details can be edited in Settings', () => {
  const details = SETTINGS.find(f => f.name === 'courseDetails');
  assert.deepEqual(details.fields.map(f => f.name), ['classLengths', 'classSteps', 'parentUpdates', 'stateMethod', 'stateSession', 'statePractice', 'stateExamPrep']);
  assert.deepEqual(validateSettings(seededSettings()).errors, {});
});
