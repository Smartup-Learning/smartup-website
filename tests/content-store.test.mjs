import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
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
  assert.equal(s.social.length, 7);
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
  assert.equal(store.settings().social.length, 7);
  assert.equal(store.settings().heroHeadline, 'Edited');
});

test('settings fall back to seed defaults for keys missing at runtime', () => {
  const store = seeded();
  store.db.exec("DELETE FROM settings WHERE key IN ('social', 'vision', 'hours')");
  const s = store.settings();
  assert.equal(s.social.length, 7);
  assert.equal(s.vision.priorities.length, 5);
  assert.equal(s.hours, '5–9 pm');
});

test('main phone and WhatsApp settings are normalized, or dropped when invalid', () => {
  const store = seeded();
  store.db.exec(`UPDATE settings SET value = '"88919 10919"' WHERE key = 'phone'; UPDATE settings SET value = '"not a number"' WHERE key = 'whatsapp';`);
  assert.equal(store.settings().phone, '+918891910919');
  assert.equal(store.settings().whatsapp, null);
});

test('a timeline chapter with malformed media still loads, with no photos', () => {
  const store = seeded();
  store.db.exec("UPDATE timeline_entries SET media = '' WHERE year_label = '2015'");
  assert.deepEqual(store.timeline().find(c => c.yearLabel === '2015').media, []);
});

test('two stores seeding the same new database do not collide', async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = (await import('node:path')).default;
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'seed-')), 'db.sqlite');
  const a = new ContentStore(new DatabaseSync(file));
  const b = new ContentStore(new DatabaseSync(file));
  const seed = (await import('../server/content-store.mjs')).loadSeed();
  let raced = false;
  // The first section b reads triggers a full seed by a, simulating a second process that wins the race.
  const racing = new Proxy(seed, { get(target, key) { if (!raced && key === 'stats') { raced = true; a.applySeed(); } return target[key]; } });
  assert.doesNotThrow(() => b.applySeed(racing));
  assert.equal(b.stats().length, 4);
});

test('Phase 2 content is seeded', () => {
  const store = seeded();
  assert.equal(store.faculty().length, 35);
  assert.ok(store.events().length >= 10);
  assert.ok(store.videos('toppers').length === 4);
  assert.equal(store.posts().length, 3);
  assert.ok(store.faqs().length >= 12);
  assert.ok(store.results().filter(r => r.kind === 'summary').length >= 6);
  assert.ok(store.results().length >= 60);
});

test('a single post is found by slug, and unknown slugs return null', () => {
  const store = seeded();
  const [first] = store.posts();
  assert.equal(store.post(first.slug).title, first.title);
  assert.equal(store.post('no-such-post'), null);
});

test('posts come newest first and unpublished posts are hidden', () => {
  const store = seeded();
  const dates = store.posts().map(p => p.publishedAt);
  assert.deepEqual(dates, [...dates].sort().reverse());
  store.db.exec('UPDATE posts SET published = 0');
  assert.deepEqual(store.posts(), []);
});

test('company settings and labelled office phones are available', () => {
  const s = seeded().settings();
  assert.equal(s.legalName, 'Smartup Eduventures Private Limited');
  assert.deepEqual(s.contactPhones.map(p => p.phone), ['+917356072079', '+917994436060']);
  assert.ok(s.social.some(x => x.network === 'linkedin'));
  assert.equal(s.googleReviewsUrl, null);
});

test('an older database without a results kind column is upgraded', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE results(id INTEGER PRIMARY KEY, year TEXT NOT NULL, board TEXT NOT NULL, exam TEXT NOT NULL, headline TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '', poster_alt TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)");
  db.exec("INSERT INTO results(year, board, exam, headline) VALUES('2020', 'State', 'Plus One', 'Old row')");
  const store = new ContentStore(db);
  assert.equal(store.results()[0].kind, 'student');
});

test('an older database gains the Phase 3 columns with safe defaults', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE faculty(id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', team TEXT NOT NULL DEFAULT 'team', qualification TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)");
  db.exec("INSERT INTO faculty(name) VALUES('Old teacher')");
  db.exec("CREATE TABLE jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)");
  db.exec("INSERT INTO jobs(title, type) VALUES('Old job', 'Other')");
  const store = new ContentStore(db);
  assert.deepEqual({ ...store.faculty()[0] }, { name: 'Old teacher', role: '', team: 'team', qualification: '', note: '', photo: '', experienceYears: 0, expertise: '', intro: '' });
  assert.equal(store.jobs()[0].description, '');
});

