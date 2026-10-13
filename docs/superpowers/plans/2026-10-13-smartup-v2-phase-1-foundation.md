# Smartup v2 — Phase 1: Foundation, Home and Our Story — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 homepage with a mobile-first, Astro-built v2 homepage and an animated Our Story timeline page, rendered from a seeded SQLite content store by the existing Node server, with Smartup Quest untouched.

**Architecture:** Astro 7 renders pages on the server (`@astrojs/node`, middleware mode) into `build/`. `server.mjs` keeps `/api/*`, serves v1's `/assessment/`, `/assets/`, `/privacy.html` and `/robots.txt` from `dist/`, serves `build/client/` statically, and hands every other request to Astro with `locals.store` — a `ContentStore` sharing Quest's SQLite connection. Content is seeded once from `data-seed/content.json`; photos and videos are processed once by scripts into `public/seed/` and committed. Motion (vanilla) adds reveals, counters, the owl and the scroll-drawn timeline, with no-JS and reduced-motion fallbacks.

**Tech Stack:** Node 24.3 (nvm), Astro 7.3.8, @astrojs/node 11.1.7, motion 14.1.0, `node:sqlite`, sharp 0.35.5 (dev), system ffmpeg + macOS `sips` (media build only), @playwright/test 1.64.0 (dev), `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-08-smartup-v2-website-design.md`

## Roadmap

| Phase | Plan | Delivers |
|---|---|---|
| **1** | **this file** | Astro + server integration, content store, media pipeline, design system, header/footer/mobile bar, owl + motion, Home, Our Story |
| 2 | written after Phase 1 ships | Founders, Faculty, Life @ Smartup, Courses, Videos, Results, Testimonials, Alumni, App, Contact, Community, Careers, Blog, Ask Smartup pages |
| 3 | after Phase 2 | Forms (demo, careers, ask) and the admin panel (content editing, inboxes, uploads) |
| 4 | after Phase 3 | SEO, performance and accessibility pass, Docker/Railway release, removal of v1 homepage files |

v1 stays live on Railway until Phase 4. During Phases 1–2, menu links to unbuilt pages show the branded 404 page.

## Decisions made while planning (differences from the spec)

- **Quest stays in `dist/`.** The spec moved Quest to `public/assessment/`. `dist/client` and `dist/server` already belong to the Sites bundle, so Astro builds to `build/` instead and Quest files are not touched. Quest tests stay unchanged.
- **Courses content is static** (`src/data/courses.ts`), because the spec's admin sections do not include courses.
- **Testimonial videos are self-hosted** (transcoded to ~480×854 H.264, `preload="none"`), from the client's Drive originals already in `tmp/research-content/`.
- **Feedback vs alumni videos:** the three clearly student/parent clips go to Feedback; the remaining three go to Alumni (user, 13 Oct: "just use the videos"). Titles are neutral and editable later in admin.

## Global Constraints

- Run every command from the repo root `Smartup classses/` after `source ~/.nvm/nvm.sh && nvm use 24` (prints `v24.3.0`).
- Brand colours exactly: purple `#5f2ea8`, `#56269b`, dark purple `#392064`, light purple `#9560d7`, cream `#f4eee4`, ink `#1e1e1e`, white `#ffffff`. Yellow `#ede60f` is an accent only — marker highlights on a few words, small badges, at most one yellow call-to-action per screen. The owl keeps its supplied fill `#672aae`.
- Rubik only, self-hosted WOFF2 400–800. No third-party font or script requests.
- Logo and owl used unchanged; never invert their colours. The logo only sits on white/cream.
- Mobile-first: base width 360px, breakpoints 600 / 900 / 1200px. No horizontal page scroll at any width. Tap targets ≥ 44px. Body text ≥ 16px.
- English only. The brand is written "Smartup".
- All content is visible without JavaScript. `prefers-reduced-motion: reduce` disables movement. Animate only `transform` and `opacity`.
- Marketing-page JavaScript ≤ 50 KB gzipped.
- Every result figure names its exam and year. No extrapolation.
- WhatsApp buttons stay hidden while `settings.whatsapp` is `null`; show a phone call link instead.
- Videos never auto-load: `preload="none"` with a poster.
- Commits go to branch `v2-website`, never `main`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A content table is empty or fully unpublished** (e.g. staff unpublish every job) → that homepage section is omitted entirely, with no orphan heading. Pinned in Task 8 (`tests/pages.test.mjs`).
2. **JavaScript disabled or reduced motion on** → every heading, stat (final value) and timeline chapter is visible at full opacity. Pinned in Tasks 5 and 6.
3. **360px-wide phone with the longest strings** (founder names, centre names, job titles) → no horizontal overflow on any page. Pinned in Task 4 (`layout.spec.ts`, extended as pages are added).
4. **Phone numbers stored with spaces or dashes** ("6282-179991") → every `tel:` link is `tel:+91` + 10 digits. Pinned in Task 2 (`normalizePhone`) and Task 4 (footer/mobile bar).
5. **Slow mobile data** → no video bytes before a tap (`preload="none"`), images below the hero lazy-loaded. Pinned in Task 8 (`home.spec.ts`).

---

### Task 1: Branch, Astro and server routing

**Files:**
- Modify: `package.json`, `.gitignore`, `server.mjs`
- Create: `astro.config.mjs`, `src/env.d.ts`, `src/pages/index.astro` (temporary), `tests/routing.test.mjs`

**Interfaces:**
- Consumes: v1 `createAssessmentHandler(options)` and `AssessmentStore` from `server/assessment.mjs` (unchanged).
- Produces: `createSiteServer(options)` from `server.mjs`. Options: `store` (AssessmentStore). Task 2 adds `content`. Routing order: `/api/*` → legacy static (`dist/`) → `build/client/` static → Astro handler.

- [ ] **Step 1: Create the branch and install packages**

```bash
cd "/Users/USER/claude_tj/Smartup Website/Smartup classses"
source ~/.nvm/nvm.sh && nvm use 24
git checkout -b v2-website
npm install --save-exact astro@7.3.8 @astrojs/node@11.1.7 motion@14.1.0
npm install --save-exact --save-dev sharp@0.35.5 @playwright/test@1.64.0
npx playwright install chromium
```

Expected: `package.json` lists `astro`, `@astrojs/node`, `motion` under `dependencies` and `sharp`, `@playwright/test` under `devDependencies`.

- [ ] **Step 2: Install the two design helpers the user asked for**

```bash
npx --yes motion-ai
npx --yes uipro-cli init --ai claude
```

Both add AI design/animation guidance for Claude (files under `.claude/`). If either prompts, accept the defaults. If either fails, note it and continue — they are guidance only; the brand rules in this plan win on any conflict.

- [ ] **Step 3: Write the failing routing test**

Create `tests/routing.test.mjs`:

```js
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
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `node --test tests/routing.test.mjs`
Expected: FAIL — the homepage response does not contain `data-astro-page="home"`, and `/index.html` returns 200.

- [ ] **Step 5: Add the Astro config, env types and a temporary homepage**

Create `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Builds to build/ because dist/client and dist/server belong to the Sites bundle.
export default defineConfig({
  output: 'server',
  outDir: './build',
  adapter: node({ mode: 'middleware' }),
  devToolbar: { enabled: false },
});
```

Create `src/env.d.ts`:

```ts
/// <reference types="astro/client" />
```

Create `src/pages/index.astro` (replaced in Task 4):

```astro
---
---
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Smartup</title></head>
  <body data-astro-page="home"><h1>Smartup</h1></body>
</html>
```

- [ ] **Step 6: Replace `server.mjs`**

```js
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AssessmentStore, createAssessmentHandler } from './server/assessment.mjs';

