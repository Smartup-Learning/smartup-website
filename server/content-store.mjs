import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS seed_log(section TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stats(id INTEGER PRIMARY KEY, value TEXT NOT NULL, label TEXT NOT NULL, source TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS timeline_entries(id INTEGER PRIMARY KEY, year_label TEXT NOT NULL, title TEXT NOT NULL, story TEXT NOT NULL DEFAULT '', stat_value TEXT NOT NULL DEFAULT '', stat_label TEXT NOT NULL DEFAULT '', media TEXT NOT NULL DEFAULT '[]', source_url TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS growth_points(year INTEGER PRIMARY KEY, students INTEGER NOT NULL, students_label TEXT NOT NULL, centres INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS leaders(id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', photo_alt TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS results(id INTEGER PRIMARY KEY, year TEXT NOT NULL, board TEXT NOT NULL, exam TEXT NOT NULL, headline TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '', poster_alt TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'student', featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS testimonials(id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('video','written')), section TEXT NOT NULL CHECK(section IN ('feedback','alumni')), title TEXT NOT NULL, person TEXT NOT NULL DEFAULT '', quote TEXT NOT NULL DEFAULT '', video TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS centres(id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, map_url TEXT NOT NULL, hours TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS faculty(id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', team TEXT NOT NULL DEFAULT 'team', qualification TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL, date_label TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', media TEXT NOT NULL DEFAULT '[]', youtube_id TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY, youtube_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, format TEXT NOT NULL DEFAULT 'landscape' CHECK(format IN ('landscape','portrait')), sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, author TEXT NOT NULL DEFAULT 'Smartup Academic Team', published_at TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS faqs(id INTEGER PRIMARY KEY, category TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS alumni(id INTEGER PRIMARY KEY, name TEXT NOT NULL, batch TEXT NOT NULL DEFAULT '', now_role TEXT NOT NULL DEFAULT '', story TEXT NOT NULL DEFAULT '', achievements TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', photo_alt TEXT NOT NULL DEFAULT '', is_sample INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);`;

export function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) throw new Error(`Not an Indian mobile number: ${raw}`);
  return `+91${local}`;
}

export function formatPhone(e164) {
  const local = e164.slice(3);
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

export function loadSeed(file = path.resolve('data-seed/content.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

let cachedSeedSettings;
/** The seed's settings: defaults for any key missing from the database. */
export const seedSettings = () => (cachedSeedSettings ??= loadSeed().settings ?? {});
let cachedYoutubeCovers;
// Portrait covers built from YouTube thumbnails (media-sources entries with from: "youtube"), by video ID.
const youtubeCovers = () => (cachedYoutubeCovers ??= (() => {
  try {
    const sources = JSON.parse(readFileSync(path.resolve('data-seed/media-sources.json'), 'utf8'));
    return new Map(sources.filter(s => s.from === 'youtube').map(s => [s.id, `/seed/img/${s.name}`]));
  } catch { return new Map(); }
})());
let cachedSeedSizes;
// Sizes of the built seed images and video posters, written by scripts/media-sizes.mjs.
const seedSizes = () => (cachedSeedSizes ??= (() => {
  try { return JSON.parse(readFileSync(path.resolve('data-seed/media-sizes.json'), 'utf8')); } catch { return {}; }
})());

function phoneOrNull(raw) {
  if (typeof raw !== 'string') return null;
  try { return normalizePhone(raw); } catch { return null; }
}

function parseList(text) {
  try { const value = JSON.parse(text); return Array.isArray(value) ? value : []; } catch { return []; }
}

const flag = value => (value ? 1 : 0);
const SECTIONS = {
  stats(db, rows) {
    const put = db.prepare('INSERT INTO stats(value, label, source, sort) VALUES(?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.value, r.label, r.source ?? '', i));
  },
  timeline(db, rows) {
    const put = db.prepare('INSERT INTO timeline_entries(year_label, title, story, stat_value, stat_label, media, source_url, featured, sort) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.yearLabel, r.title, r.story ?? '', r.statValue ?? '', r.statLabel ?? '', JSON.stringify(r.media ?? []), r.sourceUrl ?? '', flag(r.featured), i));
  },
  growth(db, rows) {
    const put = db.prepare('INSERT INTO growth_points(year, students, students_label, centres) VALUES(?, ?, ?, ?)');
    for (const r of rows) put.run(r.year, r.students, r.studentsLabel, r.centres);
  },
  leaders(db, rows) {
    const put = db.prepare('INSERT INTO leaders(name, role, summary, bio, photo, photo_alt, sort) VALUES(?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.name, r.role, r.summary ?? '', r.bio ?? '', r.photo ?? '', r.photoAlt ?? '', i));
  },
  results(db, rows) {
    const put = db.prepare('INSERT INTO results(year, board, exam, headline, detail, poster, poster_alt, featured, kind, sort) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.year, r.board, r.exam, r.headline, r.detail ?? '', r.poster ?? '', r.posterAlt ?? '', flag(r.featured), r.kind ?? 'student', i));
  },
  testimonials(db, rows) {
    const put = db.prepare('INSERT INTO testimonials(kind, section, title, person, quote, video, poster, sort) VALUES(?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.kind, r.section, r.title, r.person ?? '', r.quote ?? '', r.video ?? '', r.poster ?? '', i));
  },
  jobs(db, rows) {
    const put = db.prepare('INSERT INTO jobs(title, type, location, sort) VALUES(?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.title, r.type, r.location ?? '', i));
  },
  centres(db, rows) {
    const put = db.prepare('INSERT INTO centres(name, phone, map_url, hours, sort) VALUES(?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.name, normalizePhone(r.phone), r.mapUrl, r.hours, i));
  },
  faculty(db, rows) {
    const put = db.prepare('INSERT INTO faculty(name, role, team, qualification, note, photo, sort) VALUES(?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.name, r.role ?? '', r.team ?? 'team', r.qualification ?? '', r.note ?? '', r.photo ?? '', i));
  },
  events(db, rows) {
    const put = db.prepare('INSERT INTO events(category, title, date_label, summary, media, youtube_id, sort) VALUES(?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.category, r.title, r.dateLabel ?? '', r.summary ?? '', JSON.stringify(r.media ?? []), r.youtubeId ?? '', i));
  },
  videos(db, rows) {
    const put = db.prepare('INSERT INTO videos(youtube_id, title, category, format, sort) VALUES(?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.youtubeId, r.title, r.category, r.format ?? 'landscape', i));
  },
  posts(db, rows) {
    const put = db.prepare('INSERT INTO posts(slug, title, category, excerpt, body, author, published_at, is_sample) VALUES(?, ?, ?, ?, ?, ?, ?, ?)');
    for (const r of rows) put.run(r.slug, r.title, r.category, r.excerpt ?? '', r.body, r.author ?? 'Smartup Academic Team', r.publishedAt, flag(r.isSample));
  },
  faqs(db, rows) {
    const put = db.prepare('INSERT INTO faqs(category, question, answer, sort) VALUES(?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.category, r.question, r.answer, i));
  },
  alumni(db, rows) {
    const put = db.prepare('INSERT INTO alumni(name, batch, now_role, story, achievements, photo, photo_alt, is_sample, sort) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.name, r.batch ?? '', r.nowRole ?? '', r.story ?? '', r.achievements ?? '', r.photo ?? '', r.photoAlt ?? '', flag(r.isSample), i));
  },
};

// Columns added after the first release; the constructor adds any that an existing database lacks.
// One-time corrections to content seeded by an earlier version, each applied once per database and recorded in
// seed_log as "fix:<name>", so anything staff change afterwards is never undone.
const CORRECTIONS = {
  // Workshops & academics listed EDX 2024 before JWALA 2025; newest comes first.
  'events-newest-first'(db) {
    const find = pattern => db.prepare('SELECT id, sort FROM events WHERE title LIKE ?').get(pattern);
    const edx = find('EDX:%'), jwala = find('JWALA 2025%');
    if (!edx || !jwala || jwala.sort < edx.sort || (jwala.sort === edx.sort && jwala.id < edx.id)) return;
    const put = db.prepare('UPDATE events SET sort = ? WHERE id = ?');
    put.run(jwala.sort, edx.id);
    put.run(edx.sort, jwala.id);
    if (edx.sort === jwala.sort) put.run(edx.sort - 1, jwala.id);
  },
};

const ADDED_COLUMNS = [
  ['results', 'kind', "TEXT NOT NULL DEFAULT 'student'"],
  ['faculty', 'experience_years', 'INTEGER NOT NULL DEFAULT 0'],
  ['faculty', 'expertise', "TEXT NOT NULL DEFAULT ''"],
  ['faculty', 'intro', "TEXT NOT NULL DEFAULT ''"],
  ['jobs', 'description', "TEXT NOT NULL DEFAULT ''"],
  ['posts', 'is_sample', 'INTEGER NOT NULL DEFAULT 0'],
  ['testimonials', 'is_sample', 'INTEGER NOT NULL DEFAULT 0'],
  ['testimonials', 'image', "TEXT NOT NULL DEFAULT ''"],
  ['videos', 'cover', "TEXT NOT NULL DEFAULT ''"],
];

export class ContentStore {
  constructor(db) {
    this.db = db;
    this.db.exec(SCHEMA);
    for (const [table, column, ddl] of ADDED_COLUMNS) {
      const existing = this.db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!existing.includes(column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  }

  applySeed(data = loadSeed()) {
    // Settings are added key by key on every start, so keys introduced later reach existing databases; edited values are kept.
    if (data.settings) {
      const put = this.db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)');
      for (const [key, value] of Object.entries(data.settings)) put.run(key, JSON.stringify(value));
    }
    const done = new Set(this.db.prepare('SELECT section FROM seed_log').all().map(r => r.section));
    for (const [section, apply] of Object.entries(SECTIONS)) {
      if (done.has(section) || data[section] === undefined) continue;
      this.db.exec('BEGIN IMMEDIATE');
      try {
        // Another process may have seeded this section since `done` was read.
        if (this.db.prepare('SELECT 1 FROM seed_log WHERE section = ?').get(section)) { this.db.exec('COMMIT'); continue; }
        apply(this.db, data[section]);
        this.db.prepare('INSERT INTO seed_log(section, applied_at) VALUES(?, ?)').run(section, new Date().toISOString());
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
    for (const [name, fix] of Object.entries(CORRECTIONS)) {
      const key = `fix:${name}`;
      this.db.exec('BEGIN IMMEDIATE');
      try {
        if (!this.db.prepare('SELECT 1 FROM seed_log WHERE section = ?').get(key)) {
          fix(this.db);
          this.db.prepare('INSERT INTO seed_log(section, applied_at) VALUES(?, ?)').run(key, new Date().toISOString());
        }
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }

  /** The built cover for a YouTube video, when one was made from its own thumbnail; staff covers take priority. */
  youtubeCover(id) {
    const cover = youtubeCovers().get(id);
    return cover && this.mediaSize(cover) ? cover : '';
  }

  /** Real width and height of a seed image, video poster or staff upload, or null when unknown. */
  mediaSize(src) {
    const base = String(src ?? '').replace(/(-(480|960|1600))?\.webp$/, '');
    if (base.startsWith('/seed/')) {
      const size = seedSizes()[base];
      return size ? { width: size[0], height: size[1] } : null;
    }
    const upload = /^\/media\/([\w-]+)$/.exec(base);
    if (!upload) return null;
    // The media table belongs to the media library, which may not have created it yet.
    try {
      const row = this.db.prepare('SELECT width, height FROM media WHERE name = ?').get(upload[1]);
      return row ? { width: row.width, height: row.height } : null;
    } catch { return null; }
  }

  settings() {
    const stored = Object.fromEntries(this.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
    // Seed values stand in for any key missing at runtime, so one deleted setting cannot break every page.
    const settings = { ...seedSettings(), ...stored };
    return { ...settings, phone: phoneOrNull(settings.phone), whatsapp: phoneOrNull(settings.whatsapp), phones: (settings.phones ?? []).map(phoneOrNull).filter(Boolean) };
  }

  stats() {
    return this.db.prepare('SELECT value, label, source FROM stats WHERE published = 1 ORDER BY sort, id').all();
  }

  timeline({ featured = false } = {}) {
    const where = featured ? 'published = 1 AND featured = 1' : 'published = 1';
    return this.db.prepare(`SELECT id, year_label AS yearLabel, title, story, stat_value AS statValue, stat_label AS statLabel, media, source_url AS sourceUrl, featured FROM timeline_entries WHERE ${where} ORDER BY sort, id`).all()
      .map(r => ({ ...r, media: parseList(r.media), featured: r.featured === 1 }));
  }

  growth() {
    return this.db.prepare('SELECT year, students, students_label AS studentsLabel, centres FROM growth_points ORDER BY year').all();
  }

  leaders() {
    return this.db.prepare('SELECT name, role, summary, bio, photo, photo_alt AS photoAlt FROM leaders WHERE published = 1 ORDER BY sort, id').all();
  }

  results({ featured = false } = {}) {
    const where = featured ? 'published = 1 AND featured = 1' : 'published = 1';
    return this.db.prepare(`SELECT year, board, exam, headline, detail, poster, poster_alt AS posterAlt, kind FROM results WHERE ${where} ORDER BY sort, id`).all();
  }

  faculty() {
    return this.db.prepare('SELECT name, role, team, qualification, note, photo, experience_years AS experienceYears, expertise, intro FROM faculty WHERE published = 1 ORDER BY sort, id').all();
  }

  events() {
    return this.db.prepare('SELECT id, category, title, date_label AS dateLabel, summary, media, youtube_id AS youtubeId FROM events WHERE published = 1 ORDER BY sort, id').all()
      .map(r => ({ ...r, media: parseList(r.media) }));
  }

  videos(category) {
    const sql = 'SELECT youtube_id AS youtubeId, title, category, format, cover FROM videos WHERE published = 1' + (category ? ' AND category = ?' : '') + ' ORDER BY sort, id';
    return category ? this.db.prepare(sql).all(category) : this.db.prepare(sql).all();
  }

  posts() {
    return this.db.prepare('SELECT slug, title, category, excerpt, author, published_at AS publishedAt, is_sample AS isSample FROM posts WHERE published = 1 ORDER BY published_at DESC, id DESC').all()
      .map(r => ({ ...r, isSample: r.isSample === 1 }));
  }

  post(slug) {
    const row = this.db.prepare('SELECT slug, title, category, excerpt, author, published_at AS publishedAt, body, is_sample AS isSample FROM posts WHERE published = 1 AND slug = ?').get(slug);
    return row ? { ...row, isSample: row.isSample === 1 } : null;
  }

  faqs() {
    return this.db.prepare('SELECT category, question, answer FROM faqs WHERE published = 1 ORDER BY sort, id').all();
  }

  testimonials(section) {
    return this.db.prepare('SELECT kind, section, title, person, quote, video, poster, image, is_sample AS isSample FROM testimonials WHERE published = 1 AND section = ? ORDER BY sort, id').all(section)
      .map(r => ({ ...r, isSample: r.isSample === 1 }));
  }

  jobs() {
    return this.db.prepare('SELECT title, type, location, description FROM jobs WHERE published = 1 ORDER BY sort, id').all();
  }

  alumni() {
    return this.db.prepare('SELECT name, batch, now_role AS nowRole, story, achievements, photo, photo_alt AS photoAlt, is_sample AS isSample FROM alumni WHERE published = 1 ORDER BY sort, id').all()
      .map(r => ({ ...r, isSample: r.isSample === 1 }));
  }

  centres() {
    return this.db.prepare('SELECT name, phone, map_url AS mapUrl, hours FROM centres WHERE published = 1 ORDER BY sort, id').all();
  }
}

// Used by `astro dev`, where server.mjs is not running and cannot pass locals.store.
export function openContentStore(file = path.join(process.env.DATA_DIR || 'data', 'smartup.sqlite')) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const store = new ContentStore(db);
  store.applySeed();
  return store;
}
