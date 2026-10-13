import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { httpError } from './validators.mjs';

// The same widths as src/lib/media.mjs, which builds the srcset; a test keeps them equal.
export const WIDTHS = [480, 960, 1600];
export const MAX_UPLOAD = 10 * 1024 * 1024;
const FORMATS = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
export const MEDIA_TYPES = Object.keys(FORMATS);
// Refuse decompression bombs: a small file that expands to a huge image.
const MAX_PIXELS = 50_000_000;

export class MediaLibrary {
  constructor(db, dir) {
    this.db = db;
    this.dir = dir;
    this.db.exec('CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, alt TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL)');
  }

  list() {
    return this.db.prepare('SELECT id, name, alt, width, height, created_at AS createdAt FROM media ORDER BY id DESC').all().map(row => ({ ...row, base: `/media/${row.name}` }));
  }

  get(id) {
    const row = this.db.prepare('SELECT id, name, alt FROM media WHERE id = ?').get(id);
    return row ? { ...row, base: `/media/${row.name}` } : null;
  }

  async add(buffer, type, altText) {
    const format = FORMATS[type];
    if (!format) throw httpError(415, 'Upload a JPEG, PNG or WebP image.');
    const alt = String(altText ?? '').replace(/\s+/g, ' ').trim();
    if (!alt || alt.length > 200) throw httpError(400, 'Describe the photo in a few words (up to 200 characters).');
    let meta;
    try { meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata(); } catch { throw httpError(400, 'This file is not a readable image.'); }
    if (meta.format !== format) throw httpError(415, 'The file is not the type of image it claims to be.');
    const name = `u-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
    await mkdir(this.dir, { recursive: true });
    try {
      for (const width of WIDTHS) {
        await sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(this.dir, `${name}-${width}.webp`));
      }
    } catch {
      await this.removeFiles(name);
      throw httpError(400, 'This image could not be processed. Try saving it again as a JPEG.');
    }
    // EXIF orientations 5 to 8 rotate the photo a quarter turn, which swaps its width and height.
    const turned = (meta.orientation ?? 1) >= 5;
    const width = turned ? meta.height : meta.width;
    const height = turned ? meta.width : meta.height;
    const id = Number(this.db.prepare('INSERT INTO media(name, alt, width, height, created_at) VALUES(?, ?, ?, ?, ?)').run(name, alt, width, height, new Date().toISOString()).lastInsertRowid);
    return { id, name, alt, width, height, base: `/media/${name}` };
  }

  async remove(id) {
    const row = this.get(id);
    if (!row) return false;
    this.db.prepare('DELETE FROM media WHERE id = ?').run(id);
    await this.removeFiles(row.name);
    return true;
  }

  removeFiles(name) {
    return Promise.all(WIDTHS.map(width => rm(path.join(this.dir, `${name}-${width}.webp`), { force: true })));
  }
}
