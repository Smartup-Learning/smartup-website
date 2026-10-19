import { SECTIONS, SETTINGS, validateRow, validateSettings } from './admin-schema.mjs';
import { seedSettings } from './content-store.mjs';
import { httpError } from './validators.mjs';

const JSON_TYPES = new Set(['list', 'group', 'lines']);

function decode(section, row) {
  const out = { id: row.id };
  for (const field of section.fields) {
    const value = row[field.name];
    if (field.type === 'checkbox') out[field.name] = value === 1;
    else if (JSON_TYPES.has(field.type)) {
      try { out[field.name] = JSON.parse(value); } catch { out[field.name] = field.type === 'group' ? {} : []; }
    } else out[field.name] = value;
  }
  return out;
}

/** Generic create, read, update, delete and reorder for every section in the admin schema. */
export class AdminContent {
  constructor(db) {
    this.db = db;
  }

  section(key) {
    if (!Object.hasOwn(SECTIONS, key)) throw httpError(404, 'Unknown section.');
    return SECTIONS[key];
  }

  list(key) {
    const section = this.section(key);
    const columns = section.fields.map(f => f.name).join(', ');
    return this.db.prepare(`SELECT rowid AS id, ${columns} FROM ${section.table} ORDER BY ${section.order}`).all().map(row => decode(section, row));
  }

  create(key, input) {
    const section = this.section(key);
    const values = this.validate(section, input);
    if (section.sortable) values.sort = this.db.prepare(`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM ${section.table}`).get().n;
    const names = Object.keys(values);
    const sql = `INSERT INTO ${section.table}(${names.join(', ')}) VALUES(${names.map(() => '?').join(', ')})`;
    return Number(this.write(() => this.db.prepare(sql).run(...names.map(n => values[n]))).lastInsertRowid);
  }

  update(key, id, input) {
    const section = this.section(key);
    const values = this.validate(section, input);
    const names = Object.keys(values);
    const result = this.write(() => this.db.prepare(`UPDATE ${section.table} SET ${names.map(n => `${n} = ?`).join(', ')} WHERE rowid = ?`).run(...names.map(n => values[n]), id));
    if (!result.changes) throw httpError(404, 'This item no longer exists.');
  }

  remove(key, id) {
    const section = this.section(key);
    if (!this.db.prepare(`DELETE FROM ${section.table} WHERE rowid = ?`).run(id).changes) throw httpError(404, 'This item no longer exists.');
  }

  reorder(key, ids) {
    const section = this.section(key);
    if (!section.sortable) throw httpError(400, 'This section is not ordered by hand.');
    if (!Array.isArray(ids) || !ids.every(Number.isInteger)) throw httpError(400, 'Send the new order as a list of ids.');
    const put = this.db.prepare(`UPDATE ${section.table} SET sort = ? WHERE rowid = ?`);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      ids.forEach((id, index) => put.run(index, id));
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  validate(section, input) {
    const { values, errors } = validateRow(section, input);
    if (Object.keys(errors).length) throw httpError(400, 'Check the highlighted fields.', errors);
    for (const field of section.fields) if (JSON_TYPES.has(field.type)) values[field.name] = JSON.stringify(values[field.name]);
    return values;
  }

  write(run) {
    try {
      return run();
    } catch (error) {
      const column = /UNIQUE constraint failed: \w+\.(\w+)/.exec(error.message)?.[1];
      if (column) throw httpError(409, 'Another item already uses this value.', { [column]: 'Another item already uses this value.' });
      throw error;
    }
  }

  settings() {
    const stored = Object.fromEntries(this.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
    const defaults = seedSettings();
    return Object.fromEntries(SETTINGS.map(f => [f.name, stored[f.name] ?? defaults[f.name] ?? null]));
  }

  saveSettings(input) {
    // Each admin screen sends only its own fields; the others are checked as saved and left untouched.
    const isObject = input && typeof input === 'object' && !Array.isArray(input);
    const { values, errors } = validateSettings(isObject ? { ...this.settings(), ...input } : input);
    if (Object.keys(errors).length) throw httpError(400, 'Check the highlighted fields.', errors);
    const put = this.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, value] of Object.entries(values)) if (Object.hasOwn(input, key)) put.run(key, JSON.stringify(value));
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /** Labels of the sections whose image fields or photo lists use this media path. */
  references(base) {
    const used = [];
    for (const section of Object.values(SECTIONS)) {
      const columns = section.fields.filter(f => f.type === 'image' || f.type === 'list').map(f => f.name);
      if (!columns.length) continue;
      const hit = this.db.prepare(`SELECT 1 FROM ${section.table} WHERE ${columns.map(c => `instr(${c}, ?) > 0`).join(' OR ')} LIMIT 1`).get(...columns.map(() => base));
      if (hit) used.push(section.label);
    }
    // Settings can use photos too, such as the homepage photo.
    const imageSettings = SETTINGS.filter(f => f.type === 'image').map(f => f.name);
    if (imageSettings.length) {
      const hit = this.db.prepare(`SELECT 1 FROM settings WHERE key IN (${imageSettings.map(() => '?').join(', ')}) AND instr(value, ?) > 0 LIMIT 1`).get(...imageSettings, base);
      if (hit) used.push('Settings');
    }
    return used;
  }
}