const legacyRoot = path.resolve('dist');
const webRoot = path.resolve('build/client');
const astroEntry = path.resolve('build/server/entry.mjs');
const legacyPrefixes = ['/assessment/', '/assets/'];
const legacyFiles = new Set(['/assessment', '/privacy.html', '/robots.txt']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8'};

let astroHandler;
async function loadAstro() {
  if (astroHandler !== undefined) return astroHandler;
  try { await stat(astroEntry); } catch { astroHandler = null; return null; }
  ({ handler: astroHandler } = await import(pathToFileURL(astroEntry).href));
  return astroHandler;
}

async function findFile(root, pathname) {
  const file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return { file, info };
    if (!info.isDirectory()) return null;
    const index = path.join(file, 'index.html');
    const indexInfo = await stat(index);
    return indexInfo.isFile() ? { file: index, info: indexInfo } : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function cacheFor(pathname) {
  if (pathname.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  if (/^\/(assets|seed|fonts|brand)\//.test(pathname)) return 'public, max-age=86400';
  return 'no-cache';
}

function sendFile(req, res, { file, info }, cacheControl, send) {
  const headers = {'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':cacheControl,'Accept-Ranges':'bytes','Content-Length':info.size};
  let start=0,end=info.size-1,status=200;
  // A single byte range is enough for browser video playback and seeking.
  if(req.headers.range&&req.method==='GET'){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   const invalid=()=>send(416,'Range not satisfiable',{'Content-Range':`bytes */${info.size}`,'Accept-Ranges':'bytes'});
   if(!match||(!match[1]&&!match[2])||info.size===0)return invalid();
   if(!match[1]){const length=Number(match[2]);if(!Number.isSafeInteger(length)||length<=0)return invalid();start=Math.max(0,info.size-length);}
   else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=info.size||end<start)return invalid();
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;headers['Content-Length']=end-start+1;
  }
  res.writeHead(status,headers);
  if(req.method==='HEAD'||info.size===0)return res.end();
  const stream=createReadStream(file,{start,end});
  stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}

export function createSiteServer(options = {}) {
  const store = options.store ?? new AssessmentStore();
  const api = createAssessmentHandler({ ...options, store });
  return http.createServer(async (req, res) => {
    const send = (status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }); res.end(req.method === 'HEAD' ? undefined : body); };
    if (req.url.startsWith('/api/')) return api(req, res, new URL(req.url, 'http://localhost'));
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health') return send(200, 'ok');
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return send(400, 'Invalid URL'); }
      if (pathname.split('/').some(part => part.startsWith('.')) || /^\/(server|client)(\/|$)/.test(pathname)) return send(404, 'Page not found');
      const legacy = legacyFiles.has(pathname) || legacyPrefixes.some(prefix => pathname.startsWith(prefix));
      const found = await findFile(legacy ? legacyRoot : webRoot, pathname);
      if (found) return sendFile(req, res, found, cacheFor(pathname), send);
      if (legacy) return send(404, 'Page not found');
      const astro = await loadAstro();
      if (!astro) return send(503, 'The website has not been built. Run npm run build.');
      // No `next` callback: Astro renders src/pages/404.astro for unknown routes.
      return astro(req, res, undefined, {});
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return send(404, 'Page not found');
      send(500, 'Unable to serve this page');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const port = Number(process.env.PORT) || 3000;
  createSiteServer().listen(port, '0.0.0.0', () => console.log(`Smartup ready at http://localhost:${port}`));
}
```

- [ ] **Step 7: Update scripts and ignores**

In `package.json`, set `scripts` to (keep `build:assets`, `check` and `setup` exactly as they are):

```json
"start": "node server.mjs",
"dev": "astro dev",
"test": "node --test tests/*.test.mjs",
"pretest": "astro build && node scripts/build-sites.mjs",
"test:e2e": "astro build && playwright test",
"build": "npm run build:assets && astro build && node scripts/build-sites.mjs",
```

Append to `.gitignore`:

```
build/
.astro/
content-source/
test-results/
playwright-report/
```

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS — the new routing tests and every existing v1 test (`server.test.mjs`, `assessment.test.mjs`, `sites.test.mjs`).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore server.mjs astro.config.mjs src tests/routing.test.mjs docs/superpowers
[ -d .claude ] && git add .claude
git commit -m "Serve Astro-built pages alongside Quest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Content store and seed data

**Files:**
- Create: `server/content-store.mjs`, `data-seed/content.json`, `src/lib/store.ts`, `scripts/reset-content.mjs`, `tests/content-store.test.mjs`
- Modify: `server.mjs`, `src/env.d.ts`, `package.json` (`check` script)

**Interfaces:**
- Consumes: the `DatabaseSync` connection `AssessmentStore#db`.
- Produces (all from `server/content-store.mjs`):
  - `class ContentStore(db)`; `applySeed(data = loadSeed())` — applies each seed section once, recorded in `seed_log`.
  - `settings(): object` — decoded JSON values: `heroHeadline`, `heroHighlight`, `heroDescription`, `aboutTitle`, `aboutText`, `phone` (E.164), `email`, `whatsapp` (`null` or E.164), `hours`, `social: {network,label,url}[]`, `appLinks: {ios,android}`, `vision: {title,tagline,text: string[],priorities: {title,text}[],vision2030}`.
  - `stats(): {value,label,source}[]`
  - `timeline({ featured = false } = {}): {id,yearLabel,title,story,statValue,statLabel,media: {src,alt}[],sourceUrl,featured: boolean}[]`
  - `growth(): {year,students,studentsLabel,centres}[]`
  - `leaders(): {name,role,summary,bio,photo,photoAlt}[]`
  - `results({ featured = false } = {}): {year,board,exam,headline,detail,poster,posterAlt}[]`
  - `testimonials(section: 'feedback' | 'alumni'): {kind,section,title,person,quote,video,poster}[]`
  - `jobs(): {title,type,location}[]`; `centres(): {name,phone,mapUrl,hours}[]`
  - `loadSeed(file?)`, `openContentStore(file?)`, `normalizePhone(raw): string` (`+91` + 10 digits), `formatPhone(e164): string` (`+91 79071 26725`).
  - Media `src`/`photo`/`poster` values are base paths such as `/seed/img/leader-mohamed-rayees` (Task 3 creates `-480/-960/-1600.webp`). Video paths are full file paths.
- `src/lib/store.ts`: `getStore(locals): ContentStore`.
- `createSiteServer(options)` gains `options.content` and passes `{ store: content }` to Astro as `locals`.

- [ ] **Step 1: Write the failing tests**

Create `tests/content-store.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ContentStore, normalizePhone, formatPhone } from '../server/content-store.mjs';

const seeded = () => { const s = new ContentStore(new DatabaseSync(':memory:')); s.applySeed(); return s; };

test('seeding fills every section and is applied only once', () => {
  const store = seeded();
  store.applySeed();
  assert.equal(store.stats().length, 4);
  assert.equal(store.leaders().length, 4);
  assert.equal(store.centres().length, 9);
  assert.equal(store.timeline().length, 14);
  assert.equal(store.jobs().length, 12);
});

test('content deleted by staff is not re-seeded on restart', () => {
  const store = seeded();
  store.db.exec('DELETE FROM jobs');
  store.applySeed();
  assert.deepEqual(store.jobs(), []);
});

test('unpublished rows are hidden', () => {
  const store = seeded();
  store.db.exec('UPDATE testimonials SET published=0');
  assert.deepEqual(store.testimonials('feedback'), []);
  assert.deepEqual(store.testimonials('alumni'), []);
});

test('timeline runs 2014 to Next, with four featured chapters', () => {
  const store = seeded();
  const years = store.timeline().map(c => c.yearLabel);
  assert.equal(years[0], '2014');
  assert.equal(years.at(-1), 'Next');
  assert.deepEqual(store.timeline({ featured: true }).map(c => c.yearLabel), ['2014', '2018', '2021', '2026']);
  for (const c of store.timeline()) for (const m of c.media) { assert.match(m.src, /^\/seed\/img\/timeline-/); assert.ok(m.alt.length > 10); }
});

test('founders appear in the client order with matched photos', () => {
  const leaders = seeded().leaders();
  assert.deepEqual(leaders.map(l => l.name), ['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']);
  assert.deepEqual(leaders.map(l => l.photo), ['/seed/img/leader-mohamed-rayees', '/seed/img/leader-dhanesh-narayanan-achari', '/seed/img/leader-mohamed-shihas', '/seed/img/leader-shanu']);
});

test('every result names its exam and year', () => {
  for (const r of seeded().results()) { assert.ok(r.exam.length > 0); assert.match(r.year, /^\d{4}/); }
});

test('settings decode JSON and WhatsApp starts unset', () => {
  const s = seeded().settings();
  assert.equal(s.whatsapp, null);
  assert.equal(s.phone, '+918891910919');
  assert.equal(s.social.length, 6);
  assert.equal(s.vision.priorities.length, 5);
});

test('growth points ascend by year', () => {
  const years = seeded().growth().map(g => g.year);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
});

test('phone numbers are stored tel-safe and display grouped', () => {
  assert.equal(normalizePhone('79071 26725'), '+917907126725');
  assert.equal(normalizePhone('6282-179991'), '+916282179991');
  assert.equal(normalizePhone('+91 88919 10919'), '+918891910919');
  assert.throws(() => normalizePhone('12345'), /Indian mobile/);
  assert.equal(formatPhone('+917907126725'), '+91 79071 26725');
  for (const c of seeded().centres()) assert.match(c.phone, /^\+91[6-9]\d{9}$/);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `node --test tests/content-store.test.mjs`
Expected: FAIL — `Cannot find module '../server/content-store.mjs'`.

- [ ] **Step 3: Create `server/content-store.mjs`**

```js
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

const flag = value => (value ? 1 : 0);
const SECTIONS = {
  settings(db, data) {
    const put = db.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)');
    for (const [key, value] of Object.entries(data)) put.run(key, JSON.stringify(value));
  },
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
    const done = new Set(this.db.prepare('SELECT section FROM seed_log').all().map(r => r.section));
    for (const [section, apply] of Object.entries(SECTIONS)) {
      if (done.has(section) || data[section] === undefined) continue;
      this.db.exec('BEGIN IMMEDIATE');
      try {
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
    return Object.fromEntries(this.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
  }

  stats() {
    return this.db.prepare('SELECT value, label, source FROM stats WHERE published = 1 ORDER BY sort, id').all();
  }

  timeline({ featured = false } = {}) {
    const where = featured ? 'published = 1 AND featured = 1' : 'published = 1';
    return this.db.prepare(`SELECT id, year_label AS yearLabel, title, story, stat_value AS statValue, stat_label AS statLabel, media, source_url AS sourceUrl, featured FROM timeline_entries WHERE ${where} ORDER BY sort, id`).all()
      .map(r => ({ ...r, media: JSON.parse(r.media), featured: r.featured === 1 }));
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
```

- [ ] **Step 4: Create `data-seed/content.json`**

```json
{
  "settings": {
    "heroHeadline": "Make parents",
    "heroHighlight": "proud",
    "heroDescription": "Tuitions • CBSE & State Board • 8 to +2",
    "aboutTitle": "Twelve years of helping students rise",
    "aboutText": "Smartup began in 2014 with 63 students in one centre in Kochi. Today more than 30,000 students have learned with us, online and at 9 centres across Kochi.",
    "phone": "+918891910919",
    "email": "info@smartupedu.in",
    "whatsapp": null,
    "hours": "5–9 pm",
    "social": [
      { "network": "facebook", "label": "Smartup Educations on Facebook", "url": "https://www.facebook.com/smartupeducations/" },
      { "network": "facebook", "label": "Smartup CBSE on Facebook", "url": "https://www.facebook.com/profile.php?id=61594263833669" },
      { "network": "instagram", "label": "Smartup Educations on Instagram", "url": "https://www.instagram.com/smartupeducations/" },
      { "network": "instagram", "label": "Smartup CBSE on Instagram", "url": "https://www.instagram.com/smartup_cbse/" },
      { "network": "youtube", "label": "Smartup Educations on YouTube", "url": "https://www.youtube.com/@smartupeducations" },
      { "network": "youtube", "label": "Smartup CBSE on YouTube", "url": "https://www.youtube.com/@smartup-cbse" }
    ],
    "appLinks": {
      "ios": "https://apps.apple.com/in/app/smartup-learning/id6789860033",
      "android": "https://play.google.com/store/apps/details?id=com.paperlms.smartup"
    },
    "vision": {
      "title": "Shaping the future of learning",
      "tagline": "Empowering every student. Everywhere.",
      "text": [
        "Smartup believes every child has a brighter future within them. With the right guidance, encouragement and learning support, that potential can become exceptional.",
        "We do more than impart knowledge: we discover each student’s strengths, nurture their capabilities and help them grow with confidence. Our goal is to become a trusted, globally recognised K–12 education brand, connecting students across India and the GCC with accessible, high-quality learning, personalised guidance and technology that supports every learner."
      ],
      "priorities": [
        { "title": "A global education network", "text": "Expand across the GCC while strengthening our presence in Kerala, as a trusted brand for students and families." },
        { "title": "Personalised, technology-enabled learning", "text": "Digital tools and AI that tailor lessons to each student, find knowledge gaps and show clear progress." },
        { "title": "Academic excellence", "text": "High-quality Kerala State and CBSE learning through excellent teachers, structured systems and consistent support." },
        { "title": "Online and offline, at scale", "text": "Online learning connected to a growing network of centres, serving more students without losing quality." },
        { "title": "Accessible education for every student", "text": "Quality learning for students from every background, so each learner can build confidence and reach their potential." }
      ],
      "vision2030": "Vision 2030: keep mentoring students beyond Class 12, through higher education and into careers — and bring 500+ professionals mentored by Smartup together on one stage in 2030."
    }
  },
  "stats": [
    { "value": "12+", "label": "Years of teaching", "source": "Since 2014" },
    { "value": "9", "label": "Centres in Kochi", "source": "October 2026" },
    { "value": "30,000+", "label": "Students reached", "source": "Since 2014" },
    { "value": "107", "label": "Full A+ in SSLC", "source": "SSLC 2026" }
  ],
  "timeline": [
    { "yearLabel": "2014", "title": "Smartup is founded", "story": "Smartup opens its first branch in Kochi with 63 students.", "statValue": "63", "statLabel": "students", "featured": true,
      "media": [
        { "src": "/seed/img/timeline-2014-branch", "alt": "Students studying in Smartup's first branch, 2014" },
        { "src": "/seed/img/timeline-2014-independence", "alt": "Smartup students at an Independence Day parade, 2014" } ] },
    { "yearLabel": "2015", "title": "Growing the first classroom", "story": "Teachers' Day is celebrated as the student community grows past 130.", "statValue": "130+", "statLabel": "students",
      "media": [ { "src": "/seed/img/timeline-2015-teachers-day", "alt": "Students lighting candles on Teachers' Day, 2015" } ] },
    { "yearLabel": "2016", "title": "Honoured for contribution to education", "story": "Smartup receives an award for its educational and social work in Kochi, presented by Kerala Assembly Speaker P. Sreeramakrishnan.", "statValue": "2", "statLabel": "centres",
      "media": [ { "src": "/seed/img/timeline-2016-award", "alt": "Poster announcing Smartup's award from the Kerala Assembly Speaker, 2016" } ] },
    { "yearLabel": "2017", "title": "A new branch at Chullickal", "story": "A third centre opens as Smartup reaches 550+ students.", "statValue": "3", "statLabel": "centres",
      "media": [
        { "src": "/seed/img/timeline-2017-chullickal", "alt": "Opening of the new Smartup branch at Chullickal, 2017" },
        { "src": "/seed/img/timeline-2017-christmas", "alt": "Christmas celebration at Smartup, 2017" } ] },
    { "yearLabel": "2018", "title": "The first Coffee With Chairman", "story": "Coffee With Chairman (CWC) begins: a mentoring session where students meet the chairman. Smartup grows to 7 centres.", "statValue": "1,600+", "statLabel": "students", "featured": true,
      "media": [ { "src": "/seed/img/timeline-2018-cwc-1", "alt": "A speaker on stage at the first Coffee With Chairman session, 2018" } ] },
    { "yearLabel": "2019", "title": "Shoot the Drugs, and a festival online", "story": "The first season of Shoot the Drugs brings sport and anti-drug awareness together, and an online arts festival keeps students creating.", "statValue": "15,000", "statLabel": "students",
      "media": [
        { "src": "/seed/img/timeline-2019-shoot-the-drugs", "alt": "Students celebrating at Shoot the Drugs season 1, 2019" },
        { "src": "/seed/img/timeline-2019-kalolsavam", "alt": "Newspaper report on Smartup's online arts festival, 2019" },
        { "src": "/seed/img/timeline-2019-results", "alt": "Smartup board results poster, 2019" },
        { "src": "/seed/img/timeline-2019-onam", "alt": "Onam flower carpet made by Smartup students, 2019" },
        { "src": "/seed/img/timeline-2019-tour", "alt": "Smartup students on a study tour, 2019" } ] },
    { "yearLabel": "2020", "title": "Results that speak", "story": "Board results stay strong, including Abhishek N's 97.1% in Plus One.", "statValue": "25,000+", "statLabel": "students",
      "media": [ { "src": "/seed/img/timeline-2020-results", "alt": "Result poster for Abhishek N, 97.1% in Plus One, 2020" } ] },
    { "yearLabel": "2021", "title": "Interactive panel classes arrive", "story": "Smartup launches the first interactive panel classes in West Kochi, inaugurated by K. J. Maxy MLA on 14 June 2021.", "featured": true,
      "media": [ { "src": "/seed/img/timeline-2021-interactive-panel", "alt": "Poster for the launch of interactive panel classes, June 2021" } ] },
    { "yearLabel": "2022", "title": "Shoot the Drugs makes the news", "story": "Kerala Kaumudi covers the Shoot the Drugs sports tournament.", "sourceUrl": "https://keralakaumudi.com/news/news.php?id=919001&u=local-news-ernakulam",
      "media": [ { "src": "/seed/img/timeline-2022-kaumudi", "alt": "Kerala Kaumudi report on the Shoot the Drugs tournament, 2022" } ] },
    { "yearLabel": "2023", "title": "Celebrating together", "story": "Smartup students march together on Independence Day.",
      "media": [ { "src": "/seed/img/timeline-2023-independence", "alt": "Smartup students in an Independence Day rally, 2023" } ] },
    { "yearLabel": "2024", "title": "Shoot the Drugs, season 6", "story": "Shoot the Drugs returns for its sixth season, from 21 to 31 December.",
      "media": [ { "src": "/seed/img/timeline-2024-shoot-the-drugs-6", "alt": "Poster for Shoot the Drugs season 6" } ] },
    { "yearLabel": "2025", "title": "Champions and journeys", "story": "Another Shoot the Drugs season crowns its champions, and students travel together on a study tour.",
      "media": [
        { "src": "/seed/img/timeline-2025-shoot-the-drugs", "alt": "Shoot the Drugs champions on the field, 2025" },
        { "src": "/seed/img/timeline-2025-tour", "alt": "Smartup students on a study tour, 2025" } ] },
    { "yearLabel": "2026", "title": "107 Full A+ and a new chapter", "story": "107 students score Full A+ in SSLC 2026. Talent Eve celebrates achievers, Coffee With Chairman reaches its 18th edition, and Smartup opens a new office with a new brand.", "statValue": "9", "statLabel": "centres", "featured": true,
      "media": [
        { "src": "/seed/img/timeline-2026-talent-eve", "alt": "Graduates celebrating on stage at Talent Eve, 2026" },
        { "src": "/seed/img/timeline-2026-cwc-18", "alt": "Coffee With Chairman, 18th edition, 2026" },
        { "src": "/seed/img/timeline-2026-new-office", "alt": "Opening of Smartup's new office, 2026" },
        { "src": "/seed/img/timeline-2026-camp", "alt": "Students at a Smartup camp, 2026" } ] },
    { "yearLabel": "Next", "title": "Vision 2030", "story": "Mentoring students beyond Class 12, through higher education and into careers — and bringing 500+ Smartup-mentored professionals together on one stage in 2030.", "media": [] }
  ],
  "growth": [
    { "year": 2014, "students": 63, "studentsLabel": "63", "centres": 1 },
    { "year": 2015, "students": 130, "studentsLabel": "130+", "centres": 1 },
    { "year": 2016, "students": 330, "studentsLabel": "330+", "centres": 2 },
    { "year": 2017, "students": 550, "studentsLabel": "550+", "centres": 3 },
    { "year": 2018, "students": 1600, "studentsLabel": "1,600+", "centres": 7 },
    { "year": 2019, "students": 15000, "studentsLabel": "15,000", "centres": 7 },
    { "year": 2020, "students": 25000, "studentsLabel": "25,000+", "centres": 8 },
    { "year": 2026, "students": 30000, "studentsLabel": "30,000+", "centres": 9 }
  ],
  "leaders": [
    { "name": "Mohamed Rayees", "role": "Chairman and CEO", "photo": "/seed/img/leader-mohamed-rayees", "photoAlt": "Mohamed Rayees speaking at Talent Eve",
      "summary": "Leads Smartup's mentoring initiatives, including Coffee With Chairman, Talent Eve and Shoot the Drugs.",
      "bio": "Mohamed Rayees is the Chairman and CEO of Smartup, with over a decade of experience in education and student development. He leads initiatives that combine quality education, meaningful mentorship and opportunities for students to build confidence, discipline and life skills — including Coffee With Chairman (CWC), Talent Eve and Shoot the Drugs. His Vision 2030 commits Smartup to mentoring students beyond Class 12, through higher education and into careers." },
    { "name": "Dhanesh Narayanan Achari", "role": "Co-Founder and Vice Chairman", "photo": "/seed/img/leader-dhanesh-narayanan-achari", "photoAlt": "Dhanesh Narayanan Achari speaking at Talent Eve",
      "summary": "M.Sc. Mathematics and B.Ed., committed to advancing quality education.",
      "bio": "Dhanesh Narayanan Achari is the Co-Founder and Vice Chairman of Smartup. He holds an M.Sc. in Mathematics and a B.Ed., and is committed to advancing quality education." },
    { "name": "Mohamed Shihas K. Y.", "role": "Founder and Director", "photo": "/seed/img/leader-mohamed-shihas", "photoAlt": "Mohamed Shihas K. Y. at Talent Eve",
      "summary": "Leads strategic growth, business development and digital expansion.",
      "bio": "Mohamed Shihas K. Y. is the Founder and Director of Smartup, with over a decade of experience in the education industry. He leads strategic growth, business development and digital expansion, driving Smartup's vision to become a leading K–12 education provider across India and the GCC." },
    { "name": "Shanu K. Y.", "role": "Co-Founder and Director", "photo": "/seed/img/leader-shanu", "photoAlt": "Shanu K. Y. speaking at Talent Eve",
      "summary": "Focused on strategic development and operational excellence.",
      "bio": "Shanu K. Y. is the Co-Founder and Director of Smartup. With a Bachelor of Commerce, he is dedicated to strategic development, operational excellence and innovative approaches to quality education." }
  ],
  "results": [
    { "year": "2026", "board": "State", "exam": "SSLC", "headline": "107 students with Full A+", "detail": "100% pass in SSLC 2026", "poster": "/seed/img/results-sslc-2026", "posterAlt": "Smartup SSLC 2026 results poster", "featured": true },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Aysha Palakki — 96%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/results-aysha-palakki", "posterAlt": "Result poster for Aysha Palakki, 96% in CBSE Class 10", "featured": true },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Archana K.A — 1159/1200", "detail": "Full A+, Plus Two 2026", "poster": "/seed/img/results-archana", "posterAlt": "Result poster for Archana K.A, 1159 out of 1200 in Plus Two", "featured": true },
    { "year": "2020", "board": "State", "exam": "Plus One", "headline": "Abhishek N — 97.1%", "detail": "Plus One, 2020", "poster": "/seed/img/timeline-2020-results", "posterAlt": "Result poster for Abhishek N, 97.1% in Plus One", "featured": true }
  ],
  "testimonials": [
    { "kind": "video", "section": "feedback", "title": "Students, in their own words", "video": "/seed/video/video-student-testimonial.mp4", "poster": "/seed/video/video-student-testimonial-poster.webp" },
    { "kind": "video", "section": "feedback", "title": "A student and parent share their experience", "video": "/seed/video/video-student-and-parent.mp4", "poster": "/seed/video/video-student-and-parent-poster.webp" },
    { "kind": "video", "section": "feedback", "title": "Two students on learning at Smartup", "video": "/seed/video/video-two-students.mp4", "poster": "/seed/video/video-two-students-poster.webp" },
    { "kind": "video", "section": "alumni", "title": "A Smartup journey", "video": "/seed/video/video-story-7.mp4", "poster": "/seed/video/video-story-7-poster.webp" },
    { "kind": "video", "section": "alumni", "title": "Smartup stories", "video": "/seed/video/video-story-mix.mp4", "poster": "/seed/video/video-story-mix-poster.webp" },
    { "kind": "video", "section": "alumni", "title": "More Smartup stories", "video": "/seed/video/video-story-mix-3.mp4", "poster": "/seed/video/video-story-mix-3-poster.webp" }
  ],
  "jobs": [
    { "title": "Physics teacher", "type": "Full time" },
    { "title": "Chemistry teacher", "type": "Part time", "location": "Eraveli" },
    { "title": "Biology teacher", "type": "Part time", "location": "Eraveli" },
    { "title": "Hindi teacher", "type": "Part time", "location": "Moolamkuzhi" },
    { "title": "Malayalam teacher", "type": "Part time", "location": "Moolamkuzhi" },
    { "title": "Assistant Maths teacher", "type": "Part time", "location": "Edappally and Vennala" },
    { "title": "Maths teaching assistant", "type": "Teaching assistant" },
    { "title": "Physics teaching assistant", "type": "Teaching assistant" },
    { "title": "Chemistry teaching assistant", "type": "Teaching assistant" },
    { "title": "Academic counsellor (offline)", "type": "Other" },
    { "title": "Junior staff", "type": "Other" },
    { "title": "Mentor", "type": "Other" }
  ],
  "centres": [
    { "name": "Chullickal", "phone": "79071 26725", "mapUrl": "https://maps.app.goo.gl/fPcDGwooDWMdMyQj8", "hours": "5–9 pm" },
    { "name": "Kadavanthra", "phone": "92070 76473", "mapUrl": "https://maps.app.goo.gl/dHgturY8vL8KXyhM9", "hours": "5–9 pm" },
    { "name": "Eraveli", "phone": "87144 46244", "mapUrl": "https://maps.app.goo.gl/T7BtN9yKTBg9dGS47", "hours": "5–9 pm" },
    { "name": "Thoppumpady", "phone": "98950 85731", "mapUrl": "https://maps.app.goo.gl/avuWtnrD2aYmXLnb6", "hours": "5–9 pm" },
    { "name": "Palluruthy", "phone": "81291 79749", "mapUrl": "https://maps.app.goo.gl/nqiTJA4cjZeExYHe9", "hours": "5–9 pm" },
    { "name": "Moolamkuzhi", "phone": "77364 23463", "mapUrl": "https://maps.app.goo.gl/GhSUr39w1vyMvzLi7", "hours": "5–9 pm" },
    { "name": "Fort Kochi", "phone": "81295 08689", "mapUrl": "https://maps.app.goo.gl/Jc21d9sY4MX177As9", "hours": "5–9 pm" },
    { "name": "Vennala", "phone": "6282-179991", "mapUrl": "https://maps.app.goo.gl/7MRpY4dZUXRkj8gB8", "hours": "5–9 pm" },
    { "name": "Edappally", "phone": "8137-859426", "mapUrl": "https://maps.app.goo.gl/Gp159hZFmEDV3xkb9", "hours": "5–9 pm" }
  ]
}
```

- [ ] **Step 5: Run the store tests**

Run: `node --test tests/content-store.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 6: Wire the store into the server and Astro**

In `server.mjs`, add the import under the assessment import:

```js
import { ContentStore } from './server/content-store.mjs';
```

In `createSiteServer`, replace the first two lines of the body with:

```js
  const store = options.store ?? new AssessmentStore();
  const content = options.content ?? new ContentStore(store.db);
  content.applySeed();
  const api = createAssessmentHandler({ ...options, store });
```

and replace `return astro(req, res, undefined, {});` with:

```js
      return astro(req, res, undefined, { store: content });
```

Replace `src/env.d.ts` with:

```ts
/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    store?: import('../server/content-store.mjs').ContentStore;
  }
}
```

Create `src/lib/store.ts`:

```ts
import { openContentStore } from '../../server/content-store.mjs';

let devStore: ReturnType<typeof openContentStore> | undefined;

/** Production passes the shared store through locals; `astro dev` opens DATA_DIR directly. */
export function getStore(locals: App.Locals) {
  if (locals.store) return locals.store;
  devStore ??= openContentStore();
  return devStore;
}
```

Create `scripts/reset-content.mjs` (local development only — lets you re-seed after editing `content.json`):

```js
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (process.env.NODE_ENV === 'production') { console.error('Refusing to reset content in production.'); process.exit(1); }
const file = path.join(process.env.DATA_DIR || 'data', 'smartup.sqlite');
const db = new DatabaseSync(file);
for (const table of ['seed_log', 'settings', 'stats', 'timeline_entries', 'growth_points', 'leaders', 'results', 'testimonials', 'jobs', 'centres']) db.exec(`DROP TABLE IF EXISTS ${table}`);
db.close();
console.log(`Content cleared in ${file}. It is re-seeded from data-seed/content.json on the next start.`);
```

In `package.json` scripts, append ` && node --check server/content-store.mjs` to the end of `check`, and add:

```json
"content:reset": "node scripts/reset-content.mjs",
```

- [ ] **Step 7: Run all tests and the syntax check**

Run: `npm run check && npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/content-store.mjs data-seed/content.json src scripts/reset-content.mjs tests/content-store.test.mjs server.mjs package.json
git commit -m "Add seeded content store shared with Quest database

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Media pipeline (photos, videos, fonts, brand files)

**Files:**
- Create: `src/lib/media.mjs`, `data-seed/media-sources.json`, `scripts/fetch-media.mjs`, `scripts/build-media.mjs`, `tests/media.test.mjs`
- Create (generated, committed): `public/seed/img/*.webp`, `public/seed/video/*.mp4`, `public/seed/video/*-poster.webp`
- Create (copied): `public/fonts/rubik-{400,500,600,700,800}.woff2`, `public/fonts/Rubik-LICENSE.txt`, `public/brand/logo.svg`, `public/brand/owl.svg`
- Modify: `package.json`, `tests/routing.test.mjs`

**Interfaces:**
- Produces from `src/lib/media.mjs`: `WIDTHS = [480, 960, 1600]`; `srcset(base: string): string`; `variantFiles(name): {width,file}[]`; `driveUrl(id): string`; `validateSources(list): void` (throws on bad entries); `referencedMedia(content): {images: string[], videos: string[]}` (names referenced by `content.json`).
- Output naming: image `name` → `/seed/img/<name>-480.webp`, `-960.webp`, `-1600.webp`. Video `name` → `/seed/video/<name>.mp4` and `/seed/video/<name>-poster.webp`.

- [ ] **Step 1: Write the failing tests**

Create `tests/media.test.mjs`:

```js
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
```

Append to `tests/routing.test.mjs`:

```js
test('seed media, fonts and brand files are served with a day of caching', async () => {
  for (const p of ['/seed/img/leader-mohamed-rayees-480.webp', '/fonts/rubik-400.woff2', '/brand/owl.svg']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get('cache-control'), 'public, max-age=86400', p);
  }
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `node --test tests/media.test.mjs`
Expected: FAIL — `Cannot find module '../src/lib/media.mjs'`.

- [ ] **Step 3: Create `src/lib/media.mjs`**

```js
export const WIDTHS = [480, 960, 1600];

export const variantFiles = name => WIDTHS.map(width => ({ width, file: `${name}-${width}.webp` }));

export const srcset = base => WIDTHS.map(w => `${base}-${w}.webp ${w}w`).join(', ');

export const driveUrl = id => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;

export function validateSources(list) {
  const seen = new Set();
  for (const s of list) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name ?? '')) throw new Error(`${s.name}: name must be kebab-case`);
    if (seen.has(s.name)) throw new Error(`${s.name}: duplicate name`);
    seen.add(s.name);
    if (!['image', 'video'].includes(s.kind)) throw new Error(`${s.name}: kind must be image or video`);
    if (s.from === 'drive' && !s.id) throw new Error(`${s.name}: drive source needs an id`);
    if (s.from === 'local' && !s.path) throw new Error(`${s.name}: local source needs a path`);
    if (!['drive', 'local'].includes(s.from)) throw new Error(`${s.name}: from must be drive or local`);
  }
}

export function referencedMedia(content) {
  const text = JSON.stringify(content);
  const images = [...new Set([...text.matchAll(/"\/seed\/img\/([a-z0-9-]+)"/g)].map(m => m[1]))];
  const videos = [...new Set([...text.matchAll(/"\/seed\/video\/([a-z0-9-]+)\.mp4"/g)].map(m => m[1]))];
  return { images, videos };
}
```

- [ ] **Step 4: Create `data-seed/media-sources.json`**

Drive IDs come from the client's "TIME LINE FOLDERS" (12 Oct) and the original Drive folder (`tmp/drive-inventory.txt`). Videos are the client originals that v1 already downloaded into `tmp/research-content/`.

```json
[
  { "name": "timeline-2014-branch", "kind": "image", "from": "drive", "id": "1NNPg-ZBYp4RtevTm_uC4saZUNkFeD_WQ", "ext": ".jpg" },
  { "name": "timeline-2014-independence", "kind": "image", "from": "drive", "id": "1O3k1sFIuGQmZI7Y6lNRUXZwdlLswOSAR", "ext": ".png" },
  { "name": "timeline-2015-teachers-day", "kind": "image", "from": "drive", "id": "12h82aJmFM7JPb6euFBzxdqfdtVsmoNld", "ext": ".png" },
  { "name": "timeline-2016-award", "kind": "image", "from": "drive", "id": "1i8JpVwGIsM2ZK2nnc1I3QWdzrnwEtykP", "ext": ".jpg" },
  { "name": "timeline-2017-chullickal", "kind": "image", "from": "drive", "id": "1_7fJDGudWThMuOjmCRXZqHPTgLxEq4Na", "ext": ".jpg" },
  { "name": "timeline-2017-christmas", "kind": "image", "from": "drive", "id": "1g8Zz_-2hczulqVPAFIMT-EIn6PiN5-wo", "ext": ".jpg" },
  { "name": "timeline-2018-cwc-1", "kind": "image", "from": "drive", "id": "1qw9LdiQ7V0azjPhkumfFhjJmqzhViCmb", "ext": ".jpg" },
  { "name": "timeline-2019-shoot-the-drugs", "kind": "image", "from": "drive", "id": "1loW1MKmRcUJWw0oSZGqc54Iy70wcEZPd", "ext": ".jpg" },
  { "name": "timeline-2019-kalolsavam", "kind": "image", "from": "drive", "id": "1_3w5MU8mfKj1Z5ECxi6dPZhL75iFRQi0", "ext": ".jpg" },
  { "name": "timeline-2019-results", "kind": "image", "from": "drive", "id": "10BkxDxqegv8ZcQZi75rO-em862bpT5Ju", "ext": ".png" },
  { "name": "timeline-2019-onam", "kind": "image", "from": "drive", "id": "12jZGy_t2HGv93DN9lgNMJEVm4qxsSg-9", "ext": ".jpg" },
  { "name": "timeline-2019-tour", "kind": "image", "from": "drive", "id": "1oUDXEQd9-G_sTLLXCo_aFLXKrZGCl5Xl", "ext": ".jpg" },
  { "name": "timeline-2020-results", "kind": "image", "from": "drive", "id": "1Hhj7ju7mLXlnLw--QEQIjQE1kwOWig1v", "ext": ".png" },
  { "name": "timeline-2021-interactive-panel", "kind": "image", "from": "drive", "id": "1u-sZ-nDR5imY1P38pTMIl9TK1BYuiq2H", "ext": ".jpg" },
  { "name": "timeline-2022-kaumudi", "kind": "image", "from": "local", "path": "dist/assets/press/kerala-kaumudi-shoot-the-drugs.webp" },
  { "name": "timeline-2023-independence", "kind": "image", "from": "drive", "id": "1YWWnQmHvFBBBuLTC4EEDyU5NygvYG0of", "ext": ".png" },
  { "name": "timeline-2024-shoot-the-drugs-6", "kind": "image", "from": "drive", "id": "1TQbOrC0_YpHc7eHz7aEoh9LKSn6Crx3P", "ext": ".jpg" },
  { "name": "timeline-2025-shoot-the-drugs", "kind": "image", "from": "drive", "id": "1nCVF2bK5XNFGqk6OLso_cgiCWLd1DYM7", "ext": ".jpg" },
  { "name": "timeline-2025-tour", "kind": "image", "from": "drive", "id": "1IDfIlhbFGf6NQr2OkJH_Mncmtv3AuFC4", "ext": ".jpg" },
  { "name": "timeline-2026-talent-eve", "kind": "image", "from": "drive", "id": "1RdRnoR0OoNRovRG_Ci0FG21kDk391mns", "ext": ".jpg" },
  { "name": "timeline-2026-cwc-18", "kind": "image", "from": "drive", "id": "16GhG7uOXlEAQeY9v5c_nV7b8MW0R-zF4", "ext": ".jpg" },
  { "name": "timeline-2026-new-office", "kind": "image", "from": "drive", "id": "15yDSU8WB7J3kyO5UXDKp1l9nWeaMAhjU", "ext": ".heic" },
  { "name": "timeline-2026-camp", "kind": "image", "from": "drive", "id": "18upr9GoQ1kv9PJ-gE5GWZrRpbyK3TnuV", "ext": ".png" },
  { "name": "leader-mohamed-rayees", "kind": "image", "from": "drive", "id": "1OzDUzM2lohG0JIKOZzCuhFPjVv7Kr3PX", "ext": ".jpg" },
  { "name": "leader-dhanesh-narayanan-achari", "kind": "image", "from": "drive", "id": "1DZOoSpQuGEH8tH4sUII8wt2v_ZSne6Ec", "ext": ".jpg" },
  { "name": "leader-mohamed-shihas", "kind": "image", "from": "drive", "id": "1sHNxdxCta8XpEj0vEyx0UyBmG4s_xJs0", "ext": ".jpg" },
  { "name": "leader-shanu", "kind": "image", "from": "drive", "id": "1GcGNx0sduCxcd9QGMFZlyflz39rZhvok", "ext": ".jpg" },
  { "name": "results-sslc-2026", "kind": "image", "from": "local", "path": "dist/assets/results/sslc-2026.jpg" },
  { "name": "results-aysha-palakki", "kind": "image", "from": "local", "path": "dist/assets/results/aysha-palakki.jpg" },
  { "name": "results-archana", "kind": "image", "from": "local", "path": "dist/assets/results/archana.jpg" },
  { "name": "video-student-testimonial", "kind": "video", "from": "local", "path": "tmp/research-content/student-testimonial.mp4" },
  { "name": "video-student-and-parent", "kind": "video", "from": "local", "path": "tmp/research-content/TESTIMONIAL 8.mp4" },
  { "name": "video-two-students", "kind": "video", "from": "local", "path": "tmp/research-content/IMG_2342.MOV" },
  { "name": "video-story-7", "kind": "video", "from": "local", "path": "tmp/research-content/Testimonial 7.mp4" },
  { "name": "video-story-mix", "kind": "video", "from": "local", "path": "tmp/research-content/testimonial Mix.mp4" },
  { "name": "video-story-mix-3", "kind": "video", "from": "local", "path": "tmp/research-content/smart up mix 3.mp4" }
]
```

- [ ] **Step 5: Create `scripts/fetch-media.mjs`**

```js
import { mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { driveUrl, validateSources } from '../src/lib/media.mjs';

const sources = JSON.parse(readFileSync('data-seed/media-sources.json', 'utf8'));
validateSources(sources);
const outDir = 'content-source';
await mkdir(outDir, { recursive: true });
const exists = file => access(file).then(() => true, () => false);

for (const s of sources) {
  const ext = s.from === 'local' ? path.extname(s.path).toLowerCase() : s.ext;
  const target = path.join(outDir, s.name + ext);
  if (!(await exists(target))) {
    if (s.from === 'local') {
      if (!(await exists(s.path))) throw new Error(`${s.name}: missing local file ${s.path}. v1 kept client originals in tmp/research-content; restore it before building media.`);
      await copyFile(s.path, target);
    } else {
      const res = await fetch(driveUrl(s.id));
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || type.startsWith('text/html')) throw new Error(`${s.name}: Drive returned ${res.status} ${type}. Check the file is still shared.`);
      await writeFile(target, Buffer.from(await res.arrayBuffer()));
    }
    console.log('fetched', s.name);
  }
  // sharp's prebuilt binary cannot decode HEIC, so convert with macOS sips once.
  if (ext === '.heic' && !(await exists(target.replace(/\.heic$/, '.jpg')))) {
    execFileSync('sips', ['-s', 'format', 'jpeg', target, '--out', target.replace(/\.heic$/, '.jpg')], { stdio: 'ignore' });
  }
}
console.log(`Sources ready in ${outDir}/`);
```

- [ ] **Step 6: Create `scripts/build-media.mjs`**

```js
import { mkdir, access, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';
import { variantFiles, validateSources } from '../src/lib/media.mjs';

const sources = JSON.parse(readFileSync('data-seed/media-sources.json', 'utf8'));
validateSources(sources);
const force = process.argv.includes('--force');
const exists = file => access(file).then(() => true, () => false);
const imgDir = 'public/seed/img', videoDir = 'public/seed/video';
await mkdir(imgDir, { recursive: true });
await mkdir(videoDir, { recursive: true });
let bytes = 0;

const inputFor = s => {
  const ext = s.from === 'local' ? path.extname(s.path).toLowerCase() : s.ext;
  return path.join('content-source', s.name + (ext === '.heic' ? '.jpg' : ext));
};

for (const s of sources) {
  const input = inputFor(s);
  if (s.kind === 'image') {
    for (const { width, file } of variantFiles(s.name)) {
      const out = path.join(imgDir, file);
      if (force || !(await exists(out))) {
        await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
      }
      bytes += (await stat(out)).size;
    }
  } else {
    const out = path.join(videoDir, `${s.name}.mp4`);
    const posterJpg = path.join('content-source', `${s.name}-poster.jpg`);
    const poster = path.join(videoDir, `${s.name}-poster.webp`);
    if (force || !(await exists(out))) {
      // Portrait clips: 480px wide, H.264 for every browser, faststart so playback begins before the download ends.
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', 'scale=480:-2', '-c:v', 'libx264', '-crf', '29', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out]);
    }
    if (force || !(await exists(poster))) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', input, '-frames:v', '1', '-vf', 'scale=480:-2', posterJpg]);
      await sharp(posterJpg).webp({ quality: 75 }).toFile(poster);
    }
    bytes += (await stat(out)).size + (await stat(poster)).size;
  }
  console.log('built', s.name);
}
console.log(`public/seed holds ${(bytes / 1048576).toFixed(1)} MB`);
```

- [ ] **Step 7: Add the scripts, copy fonts and brand files, then build media**

In `package.json` scripts add:

```json
"media": "node scripts/fetch-media.mjs && node scripts/build-media.mjs",
```

```bash
mkdir -p public/fonts public/brand
cp dist/assets/rubik-400.woff2 dist/assets/rubik-500.woff2 dist/assets/rubik-600.woff2 dist/assets/rubik-700.woff2 dist/assets/rubik-800.woff2 dist/assets/Rubik-LICENSE.txt public/fonts/
cp dist/assets/logo.svg dist/assets/owl.svg public/brand/
npm run media
```

Expected: `fetched …` and `built …` for all 36 sources, ending with `public/seed holds N MB`, where N is under 45. If N is higher, rerun with `-crf 31` and `node scripts/build-media.mjs --force`.

- [ ] **Step 8: Look at the results**

Open `public/seed/img/leader-mohamed-rayees-960.webp`, `timeline-2026-new-office-960.webp` and one video poster. Confirm the HEIC photo converted correctly and phone photos are the right way up (`.rotate()` applies EXIF orientation).

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: PASS, including `media.test.mjs` and the new routing test.

- [ ] **Step 10: Commit**

```bash
git add src/lib/media.mjs data-seed/media-sources.json scripts/fetch-media.mjs scripts/build-media.mjs tests public package.json
git commit -m "Build web-ready timeline, founder, result and testimonial media

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Design system, layout, header, footer and mobile bar

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/lib/nav.ts`, `src/layouts/Base.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/SocialIcon.astro`, `src/components/MobileBar.astro`, `src/components/Picture.astro`, `src/components/SectionHead.astro`, `src/scripts/menu.ts`, `src/scripts/site.ts`, `src/pages/404.astro`, `playwright.config.ts`, `tests/e2e/pages.ts`, `tests/e2e/layout.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getStore(locals)`, `settings()`, `centres()`, `formatPhone()` (Task 2); `srcset()` (Task 3).
- Produces:
  - `Base.astro` props `{ title?: string; description: string; page: string }` — sets `<body data-astro-page={page}>`.
  - `Picture.astro` props `{ base: string; alt: string; sizes: string; priority?: boolean; class?: string }`.
  - `SectionHead.astro` props `{ eyebrow: string; title: string; intro?: string; id: string; link?: { href: string; label: string } }` — renders `<h2 id={id}>`.
  - `navGroups`, `quickLinks` from `src/lib/nav.ts`.
  - `src/scripts/site.ts` — the one script every page loads. Later tasks add imports here.
  - CSS classes for all later tasks: `.container`, `.section`, `.section--cream`, `.section--purple`, `.section--deep`, `.eyebrow`, `.marker`, `.btn`, `.btn--primary`, `.btn--yellow`, `.btn--ghost`, `.link-arrow`, `.rail` (horizontal scroller), `.sr-only`; reveal hooks `data-reveal`, `data-reveal="group"`, `data-reveal-item`.
  - `tests/e2e/pages.ts` exports `PAGES: string[]` — every built page path; later tasks append to it.

- [ ] **Step 1: Configure Playwright and write the failing layout tests**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'rm -rf tmp/e2e-data && node server.mjs',
    url: 'http://127.0.0.1:4173/health',
    env: { PORT: '4173', DATA_DIR: 'tmp/e2e-data', ADMIN_PASSWORD: 'e2e-only-password-0000' },
    reuseExistingServer: false,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
```

Create `tests/e2e/pages.ts`:

```ts
export const PAGES = ['/', '/does-not-exist'];
```

Create `tests/e2e/layout.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { PAGES } from './pages';

test('no horizontal overflow on a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('menu opens, lists all four groups and closes with Escape', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const menu = page.locator('#site-menu');
  await expect(menu).toBeVisible();
  for (const group of ['About us', 'Learn', 'Proof', 'Join']) await expect(menu.getByRole('heading', { name: group })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('phone bar offers a demo and a call while WhatsApp is unset', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/');
  const bar = page.locator('.mobile-bar');
  await expect(bar.getByRole('link', { name: 'Book free demo' })).toBeVisible();
  await expect(bar.locator('a[href="tel:+918891910919"]')).toBeVisible();
  await expect(bar.getByText('WhatsApp')).toHaveCount(0);
});

test('every phone link is tel-safe', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="tel:"]').evaluateAll(links => links.map(a => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThanOrEqual(10);
  for (const href of hrefs) expect(href).toMatch(/^tel:\+91[6-9]\d{9}$/);
});

test('without JavaScript the menu link jumps to the footer navigation', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('href', '#footer-nav');
  await expect(page.locator('#footer-nav')).toBeVisible();
  await context.close();
});

test('unknown pages show the branded 404 with status 404', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page isn't here yet");
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm run test:e2e -- tests/e2e/layout.spec.ts`
Expected: FAIL — no `[data-menu-toggle]`, no `.mobile-bar`, no 404 heading.

- [ ] **Step 3: Create the design tokens and global styles**

Create `src/styles/tokens.css`:

```css
:root {
  --purple: #5f2ea8;
  --purple-600: #56269b;
  --purple-900: #392064;
  --purple-300: #9560d7;
  --cream: #f4eee4;
  --ink: #1e1e1e;
  --white: #ffffff;
  --yellow: #ede60f;
  --ink-soft: #4a4453;
  --line: #e4dbef;
  --purple-tint: #efe7fa;
  --on-purple-soft: #e4d8f5;

  --font: 'Rubik', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --step--1: clamp(0.875rem, 0.85rem + 0.1vw, 0.9375rem);
  --step-0: 1.0625rem;
  --step-1: clamp(1.125rem, 1.05rem + 0.35vw, 1.3125rem);
  --step-2: clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem);
  --step-3: clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem);
  --step-4: clamp(2.25rem, 1.6rem + 3vw, 4rem);
  --step-5: clamp(2.75rem, 1.8rem + 4.6vw, 6rem);

  --gutter: clamp(1rem, 0.5rem + 2.5vw, 2.5rem);
  --space-section: clamp(4.5rem, 3rem + 6vw, 8rem);
  --max: 75rem;
  --radius: 1.25rem;
  --radius-sm: 0.75rem;
  --header-h: 4rem;
  --bar-h: 4.75rem;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Create `src/styles/global.css`:

```css
@font-face { font-family: 'Rubik'; font-weight: 400; font-style: normal; font-display: swap; src: url('/fonts/rubik-400.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 500; font-style: normal; font-display: swap; src: url('/fonts/rubik-500.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 600; font-style: normal; font-display: swap; src: url('/fonts/rubik-600.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 700; font-style: normal; font-display: swap; src: url('/fonts/rubik-700.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 800; font-style: normal; font-display: swap; src: url('/fonts/rubik-800.woff2') format('woff2'); }

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: calc(var(--header-h) + 1rem); }
/* No overflow-x clipping on body: it would hide real overflow from the 360px test. */
body { margin: 0; font-family: var(--font); font-size: var(--step-0); line-height: 1.6; color: var(--ink); background: var(--white); }
img, video, svg { display: block; max-width: 100%; }
img { height: auto; }
h1, h2, h3, h4 { margin: 0; line-height: 1.1; letter-spacing: -0.02em; text-wrap: balance; }
p, ul, ol, dl, dd, figure { margin: 0; }
p { text-wrap: pretty; }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--purple-300); outline-offset: 3px; border-radius: 4px; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.skip-link { position: absolute; left: 1rem; top: -5rem; z-index: 100; background: var(--ink); color: var(--white); padding: 0.75rem 1rem; border-radius: var(--radius-sm); }
.skip-link:focus { top: 1rem; }

.container { width: min(100% - 2 * var(--gutter), var(--max)); margin-inline: auto; }
.section { padding-block: var(--space-section); }
.section--cream { background: var(--cream); }
.section--purple { background: var(--purple); color: var(--cream); }
.section--deep { background: var(--purple-900); color: var(--cream); }

.eyebrow { font-size: var(--step--1); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--purple); }
.section--purple .eyebrow, .section--deep .eyebrow { color: var(--on-purple-soft); }
.marker { background: var(--yellow); color: var(--ink); padding: 0 0.12em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 3rem; padding: 0.75rem 1.4rem; border-radius: 999px; border: 2px solid transparent; font: 600 1rem/1.2 var(--font); text-decoration: none; cursor: pointer; transition: transform 0.2s var(--ease-out), background-color 0.2s; }
.btn:active { transform: scale(0.97); }
.btn--primary { background: var(--purple); color: var(--white); }
.btn--primary:hover { background: var(--purple-600); }
.btn--yellow { background: var(--yellow); color: var(--ink); }
.btn--ghost { border-color: currentColor; color: inherit; }
.link-arrow { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 44px; font-weight: 600; color: var(--purple); text-decoration: none; }
.section--purple .link-arrow, .section--deep .link-arrow { color: var(--cream); }
.link-arrow::after { content: '→'; transition: transform 0.2s var(--ease-out); }
.link-arrow:hover::after { transform: translateX(4px); }

/* Horizontal scroller with a visible next-card edge; never auto-advances. */
.rail { display: grid; grid-auto-flow: column; grid-auto-columns: min(78%, 18rem); gap: 1rem; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; padding-bottom: 0.75rem; scrollbar-width: thin; }
.rail > * { scroll-snap-align: start; }

@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal]:not([data-reveal='group']):not(.is-revealed),
  .js [data-reveal='group']:not(.is-revealed) [data-reveal-item] { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
@media (max-width: 899px) { body { padding-bottom: calc(var(--bar-h) + env(safe-area-inset-bottom)); } }
html.menu-open { overflow: hidden; }
```

- [ ] **Step 4: Create navigation data and the small shared components**

Create `src/lib/nav.ts`:

```ts
export type NavLink = { label: string; href: string };
export type NavGroup = { title: string; links: NavLink[] };

export const navGroups: NavGroup[] = [
  { title: 'About us', links: [
    { label: 'Our Story', href: '/story' }, { label: 'Founders', href: '/founders' },
    { label: 'Faculty', href: '/faculty' }, { label: 'Life @ Smartup', href: '/life' } ] },
  { title: 'Learn', links: [
    { label: 'Courses', href: '/courses' }, { label: 'YouTube classes', href: '/videos' },
    { label: 'Blog', href: '/blog' }, { label: 'Ask Smartup', href: '/ask' },
    { label: 'Smartup App', href: '/app' }, { label: 'Smartup Quest', href: '/assessment/' } ] },
  { title: 'Proof', links: [
    { label: 'Results', href: '/results' }, { label: 'Testimonials', href: '/testimonials' },
    { label: 'Alumni', href: '/alumni' } ] },
  { title: 'Join', links: [
    { label: 'Free demo class', href: '/demo' }, { label: 'Community', href: '/community' },
    { label: 'Careers', href: '/careers' }, { label: 'Centres & contact', href: '/contact' } ] },
];

export const quickLinks: NavLink[] = [
  { label: 'Our Story', href: '/story' }, { label: 'Results', href: '/results' },
  { label: 'Courses', href: '/courses' }, { label: 'Contact', href: '/contact' },
];
```

Create `src/components/Picture.astro`:

```astro
---
import { srcset } from '../lib/media.mjs';
interface Props { base: string; alt: string; sizes: string; priority?: boolean; class?: string }
const { base, alt, sizes, priority = false, class: className } = Astro.props;
---
<img
  class={className}
  src={`${base}-960.webp`}
  srcset={srcset(base)}
  sizes={sizes}
  alt={alt}
  loading={priority ? 'eager' : 'lazy'}
  decoding="async"
  fetchpriority={priority ? 'high' : undefined}
  data-priority={priority ? '' : undefined}
/>
```

Create `src/components/SectionHead.astro`:

```astro
---
interface Props { eyebrow: string; title: string; intro?: string; id: string; link?: { href: string; label: string } }
const { eyebrow, title, intro, id, link } = Astro.props;
---
<header class="section-head" data-reveal>
  <p class="eyebrow">{eyebrow}</p>
  <h2 id={id}>{title}</h2>
  {intro && <p class="intro">{intro}</p>}
  {link && <a class="link-arrow" href={link.href}>{link.label}</a>}
</header>
<style>
  .section-head { display: grid; gap: 0.75rem; margin-bottom: clamp(2rem, 1.5rem + 2vw, 3.25rem); max-width: 46rem; }
  h2 { font-size: var(--step-4); font-weight: 800; }
  .intro { font-size: var(--step-1); color: var(--ink-soft); }
  :global(.section--purple) .intro, :global(.section--deep) .intro { color: var(--on-purple-soft); }
</style>
```

Create `src/components/SocialIcon.astro`:

```astro
---
interface Props { network: 'facebook' | 'instagram' | 'youtube' }
const { network } = Astro.props;
---
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  {network === 'facebook' && <path d="M14 8h2.5V4.5H14A4 4 0 0 0 10 8.5V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V8.5A.5.5 0 0 1 14 8z" />}
  {network === 'instagram' && <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></>}
  {network === 'youtube' && <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" /></>}
</svg>
```

- [ ] **Step 5: Create the header, footer and mobile bar**

Create `src/components/Header.astro`:

```astro
---
import { navGroups, quickLinks } from '../lib/nav';
---
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container bar">
    <a href="/" class="logo"><img src="/brand/logo.svg" alt="Smartup" width="150" height="33" /></a>
    <nav class="quick" aria-label="Quick links">
      <ul>{quickLinks.map(link => <li><a href={link.href}>{link.label}</a></li>)}</ul>
    </nav>
    <a class="btn btn--primary header-cta" href="/demo">Book free demo</a>
    <a class="menu-toggle" href="#footer-nav" data-menu-toggle>
      <span class="menu-icon" aria-hidden="true"></span><span data-menu-label>Menu</span>
    </a>
  </div>
  <div id="site-menu" class="menu-panel" hidden>
    <nav class="container menu-grid" aria-label="Main">
      {navGroups.map(group => (
        <section>
          <h2 class="eyebrow">{group.title}</h2>
          <ul>{group.links.map(link => <li><a href={link.href}>{link.label}</a></li>)}</ul>
        </section>
      ))}
    </nav>
  </div>
</header>
<style>
  .site-header { position: sticky; top: 0; z-index: 50; background: var(--white); border-bottom: 1px solid var(--line); }
  .bar { display: flex; align-items: center; gap: 1.25rem; height: var(--header-h); }
  .logo { margin-right: auto; display: block; }
  .logo img { width: clamp(118px, 30vw, 150px); height: auto; }
  .quick, .header-cta { display: none; }
  .quick ul { display: flex; gap: 1.5rem; list-style: none; padding: 0; }
  .quick a { text-decoration: none; font-weight: 500; }
  .quick a:hover { color: var(--purple); }
  .menu-toggle { display: inline-flex; align-items: center; gap: 0.6rem; min-height: 44px; min-width: 44px; padding: 0 0.25rem; font-weight: 600; text-decoration: none; }
  .menu-icon { position: relative; width: 22px; height: 14px; }
  .menu-icon::before, .menu-icon::after { content: ''; position: absolute; left: 0; right: 0; height: 2px; border-radius: 2px; background: currentColor; transition: transform 0.32s var(--ease-out); }
  .menu-icon::before { top: 2px; }
  .menu-icon::after { bottom: 2px; }
  :global(.menu-open) .menu-icon::before { transform: translateY(4px) rotate(45deg); }
  :global(.menu-open) .menu-icon::after { transform: translateY(-4px) rotate(-45deg); }
  .menu-panel { position: fixed; inset: var(--header-h) 0 0; overflow-y: auto; background: var(--white); padding-block: 2rem 6rem; }
  .menu-grid { display: grid; gap: 2rem; }
  .menu-grid ul { list-style: none; padding: 0; margin-top: 0.75rem; display: grid; gap: 0.25rem; }
  .menu-grid a { display: block; padding: 0.4rem 0; font-size: var(--step-2); font-weight: 600; text-decoration: none; }
  .menu-grid a:hover { color: var(--purple); }
  @media (min-width: 600px) { .menu-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px) {
    .quick, .header-cta { display: block; }
    .header-cta { display: inline-flex; min-height: 2.75rem; }
    .menu-grid { grid-template-columns: repeat(4, 1fr); }
  }
</style>
```

Create `src/components/Footer.astro`:

```astro
---
import { navGroups } from '../lib/nav';
import { formatPhone } from '../../server/content-store.mjs';
import SocialIcon from './SocialIcon.astro';
interface Props { settings: any; centres: { name: string; phone: string; mapUrl: string; hours: string }[] }
const { settings, centres } = Astro.props;
const year = new Date().getFullYear();
---
<footer class="site-footer section--cream">
  <div class="container footer-grid">
    <div class="brand">
      <img src="/brand/logo.svg" alt="Smartup" width="150" height="33" />
      <p>Tuitions for classes 8 to +2 in Kochi and online.</p>
      <p><a href={`tel:${settings.phone}`}>{formatPhone(settings.phone)}</a><br /><a href={`mailto:${settings.email}`}>{settings.email}</a></p>
      <ul class="social" aria-label="Smartup on social media">
        {settings.social.map((s: any) => <li><a href={s.url} target="_blank" rel="noopener" aria-label={s.label}><SocialIcon network={s.network} /></a></li>)}
      </ul>
    </div>
    <nav id="footer-nav" class="footer-nav" aria-label="Site">
      {navGroups.map(group => (
        <section>
          <h2 class="eyebrow">{group.title}</h2>
          <ul>{group.links.map(link => <li><a href={link.href}>{link.label}</a></li>)}</ul>
        </section>
      ))}
    </nav>
    <section class="centres" aria-labelledby="footer-centres">
      <h2 class="eyebrow" id="footer-centres">Our centres</h2>
      <ul>
        {centres.map(c => (
          <li><a href={c.mapUrl} target="_blank" rel="noopener">{c.name}</a><a class="tel" href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a></li>
        ))}
      </ul>
      <p class="hours">All centres open {settings.hours}</p>
    </section>
  </div>
  <div class="container base">
    <p>© {year} Smartup. All rights reserved.</p>
    <a href="/privacy.html">Privacy</a>
  </div>
</footer>
<style>
  .site-footer { padding-block: clamp(3.5rem, 2.5rem + 4vw, 5.5rem) 1.5rem; }
  .footer-grid { display: grid; gap: 2.5rem; }
  .brand { display: grid; gap: 1rem; align-content: start; }
  .brand img { width: 150px; height: auto; }
  .brand a { text-decoration: none; font-weight: 500; }
  .social { display: flex; gap: 0.5rem; list-style: none; padding: 0; flex-wrap: wrap; }
  .social a { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--white); color: var(--purple); }
  .footer-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
  .footer-nav ul, .centres ul { list-style: none; padding: 0; margin-top: 0.6rem; display: grid; gap: 0.15rem; }
  .footer-nav a, .centres a { display: inline-block; padding: 0.3rem 0; text-decoration: none; }
  .footer-nav a:hover, .centres a:hover { color: var(--purple); }
  .centres li { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .centres .tel { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
  .hours { margin-top: 0.75rem; color: var(--ink-soft); font-size: var(--step--1); }
  .base { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid #ddd2c2; font-size: var(--step--1); color: var(--ink-soft); }
  @media (min-width: 900px) {
    .footer-grid { grid-template-columns: 1fr 2fr 1.2fr; }
    .footer-nav { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
</style>
```

Create `src/components/MobileBar.astro`:

```astro
---
interface Props { phone: string; whatsapp: string | null }
const { phone, whatsapp } = Astro.props;
---
<nav class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn--primary" href="/demo">Book free demo</a>
  {whatsapp
    ? <a class="btn btn--ghost" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener">WhatsApp</a>
    : <a class="btn btn--ghost" href={`tel:${phone}`}>Call us</a>}
</nav>
<style>
  .mobile-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.6rem; padding: 0.7rem var(--gutter) calc(0.7rem + env(safe-area-inset-bottom)); background: var(--white); border-top: 1px solid var(--line); box-shadow: 0 -6px 24px rgb(57 32 100 / 0.08); }
  .mobile-bar .btn--ghost { color: var(--purple); }
  @media (min-width: 900px) { .mobile-bar { display: none; } }
</style>
```

- [ ] **Step 6: Create the menu script, the shared site script and the layout**

Create `src/scripts/menu.ts`:

```ts
import { animate } from 'motion';

export function initMenu(reduceMotion: boolean) {
  const toggle = document.querySelector<HTMLAnchorElement>('[data-menu-toggle]');
  const panel = document.getElementById('site-menu');
  const label = toggle?.querySelector('[data-menu-label]');
  if (!toggle || !panel || !label) return;
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-controls', 'site-menu');
  toggle.setAttribute('aria-expanded', 'false');

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    if (open) {
      if (!reduceMotion) animate(panel, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.42, ease: [0.22, 1, 0.36, 1] });
      panel.querySelector<HTMLElement>('a')?.focus();
    }
  };

  toggle.addEventListener('click', event => { event.preventDefault(); setOpen(panel.hidden); });
  toggle.addEventListener('keydown', event => { if (event.key === ' ') { event.preventDefault(); setOpen(panel.hidden); } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  panel.addEventListener('click', event => { if ((event.target as Element).closest('a')) setOpen(false); });
}
```

Create `src/scripts/site.ts`:

```ts
import { initMenu } from './menu';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
(window as unknown as { __siteReady: boolean }).__siteReady = true;
```

Create `src/layouts/Base.astro`:

```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import MobileBar from '../components/MobileBar.astro';
import { getStore } from '../lib/store';
interface Props { title?: string; description: string; page: string }
const { title, description, page } = Astro.props;
const store = getStore(Astro.locals);
const settings = store.settings();
const centres = store.centres();
const fullTitle = title ? `${title} — Smartup` : 'Smartup — Tuitions in Kochi for CBSE & State Board';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <meta name="theme-color" content="#5f2ea8" />
    <link rel="icon" href="/brand/owl.svg" type="image/svg+xml" />
    <link rel="preload" href="/fonts/rubik-400.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/rubik-800.woff2" as="font" type="font/woff2" crossorigin />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <!-- Hide reveal targets only while JS runs; if the bundle fails, show everything after 2.5s. -->
    <script is:inline>document.documentElement.classList.add('js');setTimeout(function(){if(!window.__siteReady)document.documentElement.classList.remove('js');},2500);</script>
  </head>
  <body data-astro-page={page}>
    <Header />
    <main id="main"><slot /></main>
    <Footer settings={settings} centres={centres} />
    <MobileBar phone={settings.phone} whatsapp={settings.whatsapp} />
    <script>import '../scripts/site';</script>
  </body>
</html>
```

- [ ] **Step 7: Create the 404 page and switch the homepage to the layout**

Create `src/pages/404.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Page not found" description="This page of the Smartup website isn't available yet." page="404">
  <section class="section">
    <div class="container notfound">
      <p class="eyebrow">404</p>
      <h1>This page isn't here yet</h1>
      <p>We're still building parts of the new Smartup website. Start with our story, or call us and we'll help.</p>
      <div class="actions"><a class="btn btn--primary" href="/">Go to the homepage</a><a class="btn btn--ghost" href="/story">Read our story</a></div>
    </div>
  </section>
</Base>
<style>
  .notfound { display: grid; gap: 1rem; max-width: 40rem; }
  h1 { font-size: var(--step-4); font-weight: 800; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }
</style>
```

Replace `src/pages/index.astro` (Tasks 7–8 fill in the sections):

```astro
---
import Base from '../layouts/Base.astro';
---
<Base description="Smartup tuitions in Kochi and online for CBSE and State Board students, classes 8 to +2." page="home">
  <section class="section"><div class="container"><h1>Smartup</h1></div></section>
</Base>
```

- [ ] **Step 8: Run the layout tests and the unit tests**

Run: `npm run test:e2e -- tests/e2e/layout.spec.ts && npm test`
Expected: PASS on both `mobile` and `desktop` projects.

- [ ] **Step 9: Check it by eye on a phone-sized window**

Run `npm run build && npm start`, open http://localhost:3000 at 375px wide and at desktop width. Check: logo crisp on white, menu opens full-screen, bottom bar sits above the home indicator, footer centres list readable.

- [ ] **Step 10: Commit**

```bash
git add src playwright.config.ts tests/e2e package.json
git commit -m "Add brand design system, header, footer and phone action bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The owl, proof numbers and the motion runtime

**Files:**
- Create: `src/components/Owl.astro`, `src/components/Stats.astro`, `src/scripts/motion.ts`, `tests/e2e/motion.spec.ts`
- Modify: `src/scripts/site.ts`, `src/pages/index.astro` (temporary section showing the owl and stats), `tests/routing.test.mjs`

**Interfaces:**
- Consumes: `stats()` (Task 2); reveal hooks and `Base` (Task 4).
- Produces:
  - `Owl.astro` props `{ size?: string; badge?: boolean; idle?: boolean; label?: string; class?: string }`. Markup hooks: `svg.owl[data-owl="idle"|"still"]`, `g.owl-pupils`, `g.owl-eye` (×2).
  - `Stats.astro` props `{ stats: {value,label,source}[]; tone?: 'light' | 'dark' }`. Counters use `[data-count-to][data-count-suffix]`.
  - `src/scripts/motion.ts` exports `initMotion(reduceMotion: boolean)`, `blink(svg: Element)`, `glance(svg: Element, direction: -1 | 1)`, `rollHead(svg: Element)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/motion.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { gzipSync } from 'node:zlib';

const FINAL = ['12+', '9', '30,000+', '107'];

test('proof numbers count up to their final values', async ({ page }) => {
  await page.goto('/');
  await page.locator('.stats').scrollIntoViewIfNeeded();
  const values = page.locator('.stats [data-count-to]');
  await expect(values).toHaveText(FINAL, { timeout: 5000 });
});

test('with reduced motion everything is visible at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.stats [data-count-to]')).toHaveText(FINAL);
  const hidden = await page.locator('[data-reveal], [data-reveal-item]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  expect(hidden).toBe(0);
});

test('without JavaScript numbers and content are visible', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.stats [data-count-to]')).toHaveText(FINAL);
  const hidden = await page.locator('[data-reveal], [data-reveal-item]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  expect(hidden).toBe(0);
  await context.close();
});

test('the owl renders with two animatable eyes', async ({ page }) => {
  await page.goto('/');
  const owl = page.locator('svg.owl').first();
  await expect(owl).toBeVisible();
  await expect(owl.locator('g.owl-eye')).toHaveCount(2);
});

test('page JavaScript stays under 50 KB gzipped', async ({ page, request }) => {
  const scripts = new Set<string>();
  page.on('response', r => { if (r.request().resourceType() === 'script') scripts.add(r.url()); });
  for (const path of ['/', '/story']) await page.goto(path);
  let total = 0;
  for (const url of scripts) total += gzipSync(await (await request.get(url)).body()).length;
  expect(total).toBeLessThan(50 * 1024);
});
```

Append to `tests/routing.test.mjs`:

```js
test('Astro-built scripts are cached as immutable', async () => {
  const html = await (await fetch(base + '/')).text();
  const src = html.match(/src="(\/_astro\/[^"]+\.js)"/)?.[1];
  assert.ok(src, 'homepage loads an /_astro/ script');
  assert.equal((await fetch(base + src)).headers.get('cache-control'), 'public, max-age=31536000, immutable');
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm run test:e2e -- tests/e2e/motion.spec.ts`
Expected: FAIL — no `.stats` and no `svg.owl` on the page.

- [ ] **Step 3: Create `src/components/Owl.astro`**

The paths are the supplied owl from `dist/assets/owl.svg`, unchanged. Only the grouping is new: each pupil sits in its own `g.owl-eye` so it can blink around its own centre, and `g.owl-pupils` can glance. CSS transforms go on the groups, never on the paths, because the paths carry their own `transform` attribute.

```astro
---
interface Props { size?: string; badge?: boolean; idle?: boolean; label?: string; class?: string }
const { size = '6rem', badge = false, idle = true, label, class: className } = Astro.props;
---
<span class:list={['owl-wrap', { 'owl-badge': badge }, className]} style={`--owl-size:${size}`}>
  <svg class="owl" viewBox="0 0 258 228" data-owl={idle ? 'idle' : 'still'} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
    <g fill="#672aae">
      <path transform="matrix(1,0,0,-1,181.28363,167.49811)" d="M0 0C-16.617-2.848-32.902 3.134-44.922 14.804-52.386-.205-65.76-11.269-82.376-14.117-111.717-19.145-140.039 3.338-145.635 36.101-151.231 68.864-131.981 99.499-102.641 104.527-86.024 107.375-69.738 101.393-57.718 89.723-50.255 104.732-36.881 115.797-20.264 118.644 9.077 123.672 37.398 101.189 42.994 68.426 48.59 35.664 29.341 5.028 0 0M62.68 84.761C53.587 137.996-4.446 164.393-68.594 153.4-132.742 142.407-178.714 98.186-169.621 44.951-157.698-24.854-98.551-57.778-34.403-46.785 29.745-35.791 74.602 14.956 62.68 84.761" />
      <g class="owl-pupils">
        <g class="owl-eye"><path transform="matrix(1,0,0,-1,155.487,110.86047)" d="M0 0C-1.691 9.902 4.739 19.266 14.363 20.916 23.987 22.565 33.16 15.875 34.851 5.972 36.542-3.93 30.112-13.294 20.488-14.943 10.864-16.592 1.691-9.902 0 0" /></g>
        <g class="owl-eye"><path transform="matrix(1,0,0,-1,69.588809,125.58087)" d="M0 0C-1.691 9.902 4.739 19.266 14.363 20.916 23.987 22.565 33.16 15.875 34.851 5.972 36.542-3.93 30.112-13.294 20.488-14.943 10.864-16.592 1.691-9.902 0 0" /></g>
      </g>
      <path transform="matrix(1,0,0,-1,135.4701,147.47589)" d="M0 0-7.478 11.353C-9.853 13.794-9.998 17.639-7.813 20.252-5.728 22.746-2.147 23.36 .647 21.702 3.575 19.965 4.714 16.29 3.284 13.198Z" />
    </g>
  </svg>
</span>
<style>
  .owl-wrap { display: inline-block; width: var(--owl-size); flex: none; }
  .owl { width: 100%; height: auto; overflow: visible; }
  .owl-badge { display: inline-grid; place-items: center; aspect-ratio: 1; padding: calc(var(--owl-size) * 0.18); border-radius: 50%; background: var(--cream); }
  .owl-eye, .owl-pupils { transform-box: fill-box; transform-origin: center; }
</style>
```

- [ ] **Step 4: Create `src/components/Stats.astro`**

```astro
---
interface Props { stats: { value: string; label: string; source: string }[]; tone?: 'light' | 'dark' }
const { stats, tone = 'dark' } = Astro.props;
const parse = (value: string) => {
  const match = value.match(/^([\d,]+)(.*)$/);
  return match ? { to: Number(match[1].replace(/,/g, '')), suffix: match[2] } : null;
};
---
<dl class:list={['stats', `stats--${tone}`]} data-reveal="group">
  {stats.map(stat => {
    const count = parse(stat.value);
    return (
      <div class="stat" data-reveal-item>
        <dt class="stat-label">{stat.label}</dt>
        <dd class="stat-value">
          <span aria-hidden="true" data-count-to={count?.to} data-count-suffix={count?.suffix}>{stat.value}</span>
          <span class="sr-only">{stat.value}</span>
        </dd>
        {stat.source && <dd class="stat-source">{stat.source}</dd>}
      </div>
    );
  })}
</dl>
<style>
  .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem 1rem; }
  .stat { display: flex; flex-direction: column; gap: 0.2rem; }
  .stat-value { order: -1; font-size: var(--step-4); font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-label { font-weight: 600; }
  .stat-source { font-size: var(--step--1); opacity: 0.8; }
  .stats--dark .stat-value { color: var(--yellow); }
  .stats--dark .stat-label, .stats--dark .stat-source { color: var(--cream); }
  .stats--light .stat-value { color: var(--purple); }
  @media (min-width: 900px) { .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
```

- [ ] **Step 5: Create `src/scripts/motion.ts`**

```ts
import { animate, inView, stagger } from 'motion';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function blink(svg: Element) {
  animate(svg.querySelectorAll('.owl-eye'), { scaleY: [1, 0.1, 1, 0.1, 1] }, { duration: 0.55, times: [0, 0.2, 0.45, 0.65, 1] });
}

export function glance(svg: Element, direction: -1 | 1) {
  const pupils = svg.querySelector('.owl-pupils');
  if (pupils) animate(pupils, { x: [0, 6 * direction, 6 * direction, 0] }, { duration: 1.4, times: [0, 0.2, 0.75, 1], ease: EASE });
}

export function rollHead(svg: Element) {
  animate(svg, { rotate: [0, 360] }, { duration: 1.2, ease: EASE });
}

function initReveals() {
  inView('[data-reveal]', element => {
    const items = element.getAttribute('data-reveal') === 'group'
      ? Array.from(element.querySelectorAll<HTMLElement>('[data-reveal-item]'))
      : [element as HTMLElement];
    element.classList.add('is-revealed');
    animate(items, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: stagger(0.07), ease: EASE });
  }, { amount: 0.15 });
}

function initCounters() {
  const format = new Intl.NumberFormat('en-IN');
  inView('[data-count-to]', element => {
    const el = element as HTMLElement;
    const to = Number(el.dataset.countTo);
    const suffix = el.dataset.countSuffix ?? '';
    if (!Number.isFinite(to)) return;
    animate(0, to, { duration: 1.4, ease: EASE, onUpdate: v => { el.textContent = format.format(Math.round(v)) + suffix; } });
  }, { amount: 0.6 });
}

function initIdleOwls() {
  inView('svg[data-owl="idle"]', svg => {
    let timer = 0;
    const loop = () => {
      if (Math.random() < 0.6) blink(svg); else glance(svg, Math.random() < 0.5 ? -1 : 1);
      timer = window.setTimeout(loop, 3500 + Math.random() * 2500);
    };
    timer = window.setTimeout(loop, 1200);
    return () => window.clearTimeout(timer);
  });
}

export function initMotion(reduceMotion: boolean) {
  // Reduced motion: server-rendered final values stay, and CSS never hides reveal targets.
  if (reduceMotion) return;
  initReveals();
  initCounters();
  initIdleOwls();
}
```

- [ ] **Step 6: Load motion on every page and show the owl and stats**

Replace `src/scripts/site.ts`:

```ts
import { initMenu } from './menu';
import { initMotion } from './motion';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
initMotion(reduceMotion);
(window as unknown as { __siteReady: boolean }).__siteReady = true;
```

Replace `src/pages/index.astro` (Task 7 replaces this section with the real hero):

```astro
---
import Base from '../layouts/Base.astro';
import Owl from '../components/Owl.astro';
import Stats from '../components/Stats.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
---
<Base description="Smartup tuitions in Kochi and online for CBSE and State Board students, classes 8 to +2." page="home">
  <section class="section section--purple">
    <div class="container" style="display:grid;gap:2rem">
      <Owl size="8rem" badge label="Smartup owl" />
      <Stats stats={store.stats()} />
    </div>
  </section>
</Base>
```

- [ ] **Step 7: Run the tests**

Run: `npm run test:e2e -- tests/e2e/motion.spec.ts tests/e2e/layout.spec.ts && npm test`
Expected: PASS. (`/story` in the JS-budget test returns the 404 page until Task 6; it still loads the same script.)

- [ ] **Step 8: Check the owl by eye**

Open http://localhost:3000 after `npm run build && npm start`. Within ~5 seconds the owl blinks twice quickly or glances sideways, and the pupils stay inside the eyes. With macOS "Reduce motion" on, it stays still.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Animate the brand owl and proof numbers with reduced-motion fallbacks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The timeline and the Our Story page

**Files:**
- Create: `src/components/Timeline.astro`, `src/components/GrowthChart.astro`, `src/scripts/timeline.ts`, `src/pages/story.astro`, `tests/pages.test.mjs`, `tests/e2e/story.spec.ts`
- Modify: `src/scripts/site.ts`, `tests/e2e/pages.ts`

**Interfaces:**
- Consumes: `timeline()`, `growth()`, `settings().vision` (Task 2); `Picture`, `SectionHead`, `Base` (Task 4); `Owl`, `blink`, `glance`, `rollHead` (Task 5).
- Produces:
  - `Timeline.astro` props `{ chapters: Chapter[]; variant: 'full' | 'teaser' }`. Hooks: `[data-timeline]`, `[data-timeline-progress]`, `[data-timeline-owl]`, `[data-timeline-now]`, `li.chapter[data-year]`. Teasers have no owl and no scroll binding.
  - `GrowthChart.astro` props `{ points: GrowthPoint[] }`.
  - `initTimelines()` from `src/scripts/timeline.ts`.
  - `tests/pages.test.mjs` exports nothing; it defines `start(prepare?)` used by its own tests (Task 8 adds more tests to this file).

- [ ] **Step 1: Write the failing tests**

Create `tests/pages.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSiteServer } from '../server.mjs';
import { AssessmentStore } from '../server/assessment.mjs';
import { ContentStore } from '../server/content-store.mjs';

async function start(prepare = () => {}) {
  const store = new AssessmentStore(':memory:');
  const content = new ContentStore(store.db);
  content.applySeed();
  prepare(content);
  const server = createSiteServer({ store, content });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = async path => { const r = await fetch(base + path); assert.equal(r.status, 200, path); return r.text(); };
  return { html, close: () => new Promise(r => server.close(() => { store.close(); r(); })) };
}

test('Our Story lists every chapter in order, the growth data and the vision', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/story');
  const years = [...page.matchAll(/data-year="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(years, ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', 'Next']);
  assert.match(page, /30,000\+/);
  assert.match(page, /Shaping the future of learning/);
  assert.match(page, /Vision 2030/);
});

test('a chapter edited by staff appears on the next request', async t => {
  const site = await start(content => content.db.prepare("UPDATE timeline_entries SET title = 'Edited chapter title' WHERE year_label = '2015'").run());
  t.after(site.close);
  assert.match(await site.html('/story'), /Edited chapter title/);
});
```

Create `tests/e2e/story.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('the line draws and the owl travels as you scroll', async ({ page }) => {
  await page.goto('/story');
  const progress = page.locator('[data-timeline-progress]');
  const scale = () => progress.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).d);
  const owlY = () => page.locator('[data-timeline-owl]').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).f);
  const startScale = await scale();
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-timeline]')!;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2 - window.innerHeight * 0.6);
  });
  await page.waitForTimeout(400);
  expect(await scale()).toBeGreaterThan(startScale + 0.2);
  expect(await owlY()).toBeGreaterThan(100);
});

test('every chapter is readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/story');
  const chapters = page.locator('li.chapter');
  await expect(chapters).toHaveCount(14);
  const hidden = await chapters.evaluateAll(els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  expect(hidden).toBe(0);
  const scale = await page.locator('[data-timeline-progress]').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).d);
  expect(scale).toBe(1);
});

test('the sticky year follows the reader on phones', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/story');
  await page.locator('li.chapter[data-year="2018"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-timeline-now]')).toHaveText('2018', { timeout: 3000 });
});
```

In `tests/e2e/pages.ts`, set:

```ts
export const PAGES = ['/', '/story', '/does-not-exist'];
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test` then `npm run test:e2e -- tests/e2e/story.spec.ts`
Expected: FAIL — `/story` returns 404.

- [ ] **Step 3: Create `src/components/Timeline.astro`**

```astro
---
import Picture from './Picture.astro';
import Owl from './Owl.astro';
type Chapter = { id: number; yearLabel: string; title: string; story: string; statValue: string; statLabel: string; media: { src: string; alt: string }[]; sourceUrl: string };
interface Props { chapters: Chapter[]; variant: 'full' | 'teaser' }
const { chapters, variant } = Astro.props;
const full = variant === 'full';
---
<div class:list={['timeline', `timeline--${variant}`]} data-timeline={full ? '' : undefined}>
  {full && <p class="timeline-now" data-timeline-now aria-hidden="true">{chapters[0]?.yearLabel}</p>}
  <div class="timeline-rail" aria-hidden="true">
    <div class="timeline-progress" data-timeline-progress></div>
    {full && <div class="timeline-owl" data-timeline-owl><Owl size="100%" badge idle={false} /></div>}
  </div>
  <ol class="timeline-list" data-reveal={full ? undefined : 'group'}>
    {chapters.map(chapter => (
      <li class="chapter" data-year={chapter.yearLabel} data-reveal={full ? '' : undefined} data-reveal-item={full ? undefined : ''}>
        <p class="chapter-year">{chapter.yearLabel}</p>
        <h3 class="chapter-title">{chapter.title}</h3>
        {full && chapter.story && <p class="chapter-story">{chapter.story}</p>}
        {full && chapter.statValue && <p class="chapter-stat"><strong>{chapter.statValue}</strong> {chapter.statLabel}</p>}
        {chapter.media.length > 0 && (
          <div class="chapter-media">
            {chapter.media.slice(0, full ? 3 : 1).map(m => <Picture base={m.src} alt={m.alt} sizes={full ? '(min-width: 900px) 18rem, 80vw' : '(min-width: 900px) 16rem, 80vw'} />)}
          </div>
        )}
        {full && chapter.sourceUrl && <a class="link-arrow" href={chapter.sourceUrl} target="_blank" rel="noopener">Read the coverage</a>}
      </li>
    ))}
  </ol>
</div>
<style>
  .timeline { position: relative; --rail-x: 1.25rem; }
  .timeline-rail { position: absolute; top: 0.5rem; bottom: 0; left: var(--rail-x); width: 4px; margin-left: -2px; border-radius: 4px; background: var(--line); }
  .timeline-progress { position: absolute; inset: 0; border-radius: inherit; background: var(--purple); transform-origin: top; }
  .timeline-owl { position: absolute; top: 0; left: 50%; width: 2.75rem; margin-left: -1.375rem; z-index: 2; will-change: transform; }
  .timeline-now { display: none; }
  .timeline-list { list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(3rem, 2rem + 4vw, 6rem); }
  .chapter { position: relative; padding-left: calc(var(--rail-x) + 2.25rem); }
  .chapter::before { content: ''; position: absolute; left: calc(var(--rail-x) - 9px); top: 0.6rem; width: 18px; height: 18px; border-radius: 50%; background: var(--white); border: 4px solid var(--purple); }
  .chapter-year { font-size: var(--step-3); font-weight: 800; line-height: 1; color: var(--purple); }
  .chapter-title { margin-top: 0.5rem; font-size: var(--step-2); font-weight: 700; }
  .chapter-story { margin-top: 0.75rem; max-width: 36rem; color: var(--ink-soft); }
  .chapter-stat { display: inline-flex; align-items: baseline; gap: 0.4rem; margin-top: 0.9rem; padding: 0.35rem 0.9rem; border-radius: 999px; background: var(--purple-tint); }
  .chapter-stat strong { font-size: var(--step-1); color: var(--purple); }
  .chapter-media { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); gap: 0.75rem; margin-top: 1.25rem; }
  .chapter-media :global(img) { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius-sm); background: var(--purple-tint); }
  .chapter .link-arrow { margin-top: 0.5rem; }

  .timeline--full .chapter:last-child .chapter-year { color: var(--purple-300); }
  :global(.js) .timeline-now { display: block; position: sticky; top: calc(var(--header-h) + 0.5rem); z-index: 3; width: max-content; margin: 0 0 1rem auto; padding: 0.3rem 0.9rem; border-radius: 999px; background: var(--purple); color: var(--white); font-weight: 700; }

  .timeline--teaser .chapter-title { font-size: var(--step-1); }
  .timeline--teaser .chapter-media :global(img) { aspect-ratio: 16 / 10; }

  @media (min-width: 900px) {
    :global(.js) .timeline-now { display: none; }
    .timeline--full { --rail-x: 50%; }
    .timeline--full .timeline-owl { width: 3.5rem; margin-left: -1.75rem; }
    .timeline--full .chapter { width: 50%; padding-left: 0; padding-right: 4rem; }
    .timeline--full .chapter::before { left: auto; right: -9px; }
    .timeline--full .chapter:nth-child(even) { margin-left: 50%; padding-left: 4rem; padding-right: 0; }
    .timeline--full .chapter:nth-child(even)::before { left: -9px; right: auto; }

    .timeline--teaser .timeline-rail { top: 0.95rem; bottom: auto; left: 0; right: 0; width: auto; height: 4px; margin: 0; }
    .timeline--teaser .timeline-list { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2rem; }
    .timeline--teaser .chapter { padding: 3rem 0 0; }
    .timeline--teaser .chapter::before { top: 0.4rem; left: 0; }
  }
</style>
```

- [ ] **Step 4: Create `src/components/GrowthChart.astro`**

```astro
---
type GrowthPoint = { year: number; students: number; studentsLabel: string; centres: number };
interface Props { points: GrowthPoint[] }
const { points } = Astro.props;
const max = Math.max(...points.map(p => p.students), 1);
---
<figure class="growth">
  <table class="sr-only">
    <caption>Students and centres by year</caption>
    <thead><tr><th scope="col">Year</th><th scope="col">Students</th><th scope="col">Centres</th></tr></thead>
    <tbody>{points.map(p => <tr><th scope="row">{p.year}</th><td>{p.studentsLabel}</td><td>{p.centres}</td></tr>)}</tbody>
  </table>
  <ol class="bars" aria-hidden="true" data-reveal="group">
    {points.map(p => (
      <li class="row" data-reveal-item>
        <span class="year">{p.year}</span>
        <span class="track"><span class="bar" style={`width:${Math.max((p.students / max) * 100, 1.5)}%`}></span></span>
        <span class="value">{p.studentsLabel}</span>
        <span class="centres">{p.centres} {p.centres === 1 ? 'centre' : 'centres'}</span>
      </li>
    ))}
  </ol>
  <figcaption>Students as reported by Smartup. From 2020, branches were consolidated into 9 centres.</figcaption>
</figure>
<style>
  .bars { list-style: none; padding: 0; display: grid; gap: 1rem; }
  .row { display: grid; grid-template-columns: 3.25rem 1fr auto; align-items: center; column-gap: 0.75rem; }
  .year { font-weight: 700; color: var(--purple); font-variant-numeric: tabular-nums; }
  .track { height: 0.9rem; border-radius: 999px; background: var(--purple-tint); overflow: hidden; }
  .bar { display: block; height: 100%; border-radius: inherit; background: var(--purple); }
  .value { font-weight: 700; font-variant-numeric: tabular-nums; }
  .centres { grid-column: 2 / -1; font-size: var(--step--1); color: var(--ink-soft); }
  figcaption { margin-top: 1.5rem; font-size: var(--step--1); color: var(--ink-soft); }
</style>
```

- [ ] **Step 5: Create `src/scripts/timeline.ts`**

```ts
import { inView, scroll } from 'motion';
import { blink, glance, rollHead } from './motion';

export function initTimelines() {
  document.querySelectorAll<HTMLElement>('[data-timeline]').forEach(timeline => {
    const rail = timeline.querySelector<HTMLElement>('.timeline-rail');
    const bar = timeline.querySelector<HTMLElement>('[data-timeline-progress]');
    const owl = timeline.querySelector<HTMLElement>('[data-timeline-owl]');
    const owlSvg = owl?.querySelector('svg');
    const now = timeline.querySelector<HTMLElement>('[data-timeline-now]');
    if (!rail || !bar) return;

    let travel = 0;
    const measure = () => { travel = rail.clientHeight - (owl?.offsetHeight ?? 0); };
    measure();
    new ResizeObserver(measure).observe(timeline);
    // Start undrawn; without this script the CSS default keeps the line fully drawn.
    bar.style.transform = 'scaleY(0)';

    scroll((progress: number) => {
      bar.style.transform = `scaleY(${progress})`;
      if (owl) owl.style.transform = `translateY(${progress * travel}px)`;
    }, { target: timeline, offset: ['start 60%', 'end 60%'] });

    const chapters = Array.from(timeline.querySelectorAll<HTMLElement>('li.chapter'));
    chapters.forEach((chapter, index) => {
      inView(chapter, () => {
        if (now) now.textContent = chapter.dataset.year ?? '';
        if (owlSvg) {
          if (index === chapters.length - 1) rollHead(owlSvg);
          else { glance(owlSvg, index % 2 === 0 ? -1 : 1); blink(owlSvg); }
        }
        return () => {};
      // A band across the middle of the screen, so chapters taller than the screen still trigger.
      }, { margin: '-45% 0px -50% 0px' });
    });
  });
}
```

Add the import and call to `src/scripts/site.ts`, so the file reads:

```ts
import { initMenu } from './menu';
import { initMotion } from './motion';
import { initTimelines } from './timeline';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
initMotion(reduceMotion);
// Reduced motion keeps the line fully drawn (CSS default) and the owl still.
if (!reduceMotion) initTimelines();
(window as unknown as { __siteReady: boolean }).__siteReady = true;
```

- [ ] **Step 6: Create `src/pages/story.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import SectionHead from '../components/SectionHead.astro';
import Timeline from '../components/Timeline.astro';
import GrowthChart from '../components/GrowthChart.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const chapters = store.timeline();
const growth = store.growth();
const vision = store.settings().vision;
const first = growth[0];
const latest = growth.at(-1);
---
<Base title="Our Story" description="How Smartup grew from one classroom in Kochi in 2014 to more than 30,000 students — and where we're going next." page="story">
  <section class="section section--cream story-hero">
    <div class="container">
      <p class="eyebrow">Our Story</p>
      <h1>From one classroom to <span class="marker">{latest?.studentsLabel} students</span></h1>
      {first && latest && <p class="lead">Smartup began in {first.year} with {first.studentsLabel} students in a single centre in Kochi. Today more than {latest.studentsLabel} students have learned with us, online and at {latest.centres} centres.</p>}
    </div>
  </section>

  <section class="section" aria-labelledby="journey">
    <div class="container">
      <SectionHead eyebrow="The journey" title="Twelve years, year by year" id="journey" />
      <Timeline chapters={chapters} variant="full" />
    </div>
  </section>

  {growth.length > 0 && (
    <section class="section section--cream" aria-labelledby="growth">
      <div class="container narrow">
        <SectionHead eyebrow="Growth" title="Growth in students and centres" id="growth" />
        <GrowthChart points={growth} />
      </div>
    </section>
  )}

  <section class="section section--purple" aria-labelledby="vision">
    <div class="container">
      <SectionHead eyebrow="Vision for the future" title={vision.title} intro={vision.tagline} id="vision" />
      <div class="vision-text" data-reveal>{vision.text.map((p: string) => <p>{p}</p>)}</div>
      <ul class="priorities" data-reveal="group">
        {vision.priorities.map((p: { title: string; text: string }) => <li data-reveal-item><h3>{p.title}</h3><p>{p.text}</p></li>)}
      </ul>
      <p class="vision-2030" data-reveal>{vision.vision2030}</p>
    </div>
  </section>

  <section class="section">
    <div class="container cta">
      <h2>See where your story could start</h2>
      <div class="actions"><a class="btn btn--primary" href="/demo">Book a free demo class</a><a class="btn btn--ghost" href="/founders">Meet the founders</a></div>
    </div>
  </section>
</Base>
<style>
  .story-hero .container { display: grid; gap: 1.25rem; max-width: 56rem; margin-inline: auto; }
  h1 { font-size: var(--step-5); font-weight: 800; letter-spacing: -0.03em; }
  .lead { font-size: var(--step-1); color: var(--ink-soft); max-width: 40rem; }
  .narrow { max-width: 48rem; }
  .vision-text { display: grid; gap: 1rem; max-width: 46rem; font-size: var(--step-1); color: var(--on-purple-soft); }
  .priorities { list-style: none; padding: 0; margin-top: 2.5rem; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); }
  .priorities li { padding: 1.4rem; border-radius: var(--radius); background: var(--purple-600); }
  .priorities h3 { font-size: var(--step-1); color: var(--white); }
  .priorities p { margin-top: 0.5rem; color: var(--on-purple-soft); }
  .vision-2030 { margin-top: 2.5rem; padding-left: 1rem; border-left: 4px solid var(--yellow); font-size: var(--step-1); font-weight: 600; color: var(--white); max-width: 46rem; }
  .cta { display: grid; gap: 1.5rem; justify-items: start; }
  .cta h2 { font-size: var(--step-4); font-weight: 800; max-width: 30rem; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
</style>
```

- [ ] **Step 7: Run all tests**

Run: `npm test && npm run test:e2e`
Expected: PASS, including the 360px overflow check on `/story`.

- [ ] **Step 8: Check it by eye**

On a 375px window and on desktop, scroll `/story` slowly. The purple line should draw behind the reader, the owl ride the line and look toward each chapter, the year pill (phone only) track the chapter, and the owl roll its head once at "Next". Photos must not be stretched.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Build the Our Story timeline with scroll-drawn line and travelling owl

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Homepage — hero, about and founders

**Files:**
- Create: `src/components/Hero.astro`, `src/components/FounderCard.astro`, `tests/e2e/home.spec.ts`
- Modify: `src/pages/index.astro`, `tests/pages.test.mjs`

**Interfaces:**
- Consumes: `settings()`, `stats()`, `timeline({ featured: true })`, `leaders()` (Task 2); `Owl`, `Stats` (Task 5); `Timeline` (Task 6); `Picture`, `SectionHead` (Task 4).
- Produces: `Hero.astro` props `{ headline: string; highlight: string; description: string; stats: Stat[] }`; `FounderCard.astro` props `{ leader: Leader }`. Homepage section ids, in order: `about`, `founders` (Task 8 adds `results`, `feedback`, `alumni`, `courses`, `careers`).

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('hero leads with the trust headline and the demo action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make parents proud');
  await expect(page.locator('.hero').getByRole('link', { name: 'Book free demo' })).toHaveAttribute('href', '/demo');
  await expect(page.locator('.hero').getByRole('link', { name: 'Our story' })).toHaveAttribute('href', '/story');
});

test('about shows four featured chapters and links to the story', async ({ page }) => {
  await page.goto('/');
  const about = page.locator('#about');
  await expect(about.locator('li.chapter')).toHaveCount(4);
  await expect(about.getByRole('link', { name: 'Read our story' })).toHaveAttribute('href', '/story');
});

test('founders appear in the client order with photos', async ({ page }) => {
  await page.goto('/');
  const names = page.locator('#founders .founder-name');
  await expect(names).toHaveText(['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']);
  await expect(page.locator('#founders img')).toHaveCount(4);
});
```

Append to `tests/pages.test.mjs`:

```js
test('homepage sections follow the client order so far', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  const ids = [...page.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 2), ['about', 'founders']);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test` then `npm run test:e2e -- tests/e2e/home.spec.ts`
Expected: FAIL — no `#about` or `#founders`, and the h1 is missing.

- [ ] **Step 3: Create `src/components/Hero.astro`**

```astro
---
import Owl from './Owl.astro';
import Stats from './Stats.astro';
interface Props { headline: string; highlight: string; description: string; stats: { value: string; label: string; source: string }[] }
const { headline, highlight, description, stats } = Astro.props;
---
<section class="hero section--purple" aria-labelledby="hero-title">
  <div class="container hero-inner">
    <div class="copy">
      <h1 id="hero-title">{headline} <span class="marker">{highlight}</span></h1>
      <p class="description">{description}</p>
      <div class="actions">
        <a class="btn btn--yellow" href="/demo">Book free demo</a>
        <a class="btn btn--ghost" href="/story">Our story</a>
      </div>
    </div>
    <Owl class="hero-owl" size="clamp(5rem, 3.5rem + 9vw, 12rem)" badge label="Smartup owl" />
    <div class="proof"><Stats stats={stats} tone="dark" /></div>
  </div>
</section>
<style>
  .hero { position: relative; overflow: hidden; padding-block: clamp(3rem, 2rem + 5vw, 6.5rem) clamp(2.5rem, 2rem + 3vw, 4rem); }
  .hero::before, .hero::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
  .hero::before { width: min(70vw, 34rem); aspect-ratio: 1; right: -12%; top: -30%; background: var(--purple-600); }
  .hero::after { width: min(40vw, 20rem); aspect-ratio: 1; left: 38%; bottom: -35%; background: var(--purple-900); }
  .hero-inner { position: relative; z-index: 1; display: grid; gap: 2rem; grid-template-columns: 1fr auto; align-items: start; }
  .copy { display: grid; gap: 1.25rem; grid-row: 1; grid-column: 1; }
  h1 { font-size: var(--step-5); font-weight: 800; letter-spacing: -0.03em; color: var(--white); }
  .description { font-size: var(--step-1); color: var(--on-purple-soft); }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .actions .btn--ghost { color: var(--white); }
  :global(.hero-owl) { grid-row: 1; grid-column: 2; justify-self: end; }
  .proof { grid-column: 1 / -1; margin-top: clamp(1rem, 0.5rem + 3vw, 3rem); padding-top: 1.75rem; border-top: 1px solid rgb(244 238 228 / 0.25); }
  @media (max-width: 599px) {
    :global(.hero-owl) { grid-row: 1; grid-column: 1 / -1; justify-self: start; }
    .copy { grid-row: 2; grid-column: 1 / -1; }
  }
</style>
```

- [ ] **Step 4: Create `src/components/FounderCard.astro`**

```astro
---
import Picture from './Picture.astro';
interface Props { leader: { name: string; role: string; summary: string; photo: string; photoAlt: string } }
const { leader } = Astro.props;
---
<article class="founder" data-reveal-item>
  {leader.photo && <div class="photo"><Picture base={leader.photo} alt={leader.photoAlt} sizes="(min-width: 900px) 17rem, 72vw" /></div>}
  <h3 class="founder-name">{leader.name}</h3>
  <p class="role">{leader.role}</p>
  <p class="summary">{leader.summary}</p>
</article>
<style>
  .founder { display: grid; gap: 0.4rem; align-content: start; }
  .photo { margin-bottom: 0.75rem; border-radius: var(--radius); overflow: hidden; background: var(--purple-tint); }
  .photo :global(img) { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; object-position: center 22%; }
  .founder-name { font-size: var(--step-1); font-weight: 700; }
  .role { font-weight: 600; color: var(--purple); }
  .summary { color: var(--ink-soft); font-size: var(--step--1); }
</style>
```

- [ ] **Step 5: Replace `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHead from '../components/SectionHead.astro';
import Timeline from '../components/Timeline.astro';
import FounderCard from '../components/FounderCard.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const stats = store.stats();
const chapters = store.timeline({ featured: true });
const leaders = store.leaders();
---
<Base description="Smartup tuitions in Kochi and online for CBSE and State Board students, classes 8 to +2. 12+ years, 9 centres, 30,000+ students." page="home">
  <Hero headline={settings.heroHeadline} highlight={settings.heroHighlight} description={settings.heroDescription} stats={stats} />

  <section id="about" class="section section--cream" aria-labelledby="about-title">
    <div class="container">
      <SectionHead eyebrow="About Smartup" title={settings.aboutTitle} intro={settings.aboutText} id="about-title" />
      {chapters.length > 0 && <Timeline chapters={chapters} variant="teaser" />}
      <p class="more"><a class="link-arrow" href="/story">Read our story</a></p>
    </div>
  </section>

  {leaders.length > 0 && (
    <section id="founders" class="section" aria-labelledby="founders-title">
      <div class="container">
        <SectionHead eyebrow="The founders" title="The people behind Smartup" id="founders-title" link={{ href: '/founders', label: 'Meet the founders' }} />
        <div class="founders rail" data-reveal="group">
          {leaders.map(leader => <FounderCard leader={leader} />)}
        </div>
      </div>
    </section>
  )}
</Base>
<style>
  .more { margin-top: 2.5rem; }
  @media (min-width: 900px) {
    .founders { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: visible; gap: 1.75rem; }
  }
</style>
```

- [ ] **Step 6: Run all tests**

Run: `npm test && npm run test:e2e`
Expected: PASS. (`motion.spec.ts` still finds `.stats` — now inside the hero.)

- [ ] **Step 7: Check it by eye**

At 375px: owl badge above the headline; "Make parents **proud**" with the yellow marker; both buttons fit on one or two lines; the four stats in a 2×2 grid; founder cards swipe sideways with the next card peeking. At desktop: owl top-right, stats in one row, founders in four columns, faces not cropped off.

- [ ] **Step 8: Commit**

```bash
git add src tests
git commit -m "Build homepage hero, about teaser and founders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Homepage — results, feedback, alumni, courses, careers and demo band

**Files:**
- Create: `src/components/ResultCard.astro`, `src/components/VideoCard.astro`, `src/components/CourseTabs.astro`, `src/components/JobsPreview.astro`, `src/components/DemoBand.astro`, `src/data/courses.ts`, `src/scripts/tabs.ts`, `src/scripts/video.ts`
- Modify: `src/pages/index.astro`, `src/scripts/site.ts`, `tests/pages.test.mjs`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `results({ featured: true })`, `testimonials('feedback' | 'alumni')`, `jobs()`, `centres()` (Task 2); `.rail`, `SectionHead`, `Picture` (Task 4).
- Produces: `courseBoards` from `src/data/courses.ts`; `initTabs()` (ARIA tabs on `[data-tabs]`); `initVideos()` (pauses other `video[data-exclusive]` when one plays). Final homepage section order: `about`, `founders`, `results`, `feedback`, `alumni`, `courses`, `careers`, then the demo band.

- [ ] **Step 1: Write the failing tests**

Replace the last test in `tests/pages.test.mjs` (`homepage sections follow the client order so far`) with:

```js
test('homepage sections follow the client order', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  const ids = [...page.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['about', 'founders', 'results', 'feedback', 'alumni', 'courses', 'careers']);
});

test('sections with no published content are left out, heading and all', async t => {
  const site = await start(content => {
    content.db.exec("UPDATE testimonials SET published = 0; UPDATE jobs SET published = 0; UPDATE results SET published = 0;");
  });
  t.after(site.close);
  const page = await site.html('/');
  for (const id of ['results', 'feedback', 'alumni', 'careers']) assert.doesNotMatch(page, new RegExp(`id="${id}"`), id);
  assert.match(page, /id="courses"/);
});

test('results always name exam and year', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  assert.match(page, /SSLC · 2026/);
  assert.match(page, /Class 10 · 2026/);
});
```

Append to `tests/e2e/home.spec.ts`:

```ts
test('videos never download before a tap', async ({ page }) => {
  await page.goto('/');
  const videos = page.locator('video');
  await expect(videos).toHaveCount(6);
  for (const video of await videos.all()) {
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('poster', /-poster\.webp$/);
  }
});

test('images below the hero load lazily', async ({ page }) => {
  await page.goto('/');
  const eager = await page.locator('main img:not([data-priority])').evaluateAll(imgs => imgs.filter(i => i.getAttribute('loading') !== 'lazy').length);
  expect(eager).toBe(0);
});

test('course tabs switch boards with the keyboard', async ({ page }) => {
  await page.goto('/');
  const cbse = page.getByRole('tab', { name: 'CBSE' });
  const state = page.getByRole('tab', { name: 'State Board' });
  await expect(cbse).toHaveAttribute('aria-selected', 'true');
  await cbse.focus();
  await page.keyboard.press('ArrowRight');
  await expect(state).toHaveAttribute('aria-selected', 'true');
  await expect(state).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'State Board' })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'CBSE' })).toBeHidden();
});

