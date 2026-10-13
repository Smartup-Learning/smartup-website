import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { srcset, variantFiles, driveUrl, validateSources, referencedMedia } from '../src/lib/media.mjs';

const sources = JSON.parse(readFileSync('data-seed/media-sources.json', 'utf8'));
const content = JSON.parse(readFileSync('data-seed/content.json', 'utf8'));

test('srcset lists the three widths', () => {
  assert.equal(srcset('/seed/img/a'), '/seed/img/a-480.webp 480w, /seed/img/a-960.webp 960w, /seed/img/a-1600.webp 1600w');
  assert.deepEqual(variantFiles('a').map(v => v.file), ['a-480.webp', 'a-960.webp', 'a-1600.webp']);
});

test('drive URLs are direct downloads', () => {
  assert.equal(driveUrl('abc_-1'), 'https://drive.google.com/uc?export=download&id=abc_-1');
});

test('source list rejects duplicates, bad names and missing locations', () => {
  assert.doesNotThrow(() => validateSources(sources));
  assert.throws(() => validateSources([{ name: 'a', kind: 'image', from: 'drive', id: 'x' }, { name: 'a', kind: 'image', from: 'drive', id: 'y' }]), /duplicate/);
  assert.throws(() => validateSources([{ name: 'Bad Name', kind: 'image', from: 'drive', id: 'x' }]), /kebab-case/);
  assert.throws(() => validateSources([{ name: 'a', kind: 'image', from: 'local' }]), /path/);
});

test('every image and video referenced by content.json has a source', () => {
  const names = new Set(sources.map(s => s.name));
  const { images, videos } = referencedMedia(content);
  for (const name of [...images, ...videos]) assert.ok(names.has(name), `${name} has no entry in media-sources.json`);
});

test('every source has been built into public/seed', () => {
  for (const s of sources) {
    if (s.kind === 'image') for (const v of variantFiles(s.name)) assert.ok(existsSync(`public/seed/img/${v.file}`), v.file);
    else { assert.ok(existsSync(`public/seed/video/${s.name}.mp4`), s.name); assert.ok(existsSync(`public/seed/video/${s.name}-poster.webp`), s.name + ' poster'); }
  }
});

test('video posters stay small in total, since browsers fetch them before any tap', async () => {
  const { statSync } = await import('node:fs');
  const total = sources.filter(s => s.kind === 'video').reduce((sum, s) => sum + statSync(`public/seed/video/${s.name}-poster.webp`).size, 0);
  assert.ok(total <= 120 * 1024, `posters total ${total} bytes`);
});

test('self-hosted Rubik fonts are subset to the Latin glyphs the site uses', async () => {
  const { statSync } = await import('node:fs');
  for (const weight of [400, 500, 600, 700, 800]) {
    const size = statSync(`public/fonts/rubik-${weight}.woff2`).size;
    assert.ok(size <= 30 * 1024, `rubik-${weight} is ${size} bytes`);
  }
});