test('alumni stories come in order and unpublished ones stay hidden', () => {
  const store = seeded();
  store.db.exec('DELETE FROM alumni');
  store.db.exec("INSERT INTO alumni(name, batch, now_role, story, sort) VALUES('Second', 'SSLC 2019', 'Engineer', 'Story two', 2), ('First', 'Plus Two 2018', 'Doctor', 'Story one', 1), ('Hidden', '', '', '', 0)");
  store.db.exec("UPDATE alumni SET published = 0 WHERE name = 'Hidden'");
  assert.deepEqual(store.alumni().map(a => a.name), ['First', 'Second']);
  assert.equal(store.alumni()[0].nowRole, 'Doctor');
  assert.equal(store.alumni()[0].isSample, false);
});

test('the starter blog posts are marked as samples until the client approves them', () => {
  const store = seeded();
  assert.ok(store.posts().length > 0 && store.posts().every(p => p.isSample === true));
  assert.equal(store.post(store.posts()[0].slug).isSample, true);
});

test('testimonials report a screenshot image and the sample flag', () => {
  const store = seeded();
  store.db.exec("UPDATE testimonials SET image = '/media/u-shot', is_sample = 1 WHERE rowid = (SELECT MIN(rowid) FROM testimonials WHERE section = 'feedback')");
  const [first] = store.testimonials('feedback');
  assert.equal(first.image, '/media/u-shot');
  assert.equal(first.isSample, true);
});

test('the client\'s alumni are seeded in order with their photos', () => {
  const alumni = seeded().alumni();
  assert.deepEqual(alumni.map(a => a.name), ['Mufeedha', 'Rusfidha', 'Dylan', 'Ameen', 'Zamreen']);
  for (const a of alumni) {
    assert.match(a.photo, /^\/seed\/img\/alumni-/);
    assert.ok(a.photoAlt.length > 10, a.name);
    assert.match(a.batch, /^Batch of 20\d\d/);
    assert.ok(a.nowRole.length > 0, a.name);
    assert.equal(a.isSample, false);
  }
});

test('media sizes come from the seed list and from staff uploads', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  const sizes = JSON.parse(readFileSync('data-seed/media-sizes.json', 'utf8'));
  const [width, height] = sizes['/seed/img/alumni-mufeedha'];
  assert.deepEqual(store.mediaSize('/seed/img/alumni-mufeedha'), { width, height });
  assert.deepEqual(store.mediaSize('/seed/img/alumni-mufeedha-960.webp'), { width, height });
  const poster = Object.keys(sizes).find(key => key.startsWith('/seed/video/'));
  assert.deepEqual(store.mediaSize(`${poster}.webp`), { width: sizes[poster][0], height: sizes[poster][1] });
  assert.equal(store.mediaSize('/media/u-missing'), null);
  store.db.exec('CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, alt TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL)');
  store.db.prepare("INSERT INTO media(name, alt, width, height, created_at) VALUES('u-abc', 'x', 1200, 800, 'now')").run();
  assert.deepEqual(store.mediaSize('/media/u-abc'), { width: 1200, height: 800 });
  assert.equal(store.mediaSize('/seed/img/not-a-real-image'), null);
  assert.equal(store.mediaSize(''), null);
});

test('YouTube videos can carry a cover image, empty until staff add one', () => {
  const store = seeded();
  assert.ok(store.videos().every(v => v.cover === ''));
  store.db.prepare("UPDATE videos SET cover = '/media/u-cover' WHERE id = (SELECT min(id) FROM videos)").run();
  assert.equal(store.videos()[0].cover, '/media/u-cover');
});

