import { formatPhone } from './content-store.mjs';
import { line, block, httpError } from './validators.mjs';

const TRACKING = "status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','closed')), notes TEXT NOT NULL DEFAULT ''";
const SCHEMA = `
CREATE TABLE IF NOT EXISTS demo_bookings(id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, grade TEXT NOT NULL, board TEXT NOT NULL, mode TEXT NOT NULL, centre TEXT NOT NULL DEFAULT '', preferred_time TEXT NOT NULL DEFAULT '', ${TRACKING});
CREATE TABLE IF NOT EXISTS job_applications(id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, experience TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', cv_url TEXT NOT NULL DEFAULT '', ${TRACKING});
CREATE TABLE IF NOT EXISTS ask_questions(id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', question TEXT NOT NULL, answer TEXT NOT NULL DEFAULT '', faq_id INTEGER, ${TRACKING});`;

export const STATUSES = ['new', 'contacted', 'closed'];

/** The three inboxes: table, admin label, and the visitor's fields in display and CSV order. */
export const INBOXES = {
  demo: { table: 'demo_bookings', label: 'Demo bookings', fields: [
    { name: 'name', label: 'Student' }, { name: 'phone', label: 'Phone' }, { name: 'grade', label: 'Class' },
    { name: 'board', label: 'Board' }, { name: 'mode', label: 'Online or centre' }, { name: 'centre', label: 'Centre' },
    { name: 'preferred_time', label: 'Preferred time' },
  ] },
  careers: { table: 'job_applications', label: 'Job applications', fields: [
    { name: 'name', label: 'Name' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' },
    { name: 'role', label: 'Role' }, { name: 'experience', label: 'Experience' }, { name: 'message', label: 'Message' },
    { name: 'cv_url', label: 'CV link' },
  ] },
  ask: { table: 'ask_questions', label: 'Questions', fields: [
    { name: 'name', label: 'Name' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' },
    { name: 'question', label: 'Question' }, { name: 'answer', label: 'Answer' },
  ] },
};

function inbox(kind) {
  if (!Object.hasOwn(INBOXES, kind)) throw httpError(404, 'Unknown inbox.');
  return INBOXES[kind];
}

export function csvCell(value) {
  let text = String(value ?? '');
  // A leading = + - @ (or tab or carriage return) would run as a formula in Excel or Google Sheets.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export class InboxStore {
  constructor(db) {
    this.db = db;
    this.db.exec(SCHEMA);
  }

  add(kind, values) {
    const { table, fields } = inbox(kind);
    const names = fields.map(f => f.name).filter(name => values[name] !== undefined);
    const sql = `INSERT INTO ${table}(created_at, ${names.join(', ')}) VALUES(?, ${names.map(() => '?').join(', ')})`;
    return Number(this.db.prepare(sql).run(new Date().toISOString(), ...names.map(name => values[name])).lastInsertRowid);
  }

  list(kind) {
    return this.db.prepare(`SELECT * FROM ${inbox(kind).table} ORDER BY created_at DESC, id DESC`).all();
  }

  update(kind, id, changes) {
    const { table } = inbox(kind);
    const sets = [];
    const params = [];
    if (changes?.status !== undefined) {
      if (!STATUSES.includes(changes.status)) throw httpError(400, 'Choose new, contacted or closed.');
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (changes?.notes !== undefined) {
      const notes = block(changes.notes);
      if (notes.length > 2000) throw httpError(400, 'Keep notes under 2,000 characters.');
      sets.push('notes = ?');
      params.push(notes);
    }
    if (kind === 'ask' && changes?.answer !== undefined) {
      const answer = block(changes.answer);
      if (answer.length > 2000) throw httpError(400, 'Keep the answer under 2,000 characters.');
      sets.push('answer = ?');
      params.push(answer);
    }
    if (!sets.length) throw httpError(400, 'Nothing to save.');
    return this.db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).run(...params, id).changes > 0;
  }

  remove(kind, id) {
    return this.db.prepare(`DELETE FROM ${inbox(kind).table} WHERE id = ?`).run(id).changes > 0;
  }

  counts() {
    return Object.fromEntries(Object.entries(INBOXES).map(([kind, { table }]) => [kind, this.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE status = 'new'`).get().n]));
  }

  csv(kind) {
    const { fields } = inbox(kind);
    const columns = [{ name: 'created_at', label: 'Received' }, ...fields, { name: 'status', label: 'Status' }, { name: 'notes', label: 'Notes' }];
    const rows = this.list(kind).map(row => columns.map(c => (c.name === 'phone' ? formatPhone(row.phone) : row[c.name])));
    // The byte-order mark makes Excel read the file as UTF-8.
    return '﻿' + [columns.map(c => c.label), ...rows].map(cells => cells.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  /** Adds an answered question to the public FAQ and closes it. Returns the FAQ id, or null if the question is gone. */
  publishAnswer(id, input) {
    const existing = this.db.prepare('SELECT faq_id FROM ask_questions WHERE id = ?').get(id);
    if (!existing) return null;
    if (existing.faq_id) throw httpError(409, 'This question is already in the FAQ. Edit it under FAQ.');
    const category = line(input?.category);
    const question = line(input?.question);
    const answer = block(input?.answer);
    const fields = {};
    if (!category || category.length > 60) fields.category = 'Choose or type a topic (up to 60 characters).';
    if (question.length < 5 || question.length > 200) fields.question = 'Write the question in 5 to 200 characters.';
    if (answer.length < 5 || answer.length > 2000) fields.answer = 'Write the answer in 5 to 2,000 characters.';
    if (Object.keys(fields).length) throw httpError(400, 'Check the highlighted fields.', fields);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const sort = this.db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM faqs').get().n;
      const faqId = Number(this.db.prepare('INSERT INTO faqs(category, question, answer, sort) VALUES(?, ?, ?, ?)').run(category, question, answer, sort).lastInsertRowid);
      this.db.prepare("UPDATE ask_questions SET answer = ?, faq_id = ?, status = 'closed' WHERE id = ?").run(answer, faqId, id);
      this.db.exec('COMMIT');
      return faqId;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
