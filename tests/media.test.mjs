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
  for (const weight of [400, 500, 600, 700]) {
    const size = statSync(`public/fonts/rubik-${weight}.woff2`).size;
    assert.ok(size <= 30 * 1024, `rubik-${weight} is ${size} bytes`);
  }
});

test('crop boxes are whole pixels inside the image', async () => {
  const { cropBox } = await import('../src/lib/media.mjs');
  assert.deepEqual(cropBox(1000, 2000, { x: 0.21, y: 0.335, w: 0.53, h: 0.285 }), { left: 210, top: 670, width: 530, height: 570 });
  assert.deepEqual(cropBox(329, 424, { x: 0, y: 0, w: 1, h: 0.86 }), { left: 0, top: 0, width: 329, height: 365 });
  assert.throws(() => validateSources([{ name: 'a', kind: 'image', from: 'drive', id: 'x', crop: { x: 0.5, y: 0, w: 0.7, h: 1 } }]), /crop/);
});

test('every seed image and video poster has its real size recorded', async () => {
  const sharp = (await import('sharp')).default;
  const sizes = JSON.parse(readFileSync('data-seed/media-sizes.json', 'utf8'));
  for (const s of sources) {
    const key = s.kind === 'image' ? `/seed/img/${s.name}` : `/seed/video/${s.name}-poster`;
    const file = s.kind === 'image' ? `public/seed/img/${s.name}-1600.webp` : `public/seed/video/${s.name}-poster.webp`;
    const size = sizes[key];
    assert.ok(Array.isArray(size) && size.every(n => Number.isInteger(n) && n > 0), `${key} has no size`);
    const meta = await sharp(file).metadata();
    assert.ok(Math.abs(size[0] / size[1] - meta.width / meta.height) < 0.01, `${key} size does not match the built file`);
  }
});

test('a source can be turned a quarter, half or three-quarter turn, and nothing else', () => {
  assert.doesNotThrow(() => validateSources([{ name: 'a', kind: 'image', from: 'drive', id: 'x', rotate: 270 }]));
  assert.throws(() => validateSources([{ name: 'a', kind: 'image', from: 'drive', id: 'x', rotate: 45 }]), /rotate/);
  assert.equal(sources.find(s => s.name === 'timeline-2025-tour').rotate, 270);
});

test('no unused font weight is shipped', async () => {
  const { existsSync: exists } = await import('node:fs');
  assert.equal(exists('public/fonts/rubik-800.woff2'), false);
  assert.doesNotMatch(readFileSync('src/styles/global.css', 'utf8'), /rubik-800/);
});

test('a source can be a YouTube video\'s portrait thumbnail, named by its video ID', () => {
  assert.doesNotThrow(() => validateSources([{ name: 'yt-cover-a', kind: 'image', from: 'youtube', id: 'Aypb_y7umfo' }]));
  assert.throws(() => validateSources([{ name: 'yt-cover-a', kind: 'image', from: 'youtube', id: 'not an id' }]), /YouTube/);
});

test('every Short on the site has a sharp portrait cover built from YouTube', () => {
  const covers = new Set(sources.filter(s => s.from === 'youtube').map(s => s.id));
  for (const v of content.videos.filter(v => v.format === 'portrait')) assert.ok(covers.has(v.youtubeId), `${v.title} has no cover`);
});