test('without JavaScript both boards are readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByText('Smartup Pro')).toBeVisible();
  await expect(page.getByText('State Board programme', { exact: true }).first()).toBeVisible();
  await context.close();
});

test('careers preview lists openings and links to all of them', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#careers .job')).toHaveCount(6);
  await expect(page.locator('#careers').getByRole('link', { name: 'See all 12 openings' })).toHaveAttribute('href', '/careers');
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test` then `npm run test:e2e -- tests/e2e/home.spec.ts`
Expected: FAIL — sections `results` to `careers` are missing.

- [ ] **Step 3: Create the course data**

Create `src/data/courses.ts` (wording copied from the v1 site, which came from the client's course PDFs):

```ts
export type Programme = { eyebrow: string; ratio: string; name: string; points: string[]; ask: string };
export type Board = { id: string; label: string; heading: string; programmes: Programme[] };

export const courseBoards: Board[] = [
  {
    id: 'cbse', label: 'CBSE', heading: 'CBSE online programmes',
    programmes: [
      { eyebrow: 'Personal attention', ratio: '1:1', name: 'Smartup Pro', points: ['Student diagnosis & learning plan', 'Mentorship and counselling', 'Monthly parent meetings'], ask: 'Ask about Pro' },
      { eyebrow: 'Learn together', ratio: '1:3', name: 'Smartup Trio', points: ['Three-student learning format', 'Mentorship and regular evaluations', 'Parent meetings every two months'], ask: 'Ask about Trio' },
      { eyebrow: 'Shared momentum', ratio: 'Micro', name: 'Smartup Power', points: ['Competency-based learning', 'Daily, weekly & monthly evaluations', 'Quarterly parent meetings'], ask: 'Ask about Power' },
    ],
  },
  {
    id: 'state', label: 'State Board', heading: 'State Board programme',
    programmes: [
      { eyebrow: 'State Board', ratio: 'Online', name: 'State Board programme', points: ['Concepts taught through board-style questions', 'Daily practice, SCERT exercises and doubt support', 'Regular assessments and focused exam revision'], ask: 'Ask about State Board' },
    ],
  },
];
```

- [ ] **Step 4: Create the cards and the tabs**

Create `src/components/ResultCard.astro`:

```astro
---
import Picture from './Picture.astro';
interface Props { result: { year: string; exam: string; headline: string; detail: string; poster: string; posterAlt: string } }
const { result } = Astro.props;
---
<article class="result" data-reveal-item>
  {result.poster && <div class="poster"><Picture base={result.poster} alt={result.posterAlt} sizes="(min-width: 900px) 18rem, 78vw" /></div>}
  <p class="meta">{result.exam} · {result.year}</p>
  <h3>{result.headline}</h3>
  {result.detail && <p class="detail">{result.detail}</p>}
</article>
<style>
  .result { display: grid; gap: 0.35rem; align-content: start; padding: 0.75rem 0.75rem 1.25rem; border-radius: var(--radius); background: var(--white); }
  .poster { margin-bottom: 0.6rem; border-radius: var(--radius-sm); overflow: hidden; background: var(--purple-tint); }
  .poster :global(img) { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; object-position: top; }
  .meta { padding-inline: 0.25rem; font-size: var(--step--1); font-weight: 600; color: var(--purple); }
  h3 { padding-inline: 0.25rem; font-size: var(--step-1); font-weight: 700; }
  .detail { padding-inline: 0.25rem; color: var(--ink-soft); font-size: var(--step--1); }
</style>
```

Create `src/components/VideoCard.astro`:

```astro
---
interface Props { item: { title: string; video: string; poster: string } }
const { item } = Astro.props;
---
<figure class="video-card" data-reveal-item>
  <video controls playsinline preload="none" poster={item.poster} data-exclusive>
    <source src={item.video} type="video/mp4" />
  </video>
  <figcaption>{item.title}</figcaption>
</figure>
<style>
  .video-card { display: grid; gap: 0.75rem; }
  video { width: 100%; aspect-ratio: 9 / 16; object-fit: cover; border-radius: var(--radius); background: var(--purple-900); }
  figcaption { font-weight: 600; }
</style>
```

Create `src/components/CourseTabs.astro`:

```astro
---
import { courseBoards } from '../data/courses';
interface Props { centreCount: number; hours: string }
const { centreCount, hours } = Astro.props;
---
<div class="courses" data-tabs>
  <div class="tablist" role="tablist" aria-label="Board" hidden>
    {courseBoards.map(board => <button type="button" role="tab" id={`tab-${board.id}`} aria-controls={`panel-${board.id}`} aria-selected="false" tabindex="-1">{board.label}</button>)}
  </div>
  {courseBoards.map(board => (
    <div class="panel" id={`panel-${board.id}`} role="tabpanel" aria-labelledby={`tab-${board.id}`}>
      <h3 class="board-heading">{board.heading}</h3>
      <div class="programmes rail">
        {board.programmes.map(p => (
          <article class="programme">
            <p class="eyebrow">{p.eyebrow}</p>
            <p class="ratio">{p.ratio}</p>
            <h4>{p.name}</h4>
            <ul>{p.points.map(point => <li>{point}</li>)}</ul>
            <a class="link-arrow" href="/demo">{p.ask}</a>
          </article>
        ))}
      </div>
    </div>
  ))}
  <p class="offline"><strong>Online or offline.</strong> Learn from home, or at one of our {centreCount} centres in Kochi, open {hours}.</p>
</div>
<style>
  .tablist { display: inline-flex; gap: 0.25rem; padding: 0.3rem; margin-bottom: 1.75rem; border-radius: 999px; background: var(--white); }
  [role='tab'] { min-height: 44px; padding: 0.5rem 1.25rem; border: 0; border-radius: 999px; background: transparent; font: 600 1rem var(--font); color: var(--ink); cursor: pointer; }
  [role='tab'][aria-selected='true'] { background: var(--purple); color: var(--white); }
  .panel + .panel { margin-top: 2.5rem; }
  :global(.js) .panel + .panel { margin-top: 0; }
  .board-heading { margin-bottom: 1rem; font-size: var(--step-2); }
  .programme { display: grid; gap: 0.5rem; align-content: start; padding: 1.5rem; border-radius: var(--radius); background: var(--white); }
  .ratio { font-size: var(--step-4); font-weight: 800; color: var(--purple); line-height: 1; }
  h4 { font-size: var(--step-1); }
  ul { padding-left: 1.1rem; display: grid; gap: 0.3rem; color: var(--ink-soft); }
  .offline { margin-top: 2rem; max-width: 40rem; }
  @media (min-width: 900px) { .programmes { grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: visible; } }
</style>
```

Create `src/components/JobsPreview.astro`:

```astro
---
interface Props { jobs: { title: string; type: string; location: string }[] }
const { jobs } = Astro.props;
---
<ul class="jobs" data-reveal="group">
  {jobs.slice(0, 6).map(job => (
    <li class="job" data-reveal-item>
      <span class="type">{job.type}</span>
      <span class="title">{job.title}</span>
      {job.location && <span class="location">{job.location}</span>}
    </li>
  ))}
</ul>
<a class="link-arrow" href="/careers">See all {jobs.length} openings</a>
<style>
  .jobs { list-style: none; padding: 0; display: grid; gap: 0.75rem; margin-bottom: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
  .job { display: grid; gap: 0.2rem; padding: 1.1rem 1.25rem; border: 1px solid var(--line); border-radius: var(--radius-sm); }
  .type { font-size: var(--step--1); font-weight: 600; color: var(--purple); }
  .title { font-weight: 700; }
  .location { font-size: var(--step--1); color: var(--ink-soft); }
</style>
```

Create `src/components/DemoBand.astro`:

```astro
---
---
<section class="demo section--purple" aria-labelledby="demo-title">
  <div class="container inner" data-reveal>
    <h2 id="demo-title">See Smartup for yourself</h2>
    <p>Join a free demo class, online or at a centre near you.</p>
    <div class="actions"><a class="btn btn--yellow" href="/demo">Book a free demo class</a><a class="btn btn--ghost" href="/contact">Find a centre</a></div>
  </div>
</section>
<style>
  .demo { padding-block: clamp(3.5rem, 2.5rem + 4vw, 6rem); }
  .inner { display: grid; gap: 1rem; justify-items: start; }
  h2 { font-size: var(--step-4); font-weight: 800; color: var(--white); }
  p { font-size: var(--step-1); color: var(--on-purple-soft); }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
  .actions .btn--ghost { color: var(--white); }
</style>
```

- [ ] **Step 5: Add the tab and video scripts**

Create `src/scripts/tabs.ts`:

```ts
export function initTabs() {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(root => {
    const list = root.querySelector<HTMLElement>('[role="tablist"]');
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls') ?? ''));
    if (!list || tabs.length === 0 || panels.some(p => !p)) return;
    list.hidden = false;
    const select = (index: number, focus = false) => tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i]!.hidden = !on;
      if (on && focus) tab.focus();
    });
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next, true);
      });
    });
    select(0);
  });
}
```

Create `src/scripts/video.ts`:

```ts
export function initVideos() {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-exclusive]'));
  videos.forEach(video => video.addEventListener('play', () => videos.forEach(other => { if (other !== video) other.pause(); })));
}
```

Replace `src/scripts/site.ts`:

```ts
import { initMenu } from './menu';
import { initMotion } from './motion';
import { initTimelines } from './timeline';
import { initTabs } from './tabs';
import { initVideos } from './video';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
initTabs();
initVideos();
initMotion(reduceMotion);
// Reduced motion keeps the line fully drawn (CSS default) and the owl still.
if (!reduceMotion) initTimelines();
(window as unknown as { __siteReady: boolean }).__siteReady = true;
```

- [ ] **Step 6: Add the sections to `src/pages/index.astro`**

Add to the frontmatter imports and data:

```astro
import ResultCard from '../components/ResultCard.astro';
import VideoCard from '../components/VideoCard.astro';
import CourseTabs from '../components/CourseTabs.astro';
import JobsPreview from '../components/JobsPreview.astro';
import DemoBand from '../components/DemoBand.astro';
```

```ts
const results = store.results({ featured: true });
const feedback = store.testimonials('feedback');
const alumni = store.testimonials('alumni');
const jobs = store.jobs();
const centres = store.centres();
```

Insert after the founders section, before `</Base>`:

```astro
  {results.length > 0 && (
    <section id="results" class="section section--cream" aria-labelledby="results-title">
      <div class="container">
        <SectionHead eyebrow="Results" title="Results our students earned" intro="Every figure names its exam and year." id="results-title" link={{ href: '/results', label: 'See all results' }} />
        <div class="rail" data-reveal="group" tabindex="0" role="region" aria-label="Result highlights">
          {results.map(result => <ResultCard result={result} />)}
        </div>
      </div>
    </section>
  )}

  {feedback.length > 0 && (
    <section id="feedback" class="section" aria-labelledby="feedback-title">
      <div class="container">
        <SectionHead eyebrow="Student & parent feedback" title="In their own words" id="feedback-title" link={{ href: '/testimonials', label: 'More testimonials' }} />
        <div class="rail videos" data-reveal="group" tabindex="0" role="region" aria-label="Student and parent videos">
          {feedback.map(item => <VideoCard item={item} />)}
        </div>
      </div>
    </section>
  )}

  {alumni.length > 0 && (
    <section id="alumni" class="section section--deep" aria-labelledby="alumni-title">
      <div class="container">
        <SectionHead eyebrow="Alumni" title="Where Smartup students go" id="alumni-title" link={{ href: '/alumni', label: 'Alumni journeys' }} />
        <div class="rail videos" data-reveal="group" tabindex="0" role="region" aria-label="Alumni videos">
          {alumni.map(item => <VideoCard item={item} />)}
        </div>
      </div>
    </section>
  )}

  <section id="courses" class="section section--cream" aria-labelledby="courses-title">
    <div class="container">
      <SectionHead eyebrow="Course details" title="Programmes for CBSE and State Board" id="courses-title" link={{ href: '/courses', label: 'All course details' }} />
      <CourseTabs centreCount={centres.length} hours={settings.hours} />
    </div>
  </section>

  {jobs.length > 0 && (
    <section id="careers" class="section" aria-labelledby="careers-title">
      <div class="container">
        <SectionHead eyebrow="Career opportunities" title="Teach with Smartup" intro="We're hiring teachers, teaching assistants and mentors across our centres." id="careers-title" />
        <JobsPreview jobs={jobs} />
      </div>
    </section>
  )}

  <DemoBand />
