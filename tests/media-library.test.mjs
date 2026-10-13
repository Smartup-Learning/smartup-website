import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { startSite } from './helpers/site.mjs';
import { WIDTHS as PUBLIC_WIDTHS } from '../src/lib/media.mjs';
import { WIDTHS } from '../server/media-library.mjs';

const png = (width = 2000, height = 1000) => sharp({ create: { width, height, channels: 3, background: '#5f2ea8' } }).png().toBuffer();
const upload = (site, buffer, { type = 'image/png', alt = 'A purple test card' } = {}) =>
  site.call(`/api/admin/media?alt=${encodeURIComponent(alt)}`, { method: 'POST', body: buffer, headers: { 'Content-Type': type } });

test('the upload sizes match the sizes the pages ask for', () => {
  assert.deepEqual(WIDTHS, PUBLIC_WIDTHS);
});

test('an uploaded photo becomes three WebP sizes served from /media', async t => {
  const site = await startSite(t);
  await site.signIn();
  const r = await upload(site, await png());
  assert.equal(r.status, 201);
  assert.match(r.data.base, /^\/media\/u-[a-z0-9]+-[0-9a-f]{8}$/);
  assert.deepEqual([r.data.width, r.data.height], [2000, 1000]);
  const file = await fetch(`${site.base}${r.data.base}-480.webp`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/webp');
  assert.match(file.headers.get('cache-control'), /immutable/);
  assert.equal((await sharp(Buffer.from(await file.arrayBuffer())).metadata()).width, 480);
  assert.equal((await site.call('/api/admin/media')).data.items[0].alt, 'A purple test card');
});

test('uploads need a description, an allowed type and real image bytes; failures leave no files', async t => {
  const site = await startSite(t);
  await site.signIn();
  assert.equal((await upload(site, await png(), { alt: '' })).status, 400);
  assert.equal((await upload(site, await png(), { type: 'image/gif' })).status, 415);
  assert.equal((await upload(site, Buffer.from('not an image'))).status, 400);
  const jpeg = await sharp(await png(100, 100)).jpeg().toBuffer();
  assert.equal((await upload(site, jpeg, { type: 'image/png' })).status, 415);
  assert.deepEqual(await readdir(site.uploadsDir), []);
});

test('uploads over 10 MB are refused', async t => {
  const site = await startSite(t);
  await site.signIn();
  assert.equal((await upload(site, Buffer.alloc(10 * 1024 * 1024 + 1))).status, 413);
});

test('a photo in use cannot be deleted; once unused it is removed with its files', async t => {
  const site = await startSite(t);
  await site.signIn();
  const photo = (await upload(site, await png())).data;
  const leader = (await site.call('/api/admin/content/leaders')).data.items[0];
  assert.equal((await site.call(`/api/admin/content/leaders/${leader.id}`, { method: 'PUT', json: { ...leader, photo: photo.base, photo_alt: 'Founder portrait' } })).status, 200);
  const blocked = await site.call(`/api/admin/media/${photo.id}`, { method: 'DELETE', json: {} });
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.error, /Founders/);
  await site.call(`/api/admin/content/leaders/${leader.id}`, { method: 'PUT', json: leader });
  assert.equal((await site.call(`/api/admin/media/${photo.id}`, { method: 'DELETE', json: {} })).status, 200);
  assert.equal((await fetch(`${site.base}${photo.base}-480.webp`)).status, 404);
  assert.deepEqual(await readdir(site.uploadsDir), []);
});

test('/media never serves files outside the uploads folder', async t => {
  const site = await startSite(t);
  assert.equal((await fetch(`${site.base}/media/..%2f..%2fpackage.json`)).status, 404);
  assert.equal((await fetch(`${site.base}/media/missing-480.webp`)).status, 404);
});