test('a database seeded with EDX before JWALA is put newest first once, and a later staff order is kept', () => {
  const store = seeded();
  const sortOf = title => store.db.prepare('SELECT sort FROM events WHERE title LIKE ?').get(`${title}%`).sort;
  const order = () => store.events().map(e => e.title).filter(t => /^(EDX|JWALA)/.test(t)).map(t => t.slice(0, 4));
  // An older database: EDX listed before JWALA, and the correction not yet applied.
  const [edx, jwala] = [sortOf('EDX'), sortOf('JWALA')];
  store.db.prepare("UPDATE events SET sort = ? WHERE title LIKE 'EDX%'").run(Math.min(edx, jwala));
  store.db.prepare("UPDATE events SET sort = ? WHERE title LIKE 'JWALA%'").run(Math.max(edx, jwala));
  store.db.prepare("DELETE FROM seed_log WHERE section LIKE 'fix:%'").run();
  assert.deepEqual(order(), ['EDX:', 'JWAL']);
  store.applySeed();
  assert.deepEqual(order(), ['JWAL', 'EDX:']);
  // Staff move EDX back up; a restart must not undo that.
  store.db.prepare("UPDATE events SET sort = -1 WHERE title LIKE 'EDX%'").run();
  store.applySeed();
  assert.deepEqual(order(), ['EDX:', 'JWAL']);
});

test('an older database gets the three shared centre numbers, mentorship and the local contact link, once', () => {
  const store = seeded();
  // As an earlier version seeded it: one number per centre, Power without mentorship, ratios as mentor counts.
  store.db.exec(`UPDATE centres SET phone = '+91' || (9000000000 + id), sort = 9 - id;
    UPDATE programmes SET mentor_ratio = '1 mentor : 10 students' WHERE name = 'Smartup Pro';
    UPDATE programmes SET features = '["Competency-based learning"]' WHERE name = 'Smartup Power';
    UPDATE posts SET body = replace(body, '](/contact)', '](https://smartupedu.in/contact)');
    DELETE FROM seed_log WHERE section LIKE 'fix:%';`);
  store.applySeed();
  const groups = Object.groupBy(store.centres(), c => c.phone);
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([phone, list]) => [phone, list.map(c => c.name)])), {
    '+917356072139': ['Eraveli', 'Fort Kochi', 'Kadavanthra'],
    '+917356072108': ['Chullickal', 'Moolamkuzhi', 'Edappally'],
    '+917356072098': ['Palluruthy', 'Thoppumpady', 'Vennala'],
  });
  const [pro, , power] = store.programmes();
  assert.equal(pro.mentorRatio, '1:1 Mentorship');
  assert.ok(power.features.includes('Mentorship and support'));
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM posts WHERE body LIKE '%smartupedu.in/contact%'").get().n, 0);
  // A number staff change afterwards is kept on restart.
  store.db.prepare("UPDATE centres SET phone = '+919999999999' WHERE name = 'Vennala'").run();
  store.applySeed();
  assert.equal(store.centres().find(c => c.name === 'Vennala').phone, '+919999999999');
});

test('programmes are seeded in order with their board, key points, features and details', () => {
  const programmes = seeded().programmes();
  assert.deepEqual(programmes.map(p => p.name), ['Smartup Pro', 'Smartup Trio', 'Smartup Power', 'State Board programme']);
  const [pro] = programmes;
  assert.equal(pro.board, 'cbse');
  assert.equal(pro.groupSize, '1:1');
  assert.ok(pro.keyPoints.length >= 2 && pro.features.includes('Competency-based learning'));
  assert.equal(pro.mentorRatio, '1:1 Mentorship');
  assert.equal(pro.parentMeetings, 'Monthly');
  assert.equal(pro.fee, '');
});

test('centres have an address, empty until staff add one', () => {
  assert.ok(seeded().centres().every(c => c.address === ''));
});

test('office phone numbers carry labels, and an older database keeps the numbers it had', () => {
  assert.deepEqual(seeded().settings().contactPhones, [{ label: 'Office', phone: '+917356072079' }, { label: 'Office', phone: '+917994436060' }]);
  const older = new ContentStore(new DatabaseSync(':memory:'));
  older.db.exec("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  older.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?)').run('phone', JSON.stringify('+918891910919'));
  older.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?)').run('phones', JSON.stringify(['+918891910919', '+919895085731']));
  older.applySeed();
  assert.deepEqual(older.settings().contactPhones, [{ label: 'Office', phone: '+919895085731' }]);
});

test('the classes Smartup teaches default to Class 8 to Plus Two', () => {
  assert.deepEqual(seeded().settings().classRange, { from: 8, to: 12 });
});