```

Add to the page's `<style>` block:

```css
  .videos { grid-auto-columns: min(62%, 15rem); }
```

- [ ] **Step 7: Run every test**

Run: `npm run check && npm test && npm run test:e2e`
Expected: PASS on both projects.

- [ ] **Step 8: Check it by eye**

At 375px, scroll the whole homepage: results and videos swipe with the next card peeking, a video plays only after tapping and pauses when another starts, course tabs switch, careers list readable, demo band buttons stack neatly above the phone bar. Repeat at desktop width.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Complete the trust-first homepage: results, feedback, alumni, courses and careers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Phase 1 verification and handoff

**Files:**
- Modify: `README.md` (Preview section), `DESIGN.md` (append a v2 section)

**Interfaces:**
- Consumes: everything above. Produces: a verified Phase 1 on branch `v2-website`, ready for the Phase 2 plan.

- [ ] **Step 1: Run the full suite from clean**

```bash
rm -rf build tmp/e2e-data
npm run check && npm test && npm run test:e2e
```

Expected: all PASS.

- [ ] **Step 2: Measure mobile Lighthouse scores**

```bash
npm run build && (PORT=3000 node server.mjs & echo $! > tmp/server.pid)
npx --yes lighthouse http://localhost:3000/ --only-categories=performance,accessibility --output=json --output-path=tmp/lh-home.json --chrome-flags="--headless=new" --quiet
npx --yes lighthouse http://localhost:3000/story --only-categories=performance,accessibility --output=json --output-path=tmp/lh-story.json --chrome-flags="--headless=new" --quiet
kill "$(cat tmp/server.pid)"
node -e "for (const f of ['tmp/lh-home.json','tmp/lh-story.json']) { const r = JSON.parse(require('fs').readFileSync(f)); console.log(f, 'performance', Math.round(r.categories.performance.score*100), 'accessibility', Math.round(r.categories.accessibility.score*100), 'LCP', r.audits['largest-contentful-paint'].displayValue, 'CLS', r.audits['cumulative-layout-shift'].displayValue); }"
```

Expected: performance ≥ 90 and accessibility ≥ 95 on both pages; LCP < 2.5 s; CLS < 0.1. If a score falls short, fix the specific audits Lighthouse names (usually image sizes or contrast) before continuing.

- [ ] **Step 3: Update `README.md`**

Replace the `## Preview` section with:

