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
CREATE TABLE IF NOT EXISTS results(id INTEGER PRIMARY KEY, year TEXT NOT NULL, board TEXT NOT NULL, exam TEXT NOT NULL, headline TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '', poster_alt TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS testimonials(id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('video','written')), section TEXT NOT NULL CHECK(section IN ('feedback','alumni')), title TEXT NOT NULL, person TEXT NOT NULL DEFAULT '', quote TEXT NOT NULL DEFAULT '', video TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS centres(id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, map_url TEXT NOT NULL, hours TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);`;

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

let seedSettings;
const defaultSettings = () => (seedSettings ??= loadSeed().settings ?? {});

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
    const put = db.prepare('INSERT INTO results(year, board, exam, headline, detail, poster, poster_alt, featured, sort) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.year, r.board, r.exam, r.headline, r.detail ?? '', r.poster ?? '', r.posterAlt ?? '', flag(r.featured), i));
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
};

export class ContentStore {
  constructor(db) {
    this.db = db;
    this.db.exec(SCHEMA);
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
  }

  settings() {
    const stored = Object.fromEntries(this.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
    // Seed values stand in for any key missing at runtime, so one deleted setting cannot break every page.
    const settings = { ...defaultSettings(), ...stored };
    return { ...settings, phone: phoneOrNull(settings.phone), whatsapp: phoneOrNull(settings.whatsapp) };
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
    return this.db.prepare(`SELECT year, board, exam, headline, detail, poster, poster_alt AS posterAlt FROM results WHERE ${where} ORDER BY sort, id`).all();
  }

  testimonials(section) {
    return this.db.prepare('SELECT kind, section, title, person, quote, video, poster FROM testimonials WHERE published = 1 AND section = ? ORDER BY sort, id').all(section);
  }

  jobs() {
    return this.db.prepare('SELECT title, type, location FROM jobs WHERE published = 1 ORDER BY sort, id').all();
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
