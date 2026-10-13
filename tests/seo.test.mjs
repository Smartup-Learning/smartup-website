import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';

test('pages carry a canonical link and a social preview image', async t => {
  const site = await startSite(t);
  const page = await site.page('/story');
  assert.ok(page.includes(`<link rel="canonical" href="${site.base}/story"`));
  assert.ok(page.includes(`<meta property="og:image" content="${site.base}/brand/og.jpg"`));
  assert.equal((await fetch(`${site.base}/brand/og.jpg`)).headers.get('content-type'), 'image/jpeg');
});

test('SITE_URL sets the public address used in links', async t => {
  process.env.SITE_URL = 'https://preview.smartup.example';
  t.after(() => { delete process.env.SITE_URL; });
  const site = await startSite(t);
  assert.ok((await site.page('/')).includes('<link rel="canonical" href="https://preview.smartup.example/"'));
  assert.match(await site.page('/sitemap.xml'), /<loc>https:\/\/preview\.smartup\.example\/blog\/board-exam-90-day-plan<\/loc>/);
});

test('the sitemap lists every page and post, and no admin pages', async t => {
  const site = await startSite(t);
  const r = await fetch(`${site.base}/sitemap.xml`);
  assert.match(r.headers.get('content-type'), /^application\/xml/);
  const xml = await r.text();
  for (const path of ['/', '/story', '/results', '/privacy', '/blog/board-exam-90-day-plan']) assert.ok(xml.includes(`<loc>${site.base}${path}</loc>`), path);
  assert.doesNotMatch(xml, /\/admin/);
});

test('robots.txt points to the sitemap, and NOINDEX hides a preview from search engines', async t => {
  const site = await startSite(t);
  const robots = await (await fetch(`${site.base}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/admin/);
  assert.ok(robots.includes(`Sitemap: ${site.base}/sitemap.xml`));
  assert.doesNotMatch(await site.page('/'), /name="robots"/);
  process.env.NOINDEX = '1';
  t.after(() => { delete process.env.NOINDEX; });
  assert.equal(await (await fetch(`${site.base}/robots.txt`)).text(), 'User-agent: *\nDisallow: /\n');
  assert.match(await site.page('/'), /<meta name="robots" content="noindex, nofollow">/);
});

test('the homepage describes Smartup and its centres for search engines', async t => {
  const site = await startSite(t);
  const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(await site.page('/'))[1];
  const data = JSON.parse(json);
  assert.equal(data['@type'], 'EducationalOrganization');
  assert.equal(data.department.length, 9);
  assert.equal(data.telephone, '+918891910919');
});

test('structured data cannot close its script tag', async t => {
  const site = await startSite(t, { prepare: content => content.db.prepare("UPDATE settings SET value = ? WHERE key = 'legalName'").run(JSON.stringify('</script><script>alert(1)</script>')) });
  const page = await site.page('/');
  assert.doesNotMatch(page, /<\/script><script>alert/);
  assert.match(page, /\\u003c\/script>/);
});
