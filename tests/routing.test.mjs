import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSiteServer } from '../server.mjs';
import { AssessmentStore } from '../server/assessment.mjs';

const store = new AssessmentStore(':memory:');
const server = createSiteServer({ store });
let base;
before(async () => { await new Promise(r => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => new Promise(r => server.close(() => { store.close(); r(); })));

test('the homepage is rendered by Astro', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.match(await r.text(), /data-astro-page="home"/);
});

test('Quest and v1 shared files are still served from dist', async () => {
  for (const p of ['/assessment/', '/assessment', '/assets/owl.svg', '/privacy.html', '/robots.txt']) {
    assert.equal((await fetch(base + p)).status, 200, p);
  }
});

test('v1 homepage files are no longer public', async () => {
  for (const p of ['/index.html', '/app.js', '/styles.css']) assert.equal((await fetch(base + p)).status, 404, p);
});

test('unknown pages return 404 and non-GET methods 405', async () => {
  assert.equal((await fetch(base + '/no-such-page')).status, 404);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});

test('seed media, fonts and brand files are served with a day of caching', async () => {
  for (const p of ['/seed/img/leader-mohamed-rayees-480.webp', '/fonts/rubik-400.woff2', '/brand/owl.svg']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get('cache-control'), 'public, max-age=86400', p);
  }
});

test('Astro-built scripts are cached as immutable', async () => {
  const html = await (await fetch(base + '/')).text();
  const src = html.match(/src="(\/_astro\/[^"]+\.js)"/)?.[1];
  assert.ok(src, 'homepage loads an /_astro/ script');
  assert.equal((await fetch(base + src)).headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('pages and scripts are gzip-compressed for browsers that accept it', async () => {
  const page = await fetch(base + '/', { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(page.headers.get('content-encoding'), 'gzip');
  const src = (await page.text()).match(/src="(\/_astro\/[^"]+\.js)"/)?.[1];
  assert.equal((await fetch(base + src, { headers: { 'accept-encoding': 'gzip' } })).headers.get('content-encoding'), 'gzip');
});

test('video byte ranges are served uncompressed so seeking works', async () => {
  const r = await fetch(base + '/seed/video/video-story-7.mp4', { headers: { range: 'bytes=0-99', 'accept-encoding': 'gzip' } });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-encoding'), null);
  assert.equal((await r.arrayBuffer()).byteLength, 100);
});

test('page styles are inlined, so no stylesheet blocks the first paint', async () => {
  assert.doesNotMatch(await (await fetch(base + '/')).text(), /<link[^>]+rel="stylesheet"/);
});

test('a null byte in the URL is rejected as a bad request', async () => {
  assert.equal((await fetch(base + '/a%00b')).status, 400);
});