```markdown
## Preview
Requires Node.js 24 (`nvm use 24`). Run `npm ci`, `npm run setup`, then `npm run build && npm start`; open http://localhost:3000. The v2 marketing site (Astro, `src/`) is served alongside Smartup Quest at `/assessment/` and its editor at `/assessment/admin/`.

- `npm run dev` — Astro dev server with live reload (content comes from `data/smartup.sqlite`).
- `npm test` — unit and server tests (builds first). `npm run test:e2e` — Playwright on phone and desktop.
- `npm run media` — re-fetch and re-encode photos and videos listed in `data-seed/media-sources.json` into `public/seed/`.
- `npm run content:reset` — local only: clear content tables so `data-seed/content.json` is re-seeded on next start.
```

- [ ] **Step 4: Append to `DESIGN.md`**

```markdown

## v2 (in progress, branch v2-website)
Mobile-first Astro site, Hybrid look: purple hero with yellow marker words, cream story sections, white content sections, deep-purple alumni band. Rubik only; logo only on white/cream; owl `#672aae` unchanged, shown on a cream badge over purple. The homepage is trust-first in the client's order (12 Oct 2026): About, Founders, Results, Student & parent feedback, Alumni, Course details, Career opportunities. Our Story is a vertical timeline whose line draws with scroll while the owl rides it, glancing and blinking per the brand animation guide, and rolling its head at "Next". Motion respects reduced motion and never hides content without JavaScript. Content lives in SQLite (`server/content-store.mjs`), seeded once per section from `data-seed/content.json`.
```

- [ ] **Step 5: Commit**

```bash
git add README.md DESIGN.md
git commit -m "Document the v2 preview workflow and design direction

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Hand off**

Report to the user, in plain language: what works (Home, Our Story, menu, footer, phone bar, animations), the Lighthouse scores, anything that fell short, and that Phase 2 (the remaining pages) is next. Do not deploy — v1 stays live until Phase 4.
