# Smartup v2 — Phase 2: The Remaining Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every remaining page in the site map — Founders, Faculty, Results, Life @ Smartup, Videos, Testimonials, Alumni, Courses, Blog, Ask Smartup, App, Community, Contact, Careers and an interim Demo page — from real client content, and clear the minor issues deferred from Phase 1.

**Architecture:** Same as Phase 1. New content types (faculty, events, videos, posts, FAQs, result kinds) are added to `ContentStore` and seeded from `data-seed/content.json`. Pages are server-rendered Astro pages built from a few new shared parts: `PageHero`, `FilterChips` (client-side filtering that degrades to "show all" without JavaScript), `YouTube` (click-to-load embed, no YouTube code until tapped) and a safe Markdown renderer for blog posts. Forms stay out of scope: Demo, Careers and Ask Smartup use call, WhatsApp and email actions until Phase 3.

**Tech Stack:** Node 24.3, Astro 7.3.8, @astrojs/node 11.1.7, motion 14.1.0, `node:sqlite`, sharp 0.35.5, Playwright 1.64.0, `node:test` (Node 24 imports `.ts` files directly via type stripping).

**Spec:** `docs/superpowers/specs/2026-10-08-smartup-v2-website-design.md` (Phase 1 plan: `docs/superpowers/plans/2026-10-13-smartup-v2-phase-1-foundation.md`)

## Decisions made while planning

- **Content sources.** Courses: client PDFs `SMARTUP CBSE.pdf` and `SMART UP ONLINE -STATE (NEW).pdf`. Company facts: `Smartup Web Brand and Company Basics.docx` and `website required data - section 1 ,4, 7.docx` (positioning, mission, legal name, registered office, extra phone numbers, LinkedIn). Faculty: the 35 photos in `Faculty Photos/FULL TIME STAFFS` (names and qualifications are in the file names). Results: transcribed from the client's result posters for 2023–2026 (names and scores read on 13 Oct 2026; Task 2 Step 9 re-checks them against the downloaded posters). Videos: the official channel `@smartupeducations` (listed 13 Oct 2026).
- **Starter blog posts.** The client has no posts yet. Three evergreen posts are drafted by the "Smartup Academic Team" so the blog launches with content; they must be approved by the client before launch (listed in the hand-off).
- **FAQ answers** are written only from the client documents above; they also go to the client for approval.
- **Interim actions until Phase 3 forms.** Demo: call or WhatsApp, or visit a centre. Careers: email `info@smartupedu.in` with the role in the subject, or call. Ask Smartup: call, WhatsApp or email.
- **YouTube** uses click-to-load embeds from `youtube-nocookie.com`; thumbnails come from `i.ytimg.com` and load lazily. Phase 4 updates the privacy page to mention them.
- **Faculty page is called "Our team"** because the folder includes non-teaching staff. Each person carries a display role and a filter group; people whose subject is not stated are shown as "Academic team".
- **Results with ambiguous posters are left out** (two SSLC 2026 posters whose badge and caption disagree, and one 2023 name that is not legible).
- **Class range stays "8 to +2"** (v1 wording) although one client document says "Grades 1–12"; flagged for the client in the hand-off.
- **Existing local databases** need `npm run content:reset` once, because the `results` seed changes. Production has no v2 content yet, so nothing else is affected.

## Global Constraints

(Unchanged from Phase 1 — every task's requirements include these.)

- Run every command from the repo root `Smartup classses/` after `source ~/.nvm/nvm.sh && nvm use 24`. Work on branch `v2-website`, never `main`. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Brand colours exactly: `#5f2ea8`, `#56269b`, `#392064`, `#9560d7`, `#f4eee4`, `#1e1e1e`, `#ffffff`; yellow `#ede60f` only for marker words, small badges and at most one yellow call-to-action per screen. Owl fill `#672aae`. Rubik only (self-hosted). Logo only on white/cream.
- Mobile-first: base 360px, breakpoints 600 / 900 / 1200px, no horizontal page scroll, tap targets ≥ 44px, body text ≥ 16px. English only; brand written "Smartup".
- Content visible without JavaScript; reduced motion disables movement; animate only `transform` and `opacity`.
- Marketing-page JavaScript ≤ 50 KB gzipped. Videos never auto-load. Every result names its exam and year.
- WhatsApp buttons stay hidden while `settings.whatsapp` is `null`.
- No third-party script runs before a user taps a video.

## Review Focus

1. **A page whose table is empty** (no faculty, no posts, no FAQs, no events, no openings) → the page still renders with a friendly empty message and no orphan headings or empty filter bars. Pinned in Tasks 4–11 (`pages.test.mjs`).
2. **Blog post bodies containing HTML or `javascript:` links** (from a future admin) → rendered as escaped text; only `http(s)` and `mailto:` links become links. Pinned in Task 2 (`markdown.test.mjs`).
3. **Unknown blog slug** (`/blog/no-such-post`) → branded 404 with status 404, not a 500. Pinned in Task 9.
4. **Filter chips with JavaScript disabled** → every item visible, chip bar hidden. Pinned in Task 4 (`filters.spec.ts`).
5. **Tapping a video** → only then does an iframe from `youtube-nocookie.com` appear; before the tap there is no iframe and no YouTube script. Pinned in Task 3 (`youtube.spec.ts`).

---

### Task 1: Phase 1 follow-ups

Clears the seven minor findings deferred from the Phase 1 review.

**Files:**
- Modify: `src/components/CourseTabs.astro`, `server/content-store.mjs`, `src/components/Stats.astro`, `src/scripts/motion.ts`, `server.mjs`, `src/pages/story.astro`, `src/pages/index.astro`, `.gitignore`
- Create: `src/lib/count.ts`, `tests/count.test.mjs`
- Modify tests: `tests/content-store.test.mjs`, `tests/routing.test.mjs`, `tests/pages.test.mjs`, `tests/repo.test.mjs`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Produces: `formatCount(value: number, grouped: boolean): string` from `src/lib/count.ts`; `parseList(text: string): unknown[]` (internal to `content-store.mjs`).

- [ ] **Step 1: Write the failing tests**

Create `tests/count.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCount } from '../src/lib/count.ts';

test('counters keep the grouping the editor typed', () => {
  assert.equal(formatCount(30000, true), '30,000');
  assert.equal(formatCount(2014, false), '2014');
  assert.equal(formatCount(107, false), '107');
});
```

Append to `tests/content-store.test.mjs`:

```js
test('a timeline chapter with malformed media still loads, with no photos', () => {
  const store = seeded();
  store.db.exec("UPDATE timeline_entries SET media = '' WHERE year_label = '2015'");
  assert.deepEqual(store.timeline().find(c => c.yearLabel === '2015').media, []);
});

test('two stores seeding the same new database do not collide', async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = (await import('node:path')).default;
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'seed-')), 'db.sqlite');
  const a = new ContentStore(new DatabaseSync(file));
  const b = new ContentStore(new DatabaseSync(file));
  const seed = (await import('../server/content-store.mjs')).loadSeed();
  let raced = false;
  // The first section b reads triggers a full seed by a, simulating a second process that wins the race.
  const racing = new Proxy(seed, { get(target, key) { if (!raced && key === 'stats') { raced = true; a.applySeed(); } return target[key]; } });
  assert.doesNotThrow(() => b.applySeed(racing));
  assert.equal(b.stats().length, 4);
});
```

Append to `tests/routing.test.mjs`:

```js
test('a null byte in the URL is rejected as a bad request', async () => {
  assert.equal((await fetch(base + '/a%00b')).status, 400);
});
```

Append to `tests/pages.test.mjs`:

```js
test('Our Story stays tidy when chapters and growth data are empty', async t => {
  const site = await start(content => content.db.exec('DELETE FROM timeline_entries; DELETE FROM growth_points;'));
  t.after(site.close);
  const page = await site.html('/story');
  assert.doesNotMatch(page, /to\s+students/);
  assert.doesNotMatch(page, /year by year/);
});

test('the homepage description is built from the live stats', async t => {
  const site = await start(content => content.db.exec("UPDATE stats SET value = '10' WHERE label = 'Centres in Kochi'"));
  t.after(site.close);
  assert.match(await site.html('/'), /<meta name="description" content="[^"]*10 centres in kochi/i);
});
```

Append to `tests/repo.test.mjs`:

```js
test('no Python cache files are tracked', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(f => f.includes('__pycache__'));
  assert.deepEqual(tracked, []);
});
```

Append to `tests/e2e/home.spec.ts`:

```ts
test('without JavaScript the course tab buttons are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('tab', { name: 'CBSE' })).toBeHidden();
  await context.close();
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `node --test tests/count.test.mjs tests/content-store.test.mjs tests/repo.test.mjs` then `npm test` then `npm run test:e2e -- tests/e2e/home.spec.ts`
Expected: FAIL — `formatCount` missing; malformed media throws; the race test throws a seed_log primary-key error; `/a%00b` returns 500; the story shows "to  students"; the meta description is fixed text; three `__pycache__` files are tracked; the no-JS tab buttons are visible.

- [ ] **Step 3: Implement the fixes**

Create `src/lib/count.ts`:

```ts
/** Formats a counter value; grouping (30,000) is used only when the editor's value had commas. */
export function formatCount(value: number, grouped: boolean): string {
  return grouped ? new Intl.NumberFormat('en-IN').format(value) : String(value);
}
```

In `src/components/Stats.astro`, change the counter span to carry the grouping flag:

```astro
<span aria-hidden="true" data-count-to={count?.to} data-count-suffix={count?.suffix} data-count-group={stat.value.includes(',') ? '' : undefined}>{stat.value}</span>
```

In `src/scripts/motion.ts`, add `import { formatCount } from '../lib/count';` and replace `initCounters` with:

```ts
function initCounters() {
  inView('[data-count-to]', element => {
    const el = element as HTMLElement;
    const to = Number(el.dataset.countTo);
    const suffix = el.dataset.countSuffix ?? '';
    const grouped = el.dataset.countGroup !== undefined;
    if (!Number.isFinite(to)) return;
    animate(0, to, { duration: 1.4, ease: EASE, onUpdate: v => { el.textContent = formatCount(Math.round(v), grouped) + suffix; } });
  }, { amount: 0.6 });
}
```

In `server/content-store.mjs`, add above `const flag`:

```js
function parseList(text) {
  try { const value = JSON.parse(text); return Array.isArray(value) ? value : []; } catch { return []; }
}
```

and in `timeline()` replace `media: JSON.parse(r.media)` with `media: parseList(r.media)`. In `applySeed`, replace the body of the `try` block with:

```js
        // Another process may have seeded this section since `done` was read.
        if (this.db.prepare('SELECT 1 FROM seed_log WHERE section = ?').get(section)) { this.db.exec('COMMIT'); continue; }
        apply(this.db, data[section]);
        this.db.prepare('INSERT INTO seed_log(section, applied_at) VALUES(?, ?)').run(section, new Date().toISOString());
        this.db.exec('COMMIT');
```

In `server.mjs`, directly after the `decodeURIComponent` line add:

```js
      if (pathname.includes('\0')) return send(400, 'Invalid URL');
```

In `src/components/CourseTabs.astro` styles add:

```css
  .tablist[hidden] { display: none; }
```

In `src/pages/story.astro` frontmatter add:

```ts
const firstYear = Number(chapters[0]?.yearLabel);
const journeyTitle = Number.isFinite(firstYear) ? `${new Date().getFullYear() - firstYear} years, year by year` : 'Year by year';
```

then render the hero `<h1>` as `{latest ? <>From one classroom to <span class="marker">{latest.studentsLabel} students</span></> : 'Our story'}`, wrap the journey `<section>` in `{chapters.length > 0 && (...)}` and pass `title={journeyTitle}` to its `SectionHead`.

In `src/pages/index.astro` frontmatter add:

```ts
const description = `Smartup tuitions in Kochi and online for CBSE and State Board students, classes 8 to +2. ${stats.map(s => `${s.value} ${s.label.toLowerCase()}`).join(', ')}.`;
```

and pass `description={description}` to `Base`.

Remove the cache files and ignore them:

```bash
git rm -r --cached -q .claude/skills/ui-ux-pro-max/scripts/__pycache__
printf '__pycache__/\n' >> .gitignore
```

- [ ] **Step 4: Run every test**

Run: `npm run check && npm test && npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src server server.mjs tests .gitignore
git commit -m "Clear Phase 1 follow-ups: counters, seeding race, null bytes, empty story, no-JS tabs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Content model, seed content and media for the new pages

**Files:**
- Modify: `server/content-store.mjs`, `data-seed/content.json`, `data-seed/media-sources.json`, `src/lib/media.mjs`, `scripts/build-media.mjs`, `src/components/SocialIcon.astro`
- Create: `src/lib/markdown.mjs`, `tests/markdown.test.mjs`
- Modify tests: `tests/content-store.test.mjs`, `tests/media.test.mjs`
- Generated (committed): new `public/seed/img/faculty-*`, `result-*`, `life-*` variants

**Interfaces:**
- Produces (on `ContentStore`):
  - `faculty(): {name, role, team, qualification, note, photo}[]` — `team` is one of `mathematics|physics|chemistry|biology|commerce|humanities|team`.
  - `events(): {id, category, title, dateLabel, summary, media: {src,alt}[], youtubeId}[]`
  - `videos(category?: string): {youtubeId, title, category, format}[]` — `format` is `landscape|portrait`; categories `classes|exam-prep|short-lessons|toppers|chairman|events|parents`.
  - `posts(): {slug, title, category, excerpt, author, publishedAt}[]` (newest first); `post(slug): {slug, title, category, excerpt, author, publishedAt, body} | null`
  - `faqs(): {category, question, answer}[]`
  - `results()` rows gain `kind: 'summary' | 'student'`.
  - `settings()` gains `positioning`, `mission`, `companyVision`, `legalName`, `registeredOffice: {address, mapUrl}`, `phones: string[]` (normalized, valid only), `googleReviewsUrl: string|null`, `communityLinks: {label,url}[]`; `social` gains LinkedIn.
- Produces: `renderMarkdown(source: string): string` from `src/lib/markdown.mjs` — safe HTML (escaped text; `##`/`###` headings, paragraphs, `-` and `1.` lists, `**bold**`, `*italic*`, `[text](https://…|mailto:…)` links only).
- Produces: `cropBox(width, height, crop): {left, top, width, height}` from `src/lib/media.mjs`; media sources accept optional `crop: {x, y, w, h}` (fractions 0–1).
- `SocialIcon` accepts `network: 'facebook' | 'instagram' | 'youtube' | 'linkedin'`.

- [ ] **Step 1: Write the failing tests**

Create `tests/markdown.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/markdown.mjs';

test('headings, paragraphs and lists render', () => {
  const html = renderMarkdown('## Plan\n\nStart early.\n\n- One\n- Two\n\n1. First\n2. Second');
  assert.equal(html, '<h2>Plan</h2>\n<p>Start early.</p>\n<ul><li>One</li><li>Two</li></ul>\n<ol><li>First</li><li>Second</li></ol>');
});

test('bold, italic and safe links render', () => {
  assert.equal(renderMarkdown('**Bold** and *calm* [call us](https://smartupedu.in/contact)'), '<p><strong>Bold</strong> and <em>calm</em> <a href="https://smartupedu.in/contact">call us</a></p>');
  assert.equal(renderMarkdown('[mail](mailto:info@smartupedu.in)'), '<p><a href="mailto:info@smartupedu.in">mail</a></p>');
});

test('HTML and unsafe links are escaped, never executed', () => {
  assert.equal(renderMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(renderMarkdown('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
  assert.equal(renderMarkdown('[x](https://a.b/"onmouseover="y)'), '<p><a href="https://a.b/&quot;onmouseover=&quot;y">x</a></p>');
});
```

Append to `tests/content-store.test.mjs`:

```js
test('Phase 2 content is seeded', () => {
  const store = seeded();
  assert.equal(store.faculty().length, 35);
  assert.ok(store.events().length >= 10);
  assert.ok(store.videos('toppers').length === 4);
  assert.equal(store.posts().length, 3);
  assert.ok(store.faqs().length >= 12);
  assert.ok(store.results().filter(r => r.kind === 'summary').length >= 6);
  assert.ok(store.results().length >= 60);
});

test('a single post is found by slug, and unknown slugs return null', () => {
  const store = seeded();
  const [first] = store.posts();
  assert.equal(store.post(first.slug).title, first.title);
  assert.equal(store.post('no-such-post'), null);
});

test('posts come newest first and unpublished posts are hidden', () => {
  const store = seeded();
  const dates = store.posts().map(p => p.publishedAt);
  assert.deepEqual(dates, [...dates].sort().reverse());
  store.db.exec('UPDATE posts SET published = 0');
  assert.deepEqual(store.posts(), []);
});

test('company settings and extra phones are available', () => {
  const s = seeded().settings();
  assert.equal(s.legalName, 'Smartup Eduventures Private Limited');
  assert.deepEqual(s.phones, ['+918891910919', '+917356072079', '+917994436060']);
  assert.ok(s.social.some(x => x.network === 'linkedin'));
  assert.equal(s.googleReviewsUrl, null);
});

test('an older database without a results kind column is upgraded', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE results(id INTEGER PRIMARY KEY, year TEXT NOT NULL, board TEXT NOT NULL, exam TEXT NOT NULL, headline TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '', poster_alt TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)");
  db.exec("INSERT INTO results(year, board, exam, headline) VALUES('2020', 'State', 'Plus One', 'Old row')");
  const store = new ContentStore(db);
  assert.equal(store.results()[0].kind, 'student');
});
```

Append to `tests/media.test.mjs`:

```js
test('crop boxes are whole pixels inside the image', async () => {
  const { cropBox } = await import('../src/lib/media.mjs');
  assert.deepEqual(cropBox(1000, 2000, { x: 0.21, y: 0.335, w: 0.53, h: 0.285 }), { left: 210, top: 670, width: 530, height: 570 });
  assert.deepEqual(cropBox(329, 424, { x: 0, y: 0, w: 1, h: 0.86 }), { left: 0, top: 0, width: 329, height: 365 });
  assert.throws(() => validateSources([{ name: 'a', kind: 'image', from: 'drive', id: 'x', crop: { x: 0.5, y: 0, w: 0.7, h: 1 } }]), /crop/);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `node --test tests/markdown.test.mjs tests/content-store.test.mjs tests/media.test.mjs`
Expected: FAIL — `markdown.mjs` missing, `faculty is not a function`, `cropBox` missing.

- [ ] **Step 3: Write the Markdown renderer**

Create `src/lib/markdown.mjs`:

```js
const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Inline formatting runs on already-escaped text, so no HTML from the source can survive.
function inline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Renders the small Markdown subset staff use for posts. Output is safe to insert as HTML. */
export function renderMarkdown(source) {
  return source.trim().split(/\n{2,}/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const heading = /^(#{2,3})\s+(.*)$/.exec(lines[0]);
    if (heading && lines.length === 1) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    if (lines.every(l => /^-\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
    if (lines.every(l => /^\d+\.\s+/.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('\n');
}
```

- [ ] **Step 4: Extend the content store**

In `server/content-store.mjs`:

Add to the `SCHEMA` string (before its closing backtick), and add `kind TEXT NOT NULL DEFAULT 'student'` to the `results` table definition right after `poster_alt …`:

```sql
CREATE TABLE IF NOT EXISTS faculty(id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', team TEXT NOT NULL DEFAULT 'team', qualification TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL, date_label TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', media TEXT NOT NULL DEFAULT '[]', youtube_id TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY, youtube_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, format TEXT NOT NULL DEFAULT 'landscape' CHECK(format IN ('landscape','portrait')), sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, author TEXT NOT NULL DEFAULT 'Smartup Academic Team', published_at TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS faqs(id INTEGER PRIMARY KEY, category TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
```

Change `SECTIONS.results` to store the kind:

```js
  results(db, rows) {
    const put = db.prepare('INSERT INTO results(year, board, exam, headline, detail, poster, poster_alt, featured, kind, sort) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.year, r.board, r.exam, r.headline, r.detail ?? '', r.poster ?? '', r.posterAlt ?? '', flag(r.featured), r.kind ?? 'student', i));
  },
```

Add these entries to `SECTIONS`:

```js
  faculty(db, rows) {
    const put = db.prepare('INSERT INTO faculty(name, role, team, qualification, note, photo, sort) VALUES(?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.name, r.role ?? '', r.team ?? 'team', r.qualification ?? '', r.note ?? '', r.photo ?? '', i));
  },
  events(db, rows) {
    const put = db.prepare('INSERT INTO events(category, title, date_label, summary, media, youtube_id, sort) VALUES(?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.category, r.title, r.dateLabel ?? '', r.summary ?? '', JSON.stringify(r.media ?? []), r.youtubeId ?? '', i));
  },
  videos(db, rows) {
    const put = db.prepare('INSERT INTO videos(youtube_id, title, category, format, sort) VALUES(?, ?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.youtubeId, r.title, r.category, r.format ?? 'landscape', i));
  },
  posts(db, rows) {
    const put = db.prepare('INSERT INTO posts(slug, title, category, excerpt, body, author, published_at) VALUES(?, ?, ?, ?, ?, ?, ?)');
    for (const r of rows) put.run(r.slug, r.title, r.category, r.excerpt ?? '', r.body, r.author ?? 'Smartup Academic Team', r.publishedAt);
  },
  faqs(db, rows) {
    const put = db.prepare('INSERT INTO faqs(category, question, answer, sort) VALUES(?, ?, ?, ?)');
    rows.forEach((r, i) => put.run(r.category, r.question, r.answer, i));
  },
```

In the `ContentStore` constructor, after `this.db.exec(SCHEMA);`, add:

```js
    // Databases created before Phase 2 lack the results kind column.
    const resultColumns = this.db.prepare('PRAGMA table_info(results)').all().map(c => c.name);
    if (!resultColumns.includes('kind')) this.db.exec("ALTER TABLE results ADD COLUMN kind TEXT NOT NULL DEFAULT 'student'");
```

Replace `results()` and add the new readers to the class:

```js
  results({ featured = false } = {}) {
    const where = featured ? 'published = 1 AND featured = 1' : 'published = 1';
    return this.db.prepare(`SELECT year, board, exam, headline, detail, poster, poster_alt AS posterAlt, kind FROM results WHERE ${where} ORDER BY sort, id`).all();
  }

  faculty() {
    return this.db.prepare('SELECT name, role, team, qualification, note, photo FROM faculty WHERE published = 1 ORDER BY sort, id').all();
  }

  events() {
    return this.db.prepare('SELECT id, category, title, date_label AS dateLabel, summary, media, youtube_id AS youtubeId FROM events WHERE published = 1 ORDER BY sort, id').all()
      .map(r => ({ ...r, media: parseList(r.media) }));
  }

  videos(category) {
    const sql = 'SELECT youtube_id AS youtubeId, title, category, format FROM videos WHERE published = 1' + (category ? ' AND category = ?' : '') + ' ORDER BY sort, id';
    return category ? this.db.prepare(sql).all(category) : this.db.prepare(sql).all();
  }

  posts() {
    return this.db.prepare('SELECT slug, title, category, excerpt, author, published_at AS publishedAt FROM posts WHERE published = 1 ORDER BY published_at DESC, id DESC').all();
  }

  post(slug) {
    return this.db.prepare('SELECT slug, title, category, excerpt, author, published_at AS publishedAt, body FROM posts WHERE published = 1 AND slug = ?').get(slug) ?? null;
  }

  faqs() {
    return this.db.prepare('SELECT category, question, answer FROM faqs WHERE published = 1 ORDER BY sort, id').all();
  }
```

In `settings()`, extend the returned object:

```js
    return { ...settings, phone: phoneOrNull(settings.phone), whatsapp: phoneOrNull(settings.whatsapp), phones: (settings.phones ?? []).map(phoneOrNull).filter(Boolean) };
```

- [ ] **Step 5: Add the seed content**

Merge the Phase 2 content into `data-seed/content.json` with this one-off script (it replaces `results`, adds new sections and settings keys, and appends LinkedIn):

```bash
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'data-seed/content.json';
const seed = JSON.parse(readFileSync(file, 'utf8'));
const add = JSON.parse(readFileSync('/dev/stdin', 'utf8'));
Object.assign(seed.settings, add.settings);
seed.settings.social.push({ network: 'linkedin', label: 'Smartup on LinkedIn', url: 'https://www.linkedin.com/company/smart-up-learning-ventures-pvt-ltd/' });
for (const key of ['results', 'faculty', 'events', 'videos', 'posts', 'faqs']) seed[key] = add[key];
writeFileSync(file, JSON.stringify(seed, null, 2) + '\n');
" <<'JSON'
{
  "settings": {
    "positioning": "The place where academic champions are born",
    "mission": "Offer the best, complete and easy-access learning opportunities to students by bridging the gap between hard work and excellence, through dedicated, knowledgeable teachers and interactive classes using advanced technology.",
    "companyVision": "To be established as the most trusted academic partner for students by setting a benchmark of excellence in education.",
    "legalName": "Smartup Eduventures Private Limited",
    "registeredOffice": { "address": "Thomson Building, Cheruparambath Road, Kadavanthra, Ernakulam 682020, Kerala", "mapUrl": "https://maps.app.goo.gl/J94zDDBt6BUJRHPbA" },
    "phones": ["8891910919", "7356072079", "7994436060"],
    "googleReviewsUrl": null,
    "communityLinks": []
  },
  "results": [
    { "year": "2026", "board": "State", "exam": "SSLC", "kind": "summary", "headline": "107 students with Full A+", "detail": "100% pass in SSLC 2026", "poster": "/seed/img/result-2026-sslc-107", "posterAlt": "Smartup poster announcing 107 Full A+ in SSLC 2026", "featured": true },
    { "year": "2026", "board": "State", "exam": "SSLC", "kind": "summary", "headline": "175 students with distinction and above", "detail": "114 scored 90% and above · 34 with 9 A+ · 63 with 8 A+ · 72 with 7 A+ · 65 with 6 A+", "poster": "/seed/img/results-sslc-2026", "posterAlt": "Smartup SSLC 2026 results chart" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "kind": "summary", "headline": "100% pass in CBSE Class 10", "detail": "80% of students scored distinction and above (2025–26)" },
    { "year": "2026", "board": "State", "exam": "Plus One", "kind": "summary", "headline": "Plus One 2026 toppers", "detail": "Students scoring 90% and above, as published by Smartup", "poster": "/seed/img/result-2026-plus-one-toppers", "posterAlt": "Smartup Plus One 2026 toppers poster" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Aysha Palakki — 96%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/results-aysha-palakki", "posterAlt": "Result poster for Aysha Palakki, 96% in CBSE Class 10", "featured": true },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "S Shraavan Madhav — 91%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-shraavan-madhav", "posterAlt": "Result poster for S Shraavan Madhav, 91% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Ashiq Mohammed — 89%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-ashiq-mohammed", "posterAlt": "Result poster for Ashiq Mohammed, 89% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Minnah Shamsu — 86.8%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-minnah-shamsu", "posterAlt": "Result poster for Minnah Shamsu, 86.8% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Muhammed Rayyan — 86%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-muhammed-rayyan", "posterAlt": "Result poster for Muhammed Rayyan, 86% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Salman Faris — 81%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-salman-faris", "posterAlt": "Result poster for Salman Faris, 81% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Indrajith Jayakrishnan — 71.4%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-indrajith-jayakrishnan", "posterAlt": "Result poster for Indrajith Jayakrishnan, 71.4% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Muhammed Safwan — 69%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-muhammed-safwan", "posterAlt": "Result poster for Muhammed Safwan, 69% in CBSE Class 10" },
    { "year": "2026", "board": "CBSE", "exam": "Class 10", "headline": "Muhammed Farzan — 66.2%", "detail": "CBSE Class 10, 2025–26", "poster": "/seed/img/result-2026-cbse-muhammed-farzan", "posterAlt": "Result poster for Muhammed Farzan, 66.2% in CBSE Class 10" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Archana K.A — 1159/1200", "detail": "Full A+, Plus Two 2026", "poster": "/seed/img/results-archana", "posterAlt": "Result poster for Archana K.A, 1159 out of 1200 in Plus Two", "featured": true },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Afna Navas — 1108/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-afna-navas", "posterAlt": "Result poster for Afna Navas, 1108 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Ananya J — 1104/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-ananya-j", "posterAlt": "Result poster for Ananya J, 1104 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Aiden Clarence — 1078/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-aiden-clarence", "posterAlt": "Result poster for Aiden Clarence, 1078 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Fazlul Fariza — 1064/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-fazlul-fariza", "posterAlt": "Result poster for Fazlul Fariza, 1064 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Nidha Noufal — 1058/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-nidha-noufal", "posterAlt": "Result poster for Nidha Noufal, 1058 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Mohammed Harshad — 1038/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-mohammed-harshad", "posterAlt": "Result poster for Mohammed Harshad, 1038 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Aadhil — 1030/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-aadhil", "posterAlt": "Result poster for Aadhil, 1030 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus Two", "headline": "Elvis Christy — 1024/1200", "detail": "Plus Two 2026", "poster": "/seed/img/result-2026-plus-two-elvis-christy", "posterAlt": "Result poster for Elvis Christy, 1024 out of 1200 in Plus Two" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Haneena Parveen — 516/520", "detail": "Full A+, Plus One 2026", "poster": "/seed/img/result-2026-plus-one-haneena-parveen", "posterAlt": "Result poster for Haneena Parveen, 516 out of 520 in Plus One" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Alwin Wilson — 514/520", "detail": "Full A+, Plus One 2026", "poster": "/seed/img/result-2026-plus-one-alwin-wilson", "posterAlt": "Result poster for Alwin Wilson, 514 out of 520 in Plus One" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Hiba Sajeer — 506/520", "detail": "Full A+, Plus One 2026", "poster": "/seed/img/result-2026-plus-one-hiba-sajeer", "posterAlt": "Result poster for Hiba Sajeer, 506 out of 520 in Plus One" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Thwalib Nasar — 500/520", "detail": "Full A+, Plus One 2026", "poster": "/seed/img/result-2026-plus-one-thwalib-nasar", "posterAlt": "Result poster for Thwalib Nasar, 500 out of 520 in Plus One" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Athulya — 495/520", "detail": "Full A+, Plus One 2026", "poster": "/seed/img/result-2026-plus-one-athulya", "posterAlt": "Result poster for Athulya, 495 out of 520 in Plus One" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Muhammed Jahfar — 481/520", "detail": "Full A+, Plus One 2026", "poster": "/seed/img/result-2026-plus-one-muhammed-jahfar", "posterAlt": "Result poster for Muhammed Jahfar, 481 out of 520 in Plus One" },
    { "year": "2026", "board": "State", "exam": "Plus One", "headline": "Aliya P A — 92.5%", "detail": "Plus One 2026", "poster": "/seed/img/result-2026-plus-one-aliya-pa", "posterAlt": "Result poster for Aliya P A, 92.5% in Plus One" },
    { "year": "2026", "board": "State", "exam": "SSLC", "headline": "Shazma Binth Muqthar — Full A+", "detail": "SSLC 2026 · Palluruthy", "poster": "/seed/img/result-2026-sslc-shazma-binth-muqthar", "posterAlt": "Result poster for Shazma Binth Muqthar, Full A+ in SSLC 2026" },
    { "year": "2026", "board": "State", "exam": "SSLC", "headline": "Kailash — Full A+", "detail": "SSLC 2026 · Chullickal", "poster": "/seed/img/result-2026-sslc-kailash", "posterAlt": "Result poster for Kailash, Full A+ in SSLC 2026" },
    { "year": "2026", "board": "State", "exam": "SSLC", "headline": "Mohammed Aamir — Full A+", "detail": "SSLC 2026 · Chullickal", "poster": "/seed/img/result-2026-sslc-mohammed-aamir", "posterAlt": "Result poster for Mohammed Aamir, Full A+ in SSLC 2026" },
    { "year": "2026", "board": "State", "exam": "SSLC", "headline": "Abdulla A A — Full A+", "detail": "SSLC 2026 · Chullickal", "poster": "/seed/img/result-2026-sslc-abdulla-aa", "posterAlt": "Result poster for Abdulla A A, Full A+ in SSLC 2026" },
    { "year": "2026", "board": "State", "exam": "SSLC", "headline": "Diya K Vima — Full A+", "detail": "SSLC 2026 · Chullickal", "poster": "/seed/img/result-2026-sslc-diya-k-vima", "posterAlt": "Result poster for Diya K Vima, Full A+ in SSLC 2026" },
    { "year": "2025", "board": "State", "exam": "SSLC", "kind": "summary", "headline": "100+ students with Full A+", "detail": "The fifth year in a row with 100+ Full A+ in SSLC", "poster": "/seed/img/result-2025-sslc-100", "posterAlt": "Smartup poster announcing 100+ Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Hanna Fathima — Full A+", "detail": "SSLC 2025", "poster": "/seed/img/result-2025-sslc-hanna-fathima", "posterAlt": "Result poster for Hanna Fathima, Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Haneena — Full A+", "detail": "SSLC 2025", "poster": "/seed/img/result-2025-sslc-haneena", "posterAlt": "Result poster for Haneena, Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Anton Rayen — Full A+", "detail": "SSLC 2025 · Moolamkuzhi", "poster": "/seed/img/result-2025-sslc-anton-rayen", "posterAlt": "Result poster for Anton Rayen, Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Sreeranjini — Full A+", "detail": "SSLC 2025", "poster": "/seed/img/result-2025-sslc-sreeranjini", "posterAlt": "Result poster for Sreeranjini, Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Darsana — Full A+", "detail": "SSLC 2025 · Chullickal", "poster": "/seed/img/result-2025-sslc-darsana", "posterAlt": "Result poster for Darsana, Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Farasha Firoz — Full A+", "detail": "SSLC 2025", "poster": "/seed/img/result-2025-sslc-farasha-firoz", "posterAlt": "Result poster for Farasha Firoz, Full A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "SSLC", "headline": "Irine Ann Mary — 9 A+", "detail": "SSLC 2025", "poster": "/seed/img/result-2025-sslc-irine-ann-mary", "posterAlt": "Result poster for Irine Ann Mary, nine A+ in SSLC 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Angela and Ann Fiya — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-angela-ann-fiya", "posterAlt": "Result poster for Angela and Ann Fiya, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Aasia Azeez — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-aasia-azeez", "posterAlt": "Result poster for Aasia Azeez, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Afna Suneer — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-afna-suneer", "posterAlt": "Result poster for Afna Suneer, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Agnus Manuel — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-agnus-manuel", "posterAlt": "Result poster for Agnus Manuel, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Amaan Firoz — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-amaan-firoz", "posterAlt": "Result poster for Amaan Firoz, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Amna Raheem — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-amna-raheem", "posterAlt": "Result poster for Amna Raheem, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Serin Mayble — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-serin-mayble", "posterAlt": "Result poster for Serin Mayble, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Amal Antony — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-amal-antony", "posterAlt": "Result poster for Amal Antony, Full A+ in Plus Two 2025" },
    { "year": "2025", "board": "State", "exam": "Plus Two", "headline": "Rugma Ramesh — Full A+", "detail": "Plus Two 2025", "poster": "/seed/img/result-2025-plus-two-rugma-ramesh", "posterAlt": "Result poster for Rugma Ramesh, Full A+ in Plus Two 2025" },
    { "year": "2024", "board": "State", "exam": "Plus One", "headline": "Siya P.S — 99%", "detail": "Full A+, Plus One 2024 · Palluruthy", "poster": "/seed/img/result-2024-plus-one-siya-ps", "posterAlt": "Result poster for Siya P.S, 99% in Plus One 2024" },
    { "year": "2024", "board": "State", "exam": "SSLC", "headline": "Aysha Mohammed Sunil — Full A+", "detail": "SSLC 2024 · Chullickal", "poster": "/seed/img/result-2024-sslc-aysha-mohammed-sunil", "posterAlt": "Result poster for Aysha Mohammed Sunil, Full A+ in SSLC 2024" },
    { "year": "2024", "board": "State", "exam": "SSLC", "headline": "Devon Moses — Full A+", "detail": "SSLC 2024 · Fort Kochi", "poster": "/seed/img/result-2024-sslc-devon-moses", "posterAlt": "Result poster for Devon Moses, Full A+ in SSLC 2024" },
    { "year": "2024", "board": "State", "exam": "SSLC", "headline": "Haleema Jihan — 9 A+", "detail": "SSLC 2024 · Chullickal", "poster": "/seed/img/result-2024-sslc-haleema-jihan", "posterAlt": "Result poster for Haleema Jihan, nine A+ in SSLC 2024" },
    { "year": "2024", "board": "State", "exam": "SSLC", "headline": "Muhammed Faris — 7 A+", "detail": "SSLC 2024 · Chullickal", "poster": "/seed/img/result-2024-sslc-muhammed-faris", "posterAlt": "Result poster for Muhammed Faris, seven A+ in SSLC 2024" },
    { "year": "2023", "board": "State", "exam": "SSLC", "kind": "summary", "headline": "127 students with Full A+", "detail": "100% pass · 49 with 9 A+ · 45 with 8 A+ · 33 with 7 A+ · 42 with 6 A+", "poster": "/seed/img/result-2023-sslc-127", "posterAlt": "Smartup poster announcing 127 Full A+ in SSLC 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "kind": "summary", "headline": "71 Full A+", "detail": "Plus Two 2023, as announced by Smartup" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Aleena Jackson — Full A+", "detail": "Plus Two 2023 · Science · Chullickal", "poster": "/seed/img/result-2023-plus-two-aleena-jackson", "posterAlt": "Result poster for Aleena Jackson, Full A+ in Plus Two 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Safri Shajahan — Full A+", "detail": "Plus Two 2023 · Science · Palluruthy", "poster": "/seed/img/result-2023-plus-two-safri-shajahan", "posterAlt": "Result poster for Safri Shajahan, Full A+ in Plus Two 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Fahmitha Salim — Full A+", "detail": "Plus Two 2023 · Science · Chullickal", "poster": "/seed/img/result-2023-plus-two-fahmitha-salim", "posterAlt": "Result poster for Fahmitha Salim, Full A+ in Plus Two 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Samuel Shibu — Full A+", "detail": "Plus Two 2023 · Commerce", "poster": "/seed/img/result-2023-plus-two-samuel-shibu", "posterAlt": "Result poster for Samuel Shibu, Full A+ in Plus Two 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Thansa H R — Full A+", "detail": "Plus Two 2023 · Science · Eraveli", "poster": "/seed/img/result-2023-plus-two-thansa-hr", "posterAlt": "Result poster for Thansa H R, Full A+ in Plus Two 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Maksoodha — Full A+", "detail": "Plus Two 2023 · Science · Eraveli", "poster": "/seed/img/result-2023-plus-two-maksoodha", "posterAlt": "Result poster for Maksoodha, Full A+ in Plus Two 2023" },
    { "year": "2023", "board": "State", "exam": "Plus Two", "headline": "Abdul Jezeem — Full A+", "detail": "Plus Two 2023 · Commerce · Eraveli", "poster": "/seed/img/result-2023-plus-two-abdul-jezeem", "posterAlt": "Result poster for Abdul Jezeem, Full A+ in Plus Two 2023" },
    { "year": "2020", "board": "State", "exam": "Plus One", "headline": "Abhishek N — 97.1%", "detail": "Plus One, 2020", "poster": "/seed/img/timeline-2020-results", "posterAlt": "Result poster for Abhishek N, 97.1% in Plus One", "featured": true }
  ],
  "faculty": [
    { "name": "Aflah K. R.", "role": "Academic Head", "team": "team", "qualification": "MSc, BEd", "note": "Research published in an Elsevier journal", "photo": "/seed/img/faculty-aflah-kr" },
    { "name": "Liya Justin", "role": "Mathematics", "team": "mathematics", "qualification": "MSc, MEd · KTET 2 & 3", "photo": "/seed/img/faculty-liya-justin" },
    { "name": "Abdul Ahad A G", "role": "Mathematics", "team": "mathematics", "qualification": "BSc Mathematics", "photo": "/seed/img/faculty-abdul-ahad-ag" },
    { "name": "Anju S Venu", "role": "Mathematics", "team": "mathematics", "qualification": "MSc Mathematics", "photo": "/seed/img/faculty-anju-s-venu" },
    { "name": "Chaitanya Krishna", "role": "Mathematics", "team": "mathematics", "qualification": "MSc, BEd (Mathematics)", "photo": "/seed/img/faculty-chaitanya-krishna" },
    { "name": "Abhiram", "role": "Physics", "team": "physics", "qualification": "MSc, BEd", "photo": "/seed/img/faculty-abhiram" },
    { "name": "Akza", "role": "Physics", "team": "physics", "qualification": "MSc, BEd", "photo": "/seed/img/faculty-akza" },
    { "name": "Ayanarani K", "role": "Physics", "team": "physics", "qualification": "MSc Physics", "photo": "/seed/img/faculty-ayanarani-k" },
    { "name": "Ijas Ahammed", "role": "Physics", "team": "physics", "qualification": "BSc Physics, BEd", "photo": "/seed/img/faculty-ijas-ahammed" },
    { "name": "Anjali Anand", "role": "Chemistry", "team": "chemistry", "qualification": "MSc Chemistry, BEd · KTET 2 & 3", "photo": "/seed/img/faculty-anjali-anand" },
    { "name": "Jishnu T K", "role": "Chemistry", "team": "chemistry", "qualification": "MSc Chemistry", "photo": "/seed/img/faculty-jishnu-tk" },
    { "name": "Manjima Manoj", "role": "Chemistry", "team": "chemistry", "qualification": "MSc Chemistry", "photo": "/seed/img/faculty-manjima-manoj" },
    { "name": "Nair Akhila Suresh", "role": "Chemistry", "team": "chemistry", "qualification": "MSc Chemistry, BEd", "photo": "/seed/img/faculty-nair-akhila-suresh" },
    { "name": "Mohammed Bilal K S", "role": "Chemistry", "team": "chemistry", "qualification": "BSc Chemistry", "photo": "/seed/img/faculty-mohammed-bilal-ks" },
    { "name": "Hunais N K", "role": "Botany", "team": "biology", "qualification": "MSc Botany", "note": "Aligarh Muslim University", "photo": "/seed/img/faculty-hunais-nk" },
    { "name": "Noorniza", "role": "Biology", "team": "biology", "qualification": "MSc Life Sciences", "photo": "/seed/img/faculty-noorniza" },
    { "name": "Akhinesh R Prakash", "role": "Medical entrance", "team": "biology", "note": "Three years of medical entrance coaching", "photo": "/seed/img/faculty-akhinesh-r-prakash" },
    { "name": "Salih P R", "role": "Commerce", "team": "commerce", "qualification": "BCom", "photo": "/seed/img/faculty-salih-pr" },
    { "name": "Ibrahim", "role": "Commerce", "team": "commerce", "qualification": "MCom (pursuing)", "photo": "/seed/img/faculty-ibrahim" },
    { "name": "Muhzeen P A", "role": "Commerce", "team": "commerce", "qualification": "BBA", "photo": "/seed/img/faculty-muhzeen-pa" },
    { "name": "Rohith Krishna A", "role": "Humanities", "team": "humanities", "qualification": "MA Applied Sociology", "note": "University first rank holder", "photo": "/seed/img/faculty-rohith-krishna-a" },
    { "name": "Ranjith P S", "role": "Humanities", "team": "humanities", "qualification": "MA Archaeology", "photo": "/seed/img/faculty-ranjith-ps" },
    { "name": "Farhana Naushad", "role": "Academic team", "team": "humanities", "qualification": "MA", "photo": "/seed/img/faculty-farhana-naushad" },
    { "name": "Avinash Raj", "role": "Academic team", "team": "team", "qualification": "MSc", "photo": "/seed/img/faculty-avinash-raj" },
    { "name": "Sajith T S", "role": "Academic team", "team": "team", "qualification": "MSc Electronics, MBA", "photo": "/seed/img/faculty-sajith-ts" },
    { "name": "Abhishek K", "role": "Academic team", "team": "team", "qualification": "BTech, Electronics and Communication", "photo": "/seed/img/faculty-abhishek-k" },
    { "name": "Manjusha Madhu", "role": "Academic team", "team": "team", "qualification": "BTech, Electronics and Communication", "photo": "/seed/img/faculty-manjusha-madhu" },
    { "name": "Fathima Rahfa K", "role": "Academic team", "team": "team", "qualification": "BPharm", "photo": "/seed/img/faculty-fathima-rahfa-k" },
    { "name": "Farzana A Naushad", "role": "Academic team", "team": "team", "qualification": "Graduate", "photo": "/seed/img/faculty-farzana-a-naushad" },
    { "name": "Asif Ali", "role": "Academic team", "team": "team", "photo": "/seed/img/faculty-asif-ali" },
    { "name": "Saleh Lukman", "role": "Academic team", "team": "team", "photo": "/seed/img/faculty-saleh-lukman" },
    { "name": "Anzaf", "role": "Academic team", "team": "team", "photo": "/seed/img/faculty-anzaf" },
    { "name": "Nebil Navas", "role": "Academic team", "team": "team", "photo": "/seed/img/faculty-nebil-navas" },
    { "name": "Mohammed Shafi V K", "role": "Academic team", "team": "team", "photo": "/seed/img/faculty-mohammed-shafi-vk" },
    { "name": "Rahul V Rajeev", "role": "Academic team", "team": "team", "photo": "/seed/img/faculty-rahul-v-rajeev" }
  ],
  "events": [
    { "category": "Talent Eve", "title": "Talent Eve 7.0", "dateLabel": "2026", "summary": "Smartup's award night and arts festival: Crown Awards for achievers, performances from students and a graduation stage for every batch.", "youtubeId": "W7a4CxsJHTA",
      "media": [
        { "src": "/seed/img/life-talent-eve-stage", "alt": "Graduating students in gowns on the Talent Eve stage" },
        { "src": "/seed/img/life-talent-eve-award", "alt": "A student receiving a Crown Award at Talent Eve" },
        { "src": "/seed/img/life-talent-eve-crown", "alt": "Crown Award presentation at Talent Eve" },
        { "src": "/seed/img/life-talent-eve-dance", "alt": "Students performing a dance at Talent Eve" },
        { "src": "/seed/img/life-talent-eve-guitar", "alt": "A student playing guitar on the Talent Eve stage" },
        { "src": "/seed/img/life-talent-eve-band", "alt": "A student band performing at Talent Eve" } ] },
    { "category": "Shoot the Drugs", "title": "Shoot the Drugs", "dateLabel": "Since 2019 · season 7 in 2025", "summary": "A football and throwball tournament for juniors and seniors that carries an anti-drug message to students and families.", "youtubeId": "_xb6qBGeQ4E",
      "media": [
        { "src": "/seed/img/timeline-2025-shoot-the-drugs", "alt": "Shoot the Drugs champions on the field" },
        { "src": "/seed/img/life-std-march", "alt": "Teams marching on the final day of Shoot the Drugs" },
        { "src": "/seed/img/life-std-matchday", "alt": "Shoot the Drugs matchday result poster" },
        { "src": "/seed/img/timeline-2019-shoot-the-drugs", "alt": "Students celebrating at Shoot the Drugs season 1, 2019" } ] },
    { "category": "Coffee With Chairman", "title": "Coffee With Chairman", "dateLabel": "Since 2018 · 18 editions", "summary": "Mentoring sessions led by Chairman Mohamed Rayees, where students talk about goals, discipline and confidence.", "youtubeId": "5_wOmNJIBVM",
      "media": [
        { "src": "/seed/img/timeline-2026-cwc-18", "alt": "Coffee With Chairman, 18th edition" },
        { "src": "/seed/img/timeline-2018-cwc-1", "alt": "The first Coffee With Chairman session, 2018" } ] },
    { "category": "Workshops & academics", "title": "EDX: Kochi's first educational conclave", "dateLabel": "2024", "summary": "Smartup's educational conclave, held alongside Talent Eve.", "youtubeId": "SAEchdn17j8",
      "media": [ { "src": "/seed/img/life-edx", "alt": "EDX, Kochi's first educational conclave, poster" } ] },
    { "category": "Workshops & academics", "title": "JWALA 2025: an awakening against drug addiction", "dateLabel": "2025", "summary": "An awareness programme against drug addiction, led by Chairman Mohamed Rayees.", "youtubeId": "-GbYk75Qupk", "media": [] },
    { "category": "Workshops & academics", "title": "Interactive panel classes", "dateLabel": "2021", "summary": "Smartup brought interactive panel classes to West Kochi.", "media": [ { "src": "/seed/img/timeline-2021-interactive-panel", "alt": "Poster for the launch of interactive panel classes, June 2021" } ] },
    { "category": "Celebrations", "title": "Onam", "dateLabel": "2019", "summary": "Flower carpets, games and a festive day together.", "youtubeId": "zwUf7ZLEj9o", "media": [ { "src": "/seed/img/timeline-2019-onam", "alt": "Onam flower carpet made by Smartup students" } ] },
    { "category": "Celebrations", "title": "Independence Day", "dateLabel": "Every year", "summary": "Students march together on Independence Day.", "media": [ { "src": "/seed/img/timeline-2023-independence", "alt": "Smartup students in an Independence Day rally, 2023" }, { "src": "/seed/img/timeline-2014-independence", "alt": "Smartup students at an Independence Day parade, 2014" } ] },
    { "category": "Celebrations", "title": "Christmas and New Year", "dateLabel": "2017", "summary": "Music and celebration at the end of the year.", "media": [ { "src": "/seed/img/timeline-2017-christmas", "alt": "Christmas celebration at Smartup, 2017" } ] },
    { "category": "Celebrations", "title": "Teachers' Day", "dateLabel": "2015", "summary": "Students thank their teachers.", "media": [ { "src": "/seed/img/timeline-2015-teachers-day", "alt": "Students lighting candles on Teachers' Day, 2015" } ] },
    { "category": "Trips & camps", "title": "Study tours and camps", "dateLabel": "2019–2026", "summary": "Trips and camps where batches learn and travel together.", "media": [ { "src": "/seed/img/timeline-2026-camp", "alt": "Students at a Smartup camp, 2026" }, { "src": "/seed/img/timeline-2025-tour", "alt": "Smartup students on a study tour, 2025" }, { "src": "/seed/img/timeline-2019-tour", "alt": "Smartup students on a study tour, 2019" } ] }
  ],
  "videos": [
    { "youtubeId": "Fb2Qcs9kkVY", "title": "Plus Two Economics — live class", "category": "classes" },
    { "youtubeId": "jf5HtSXHmt4", "title": "Plus One Economics — live class", "category": "classes" },
    { "youtubeId": "mZa6x2qrC_0", "title": "Plus Two Maths — SAY exam live class", "category": "classes" },
    { "youtubeId": "T8EmJ9Re3pc", "title": "Plus Two Chemistry — question paper workout", "category": "exam-prep" },
    { "youtubeId": "mOc4Q_RR2WI", "title": "Plus One Physics — question paper workout", "category": "exam-prep" },
    { "youtubeId": "XTPZG0OjQsg", "title": "Class 10 State Maths — question paper workout", "category": "exam-prep" },
    { "youtubeId": "m5kSWBaJWKM", "title": "SSLC 2026 live", "category": "exam-prep" },
    { "youtubeId": "Aypb_y7umfo", "title": "Physics in a football kick: impulse", "category": "short-lessons", "format": "portrait" },
    { "youtubeId": "c4ktcuFK8Ik", "title": "How memory pathways reactivate", "category": "short-lessons", "format": "portrait" },
    { "youtubeId": "IN6jKzWjz-0", "title": "Does everything feel important while you study?", "category": "short-lessons", "format": "portrait" },
    { "youtubeId": "aJ8xJ3GdIVw", "title": "Learning combinations", "category": "short-lessons", "format": "portrait" },
    { "youtubeId": "qY8-oiF6U8g", "title": "Maths during a power cut", "category": "short-lessons", "format": "portrait" },
    { "youtubeId": "6TnxqTfDG0A", "title": "Toppers Talk, episode 1: Alfiya Jennath", "category": "toppers" },
    { "youtubeId": "5GslTzK3O6Q", "title": "Toppers Talk, episode 2: Fiza Farshad", "category": "toppers" },
    { "youtubeId": "besmcr_hsBw", "title": "Toppers Talk, episode 3: Hayden Mathew", "category": "toppers" },
    { "youtubeId": "A7BneqCcDCw", "title": "Toppers Talk, episode 4: Amna Raheem", "category": "toppers" },
    { "youtubeId": "5_wOmNJIBVM", "title": "Words from our Chairman", "category": "chairman" },
    { "youtubeId": "4dgcjAnpKvQ", "title": "What is Smartup's Vision 2030?", "category": "chairman" },
    { "youtubeId": "l0FZLS4fKmo", "title": "Vision 2026–2027", "category": "chairman" },
    { "youtubeId": "_5vb0VMhKp4", "title": "Introducing Smartup online classes", "category": "chairman" },
    { "youtubeId": "W7a4CxsJHTA", "title": "Talent Eve 7.0 highlights", "category": "events" },
    { "youtubeId": "iXelMSWc0UI", "title": "Crown Award: success stories", "category": "events" },
    { "youtubeId": "_xb6qBGeQ4E", "title": "Shoot the Drugs, season 6", "category": "events" },
    { "youtubeId": "zwUf7ZLEj9o", "title": "Onam celebration 2019", "category": "events" },
    { "youtubeId": "l4oi_UBHYcU", "title": "Parent and student feedback: Aadhidev, Class 8 CBSE", "category": "parents" },
    { "youtubeId": "xwVKwCIg6ek", "title": "Smartup through a parent's eyes", "category": "parents", "format": "portrait" },
    { "youtubeId": "HNCb1u9fAbQ", "title": "Parent feedback on Smartup classes", "category": "parents", "format": "portrait" },
    { "youtubeId": "cUi0yBbeOmg", "title": "How are the Smartup classes?", "category": "parents", "format": "portrait" },
    { "youtubeId": "fhqdKP_9anA", "title": "From exam fear to exam confidence", "category": "parents", "format": "portrait" }
  ],
  "posts": [
    { "slug": "board-exam-90-day-plan", "title": "A 90-day plan for the SSLC and CBSE Class 10 board exams", "category": "Exam preparation", "publishedAt": "2026-10-13", "excerpt": "Three months is enough time to revise every chapter twice — if you plan it. Here is the plan our teachers share with every Class 10 batch.",
      "body": "## Days 1–30: finish the first round\n\nList every chapter in every subject and give each one a date. Aim to finish one full round of revision in the first month, even if some chapters feel rushed. Mark each chapter green, yellow or red as you go.\n\n## Days 31–60: practise with past papers\n\nSpend this month on previous years' questions. Solve one paper a week under exam conditions and correct it the same day. Every mistake goes into a single notebook, sorted by chapter.\n\n- Start with your red chapters\n- Time yourself on every paper\n- Read the marking scheme, not just the answer\n\n## Days 61–90: second round and rest\n\nRevise from your mistakes notebook, not from the textbook. Keep two days a week lighter, and sleep at the same time every night. The last week is for short revision only.\n\n**Need help building your plan?** Our teachers do this with every batch. [Book a free demo class](https://smartupedu.in/demo) or call +91 88919 10919." },
    { "slug": "how-parents-can-help-in-exam-season", "title": "Five ways parents can help during board exam season", "category": "Parent guidance", "publishedAt": "2026-10-06", "excerpt": "Your child does the studying, but home sets the pace. Small, steady habits from parents make a real difference before board exams.",
      "body": "## 1. Keep a steady routine\n\nRegular meals, sleep and study hours matter more than long nights. A predictable day lowers stress for everyone.\n\n## 2. Ask about plans, not marks\n\nInstead of asking for scores, ask what your child will revise today. It keeps the focus on effort they control.\n\n## 3. Make space to study\n\nA quiet corner, good light and a phone parked in another room help more than any new book.\n\n## 4. Stay in touch with teachers\n\nRead the weekly and monthly updates, and come to parent meetings. Teachers can tell you exactly which chapters need attention.\n\n## 5. Celebrate small wins\n\nA finished chapter or a better test score deserves notice. Confidence grows from many small successes.\n\nAt Smartup, parents receive regular progress updates and meet teachers through the year. [Talk to our team](https://smartupedu.in/contact) to learn how it works." },
    { "slug": "daily-practice-beats-cramming", "title": "Why ten minutes of daily practice beats a night of cramming", "category": "Study tips", "publishedAt": "2026-09-29", "excerpt": "Short daily quizzes build memory that lasts until the exam. Here is why, and how to make it a habit.",
      "body": "## Memory needs repetition\n\nWhen you recall something a day after learning it, your brain strengthens the path to that memory. Cramming skips those repeats, so most of it fades within days.\n\n## How we use it in class\n\nEvery Smartup class ends with a short daily quiz on the previous topic. It takes about ten minutes, and it shows students and teachers exactly what needs another look.\n\n## Build the habit at home\n\n- Pick one subject each evening\n- Write five quick questions from today's class\n- Answer them tomorrow before you open the book\n- Mark anything you missed and try it again on Sunday\n\nTen focused minutes a day add up to more than a whole night before the exam — and they leave you rested on exam day." }
  ],
  "faqs": [
    { "category": "Admissions", "question": "Which classes and boards do you teach?", "answer": "Smartup teaches classes 8 to 12 (Plus One and Plus Two) for CBSE and Kerala State Board students, at 9 centres in Kochi and online." },
    { "category": "Admissions", "question": "How do I book a free demo class?", "answer": "Call +91 88919 10919 or visit your nearest centre between 5 and 9 pm. Our team will arrange a free demo class for your child." },
    { "category": "Admissions", "question": "How can I find out about fees and admissions?", "answer": "Call +91 88919 10919 or contact your nearest centre. The team will explain the relevant programme, fees, payment options and current batch availability." },
    { "category": "Programmes", "question": "What is the difference between Smartup Pro, Trio and Power?", "answer": "Smartup Pro is one-to-one, with a student diagnosis, a personalised learning plan, mentorship and monthly parent meetings. Smartup Trio teaches three students together, with mentorship, regular evaluations and parent meetings every two months. Smartup Power is a micro batch with competency-based learning, daily, weekly and monthly evaluations, and quarterly parent meetings." },
    { "category": "Programmes", "question": "How long is each class?", "answer": "In our CBSE programmes, Class 8 sessions run 1 hour 30 minutes, Classes 9 and 10 run 1 hour 45 minutes, and Plus One and Plus Two run 2 hours. State Board sessions run about 2 hours. Each session includes teaching, a short daily quiz, corrections and time for doubts." },
    { "category": "Programmes", "question": "Do you follow my school's syllabus?", "answer": "Yes. Our CBSE programmes strictly follow each student's school syllabus, and State Board classes are built around SCERT texts and board-style questions." },
    { "category": "Programmes", "question": "Can I join a State Board batch?", "answer": "Yes. Contact your nearest centre for the subjects, timings and formats available for your class." },
    { "category": "Parents", "question": "How will I know how my child is doing?", "answer": "Parents in Smartup Pro and Trio receive a weekly update on attendance, topics completed, homework and test performance. Every programme sends a monthly report with marks, improvement, strengths, weak areas, teacher remarks and next month's target." },
    { "category": "Parents", "question": "Will my child have a mentor?", "answer": "Yes. Mentors follow up on attendance, homework and motivation, and keep parents informed. In Smartup Pro each mentor looks after up to 10 students; in Smartup Trio, up to 20." },
    { "category": "Centres and online", "question": "Where are your centres and when are they open?", "answer": "Chullickal, Kadavanthra, Eraveli, Thoppumpady, Palluruthy, Moolamkuzhi, Fort Kochi, Vennala and Edappally. All centres are open from 5 to 9 pm." },
    { "category": "Centres and online", "question": "Can my child study online?", "answer": "Yes. Our CBSE and State Board programmes run online, with an AI-integrated learning app and LMS, WhatsApp learning groups and live exam-preparation sessions on YouTube." },
    { "category": "Centres and online", "question": "Is there a Smartup app?", "answer": "Yes. The Smartup Learning app is on the App Store and Google Play. Students use it for class notes, recorded classes and revision sessions." },
    { "category": "Student life", "question": "What are Coffee With Chairman, Talent Eve and Shoot the Drugs?", "answer": "Coffee With Chairman (CWC) is a mentoring programme led by our Chairman, Mohamed Rayees. Talent Eve is our award ceremony and arts festival. Shoot the Drugs is a sports tournament that spreads awareness against drug abuse." }
  ]
}
JSON
npm run content:reset
```

- [ ] **Step 6: Add LinkedIn to the social icons**

In `src/components/SocialIcon.astro`, widen the prop type to `'facebook' | 'instagram' | 'youtube' | 'linkedin'` and add inside the `<svg>`:

```astro
  {network === 'linkedin' && <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.8v.01M11.5 16v-3.2a2.2 2.2 0 0 1 4.4 0V16M11.5 10.5V16" /></>}
```

- [ ] **Step 7: Support cropping in the media pipeline**

In `src/lib/media.mjs` add:

```js
export function cropBox(width, height, crop) {
  return { left: Math.round(crop.x * width), top: Math.round(crop.y * height), width: Math.round(crop.w * width), height: Math.round(crop.h * height) };
}
```

and inside `validateSources`, after the `from` checks:

```js
    if (s.crop) {
      const { x, y, w, h } = s.crop;
      const ok = [x, y, w, h].every(v => typeof v === 'number' && v >= 0 && v <= 1) && w > 0 && h > 0 && x + w <= 1 && y + h <= 1;
      if (!ok) throw new Error(`${s.name}: crop must be fractions inside the image`);
    }
```

In `scripts/build-media.mjs`, import `cropBox` alongside `variantFiles`, and replace the image `sharp(input)…toFile(out)` line with:

```js
        // failOn: 'none' accepts slightly truncated phone JPEGs; rotate first so crops match what people see.
        const { data, info } = await sharp(input, { failOn: 'none' }).rotate().toBuffer({ resolveWithObject: true });
        const base = s.crop ? sharp(data).extract(cropBox(info.width, info.height, s.crop)) : sharp(data);
        await base.resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
```

- [ ] **Step 8: Add the new media sources**

Append these entries to `data-seed/media-sources.json` (inside the array):

```json
  { "name": "faculty-aflah-kr", "kind": "image", "from": "drive", "id": "16BdGfyJ2MA3Lja18NovSqD5wI54bebWv", "ext": ".jpg" },
  { "name": "faculty-liya-justin", "kind": "image", "from": "drive", "id": "11mUkY8uyeZBtLUW5EOeVrqV70oOSgyRO", "ext": ".jpg" },
  { "name": "faculty-abdul-ahad-ag", "kind": "image", "from": "drive", "id": "193pgvzLeXbKop2zgpodLiV0cS2ojDLER", "ext": ".jpg" },
  { "name": "faculty-anju-s-venu", "kind": "image", "from": "drive", "id": "1ti1eN9NjhLKALBHu2Xcx61_DWVbKQW45", "ext": ".jpg", "crop": { "x": 0, "y": 0, "w": 1, "h": 0.86 } },
  { "name": "faculty-chaitanya-krishna", "kind": "image", "from": "drive", "id": "1sKbQZ8sH2Bg48TD7y3zvDgnyFcDgVWGL", "ext": ".jpg" },
  { "name": "faculty-abhiram", "kind": "image", "from": "drive", "id": "1Mf38BzMl5IS9ZuD24P5BRrWY8U5rYwpL", "ext": ".jpg", "crop": { "x": 0.21, "y": 0.335, "w": 0.53, "h": 0.285 } },
  { "name": "faculty-akza", "kind": "image", "from": "drive", "id": "1Ga70kJt0MK8SpPzuXRklpTSv7KVLDWD6", "ext": ".jpg" },
  { "name": "faculty-ayanarani-k", "kind": "image", "from": "drive", "id": "1KoabHebBIl_7ndxzdVKVOCDartoMrhsm", "ext": ".jpg" },
  { "name": "faculty-ijas-ahammed", "kind": "image", "from": "drive", "id": "1Cz0gEKZDd5R_HorfcYiiRSecYGaCLC8a", "ext": ".jpg" },
  { "name": "faculty-anjali-anand", "kind": "image", "from": "drive", "id": "1krzQCV_acmYZw7knQiQnD9KWPRCCHXy0", "ext": ".jpg", "crop": { "x": 0.05, "y": 0.245, "w": 0.9, "h": 0.5 } },
  { "name": "faculty-jishnu-tk", "kind": "image", "from": "drive", "id": "1ICJOi4uyMFtQuxazbLCVIC9ZtQcESiUf", "ext": ".jpg" },
  { "name": "faculty-manjima-manoj", "kind": "image", "from": "drive", "id": "1u6jWYNsgv6QoX0AY3XgOaMsK_8Ys5dNt", "ext": ".jpg" },
  { "name": "faculty-nair-akhila-suresh", "kind": "image", "from": "drive", "id": "1bOc3FgQfhVp-lUiD8Th_uIvbSXrJZdD4", "ext": ".jpg", "crop": { "x": 0, "y": 0, "w": 1, "h": 0.68 } },
  { "name": "faculty-mohammed-bilal-ks", "kind": "image", "from": "drive", "id": "19O1hNwgmfNI0P70kijVkj1k_5X2s87Qt", "ext": ".jpg" },
  { "name": "faculty-hunais-nk", "kind": "image", "from": "drive", "id": "1aAXn83EMhbiwkMHK6rn4uXQfDxphgx8N", "ext": ".jpg" },
  { "name": "faculty-noorniza", "kind": "image", "from": "drive", "id": "1cu6Ra9dKdFT8zI5Px9GPbX8-QuI7lfIO", "ext": ".jpg" },
  { "name": "faculty-akhinesh-r-prakash", "kind": "image", "from": "drive", "id": "1irfQkiUNYs3gZ6cAGIFO6Pw738sX4Qza", "ext": ".jpg" },
  { "name": "faculty-salih-pr", "kind": "image", "from": "drive", "id": "1i_JFLIjdIeN3M3EjbSHBW9_j5Sj9Yggt", "ext": ".jpg" },
  { "name": "faculty-ibrahim", "kind": "image", "from": "drive", "id": "1JWcxo7LEnyjnW8klt2n95wnQH2MzsIPQ", "ext": ".jpg" },
  { "name": "faculty-muhzeen-pa", "kind": "image", "from": "drive", "id": "1xctQTDufl5F96FfjqkLPpOrcWbWwWbfb", "ext": ".jpg" },
  { "name": "faculty-rohith-krishna-a", "kind": "image", "from": "drive", "id": "1Fj1s8VLdEUKOnQgq2QaAmU00iMWdodw3", "ext": ".jpg" },
  { "name": "faculty-ranjith-ps", "kind": "image", "from": "drive", "id": "1y7qknjYxvdJixWyvoVah51blb6jygFOB", "ext": ".jpg" },
  { "name": "faculty-farhana-naushad", "kind": "image", "from": "drive", "id": "1LyKj2Z3svRH538TWI4-FWX9yGu1vXC2e", "ext": ".jpg" },
  { "name": "faculty-avinash-raj", "kind": "image", "from": "drive", "id": "1X9CKXYI9APwfwexZ_VKfUS8FXjV56mas", "ext": ".jpg" },
  { "name": "faculty-sajith-ts", "kind": "image", "from": "drive", "id": "1UULvyBi95O6mqVfVsQCwDwBJGU-kLR-s", "ext": ".jpg" },
  { "name": "faculty-abhishek-k", "kind": "image", "from": "drive", "id": "1pXIVYKGzOdKZ3QlOa2glVm8CZ6Oq7Znz", "ext": ".jpg" },
  { "name": "faculty-manjusha-madhu", "kind": "image", "from": "drive", "id": "11OCymTTMAhb_F0IrfeHIbLU69Tc1djWL", "ext": ".jpg" },
  { "name": "faculty-fathima-rahfa-k", "kind": "image", "from": "drive", "id": "11c9VoUf9wVdq5nxYwJswbbHv2STwfWkv", "ext": ".jpg" },
  { "name": "faculty-farzana-a-naushad", "kind": "image", "from": "drive", "id": "1qAPQQMCeGi6eSYpqMN_oRZ7wWqlwxUTE", "ext": ".jpg" },
  { "name": "faculty-asif-ali", "kind": "image", "from": "drive", "id": "1E6HhFrGX67V7N5G41Hi883eJlOaSatOL", "ext": ".jpg" },
  { "name": "faculty-saleh-lukman", "kind": "image", "from": "drive", "id": "1mK-yF9NUQPsDp_OCpWbEfTt3wDoV0NkQ", "ext": ".jpg" },
  { "name": "faculty-anzaf", "kind": "image", "from": "drive", "id": "1ixM_v2H-7IkmorebI4Vx2SaCWnlQrdmV", "ext": ".jpg" },
  { "name": "faculty-nebil-navas", "kind": "image", "from": "drive", "id": "16SlwR803SZFwvxkY-ItC1q1ab7Zb4Gya", "ext": ".jpg" },
  { "name": "faculty-mohammed-shafi-vk", "kind": "image", "from": "drive", "id": "1aOdHJ6l06TBIyr9y2RTFW-WeID8arm9N", "ext": ".jpg" },
  { "name": "faculty-rahul-v-rajeev", "kind": "image", "from": "drive", "id": "11m4AiTtA7lbgZZXSPbQoXS6al7xUpZ8z", "ext": ".jpg" },
  { "name": "life-talent-eve-stage", "kind": "image", "from": "drive", "id": "1l5rPA9yAPSF8602s5Ieh1s3aKk1xITTh", "ext": ".jpg" },
  { "name": "life-talent-eve-award", "kind": "image", "from": "drive", "id": "1k9T3X7BcT1I29YBOd-IGtNUAlBckWaV6", "ext": ".jpg" },
  { "name": "life-talent-eve-crown", "kind": "image", "from": "drive", "id": "1_7B5UQZxiCUwAu5sKbwNF6E7t9DMIYeZ", "ext": ".jpg" },
  { "name": "life-talent-eve-dance", "kind": "image", "from": "drive", "id": "1L4bjXYLPedav6DW4z59gVnSMNcbzoqim", "ext": ".jpg" },
  { "name": "life-talent-eve-guitar", "kind": "image", "from": "drive", "id": "1r6KCf5AR6nLEjnVTOaOGR4tgDhGrKbSX", "ext": ".jpg" },
  { "name": "life-talent-eve-band", "kind": "image", "from": "drive", "id": "144URSztRjgxYpegC3VP-QI52rhwOuRju", "ext": ".jpg" },
  { "name": "life-std-march", "kind": "image", "from": "drive", "id": "1AwuM976sAyRTVjaBBKjklVotEEb-T1Wf", "ext": ".jpg" },
  { "name": "life-std-matchday", "kind": "image", "from": "drive", "id": "1AqyhzQD_y_G1kkz12pDr9vWtVsQ_zQVa", "ext": ".jpg" },
  { "name": "life-edx", "kind": "image", "from": "drive", "id": "1Dfw8JicqL2e9R_Uc_kUJ0auQupDXxmfl", "ext": ".jpg" },
  { "name": "result-2026-sslc-107", "kind": "image", "from": "drive", "id": "11--aFNhjLVX7jUMYseCRTrQxre_VB_cI", "ext": ".jpg" },
  { "name": "result-2026-plus-one-toppers", "kind": "image", "from": "drive", "id": "1Eq9vr12OsntmSg0vf3lK2sK9wFdW8My5", "ext": ".jpg" },
  { "name": "result-2026-cbse-salman-faris", "kind": "image", "from": "drive", "id": "1G_KfqfjV68mfhAV5aIuJkBofveCGhsLj", "ext": ".jpg" },
  { "name": "result-2026-cbse-muhammed-safwan", "kind": "image", "from": "drive", "id": "1bcLi2aTLMubV0u-acc0Gk9H3rnt6lBq_", "ext": ".jpg" },
  { "name": "result-2026-cbse-shraavan-madhav", "kind": "image", "from": "drive", "id": "1wUvoQG2cU7r-WayPn0zvYMnewbOrLyLI", "ext": ".jpg" },
  { "name": "result-2026-cbse-muhammed-rayyan", "kind": "image", "from": "drive", "id": "1P0UgCviisEAvRyoG5PpbzZ5ilqpNgWXK", "ext": ".jpg" },
  { "name": "result-2026-cbse-muhammed-farzan", "kind": "image", "from": "drive", "id": "1xYC3b1tydbKoLyV3XhwRK6rXT4zljPAv", "ext": ".jpg" },
  { "name": "result-2026-cbse-ashiq-mohammed", "kind": "image", "from": "drive", "id": "1oOfTUiJ3vXeZP79VyaEwJ0e_ii18Jnq0", "ext": ".jpg" },
  { "name": "result-2026-cbse-indrajith-jayakrishnan", "kind": "image", "from": "drive", "id": "1m9Ckmwtr3JqyIuNf6xX5fG6soQFs8qE1", "ext": ".jpg" },
  { "name": "result-2026-cbse-minnah-shamsu", "kind": "image", "from": "drive", "id": "18PfFWN_pN_jfnjJPa8YHqZrZQrVkgmq8", "ext": ".jpg" },
  { "name": "result-2026-plus-one-athulya", "kind": "image", "from": "drive", "id": "1CKytn-4YcnTWf7oFadzULVlNYsINukHY", "ext": ".jpg" },
  { "name": "result-2026-plus-one-alwin-wilson", "kind": "image", "from": "drive", "id": "1ZnpIM4Q9QHgl5G9gTWeOoYZxRTFIzByI", "ext": ".jpg" },
  { "name": "result-2026-plus-one-hiba-sajeer", "kind": "image", "from": "drive", "id": "1tRH3ZwRXoG6JGi7W8Qq4nCWi6o9bmjUa", "ext": ".jpg" },
  { "name": "result-2026-plus-one-haneena-parveen", "kind": "image", "from": "drive", "id": "1Udc68s2ZAaovAMB-VYCBz5zOon8539b2", "ext": ".jpg" },
  { "name": "result-2026-plus-one-muhammed-jahfar", "kind": "image", "from": "drive", "id": "1kmy_dtkja7Bh3Z_Ut4Kr_pOa-ABMHXwy", "ext": ".jpg" },
  { "name": "result-2026-plus-one-thwalib-nasar", "kind": "image", "from": "drive", "id": "1SvgWOwU61dU9QgRjR05YBdA51C4dQr45", "ext": ".jpg" },
  { "name": "result-2026-plus-one-aliya-pa", "kind": "image", "from": "drive", "id": "1ScvU09JlWDuhybevIfFrVtGLXjITZyBq", "ext": ".jpg" },
  { "name": "result-2026-plus-two-aadhil", "kind": "image", "from": "drive", "id": "1kfiWX6Fd_D8A8Eulg7jbQbGp60KoK1qO", "ext": ".jpg" },
  { "name": "result-2026-plus-two-aiden-clarence", "kind": "image", "from": "drive", "id": "1rX9teQtpx8o2dK3m1zgELouNTvAuJa9Z", "ext": ".jpg" },
  { "name": "result-2026-plus-two-afna-navas", "kind": "image", "from": "drive", "id": "17pcyW6NVD_sGIzoWvM7TiNvmITjbL_xA", "ext": ".jpg" },
  { "name": "result-2026-plus-two-ananya-j", "kind": "image", "from": "drive", "id": "1ml6x0QtLKBTi4q7B8cTk35AfAQEzYMYs", "ext": ".jpg" },
  { "name": "result-2026-plus-two-mohammed-harshad", "kind": "image", "from": "drive", "id": "1iFXwEuWYv6MXTydCbOTE6iX6AMN5038U", "ext": ".jpg" },
  { "name": "result-2026-plus-two-fazlul-fariza", "kind": "image", "from": "drive", "id": "1Cjuhs9Iql8htEjui9aAyMS0_aNpbjwhD", "ext": ".jpg" },
  { "name": "result-2026-plus-two-elvis-christy", "kind": "image", "from": "drive", "id": "1NkNSEuRROJJMU2BU4uNQbfavLer21YuW", "ext": ".jpg" },
  { "name": "result-2026-plus-two-nidha-noufal", "kind": "image", "from": "drive", "id": "1bmUfz0bnCu-wniol6_0Z1fM43Rl5hNGU", "ext": ".jpg" },
  { "name": "result-2026-sslc-shazma-binth-muqthar", "kind": "image", "from": "drive", "id": "1_L24ron465dKHzWafWSOff2Mn2Eztzsd", "ext": ".jpg" },
  { "name": "result-2026-sslc-kailash", "kind": "image", "from": "drive", "id": "17H0wEy6IGDH3-FPJKvdmXsVtI0i-S4B-", "ext": ".jpg" },
  { "name": "result-2026-sslc-mohammed-aamir", "kind": "image", "from": "drive", "id": "1VxH6qCyk-p73Pw37SYeVWpNE4QxMK2uB", "ext": ".jpg" },
  { "name": "result-2026-sslc-abdulla-aa", "kind": "image", "from": "drive", "id": "1gDUk6kvAP51aGWTJR62fBMUcqH1axizv", "ext": ".jpg" },
  { "name": "result-2026-sslc-diya-k-vima", "kind": "image", "from": "drive", "id": "1HHK5o5V_TuSV_zJTjmRO5IRASKCmVUso", "ext": ".jpg" },
  { "name": "result-2025-sslc-100", "kind": "image", "from": "drive", "id": "1e9-9IAzgqkOkwk3PwjmrfXy91YeL8TT9", "ext": ".jpg" },
  { "name": "result-2025-sslc-hanna-fathima", "kind": "image", "from": "drive", "id": "1-IveWhPrMU1c2fjvUqOpIzFqgvdfFoxj", "ext": ".jpg" },
  { "name": "result-2025-sslc-irine-ann-mary", "kind": "image", "from": "drive", "id": "1hR7Y8CcOal5XtdIDx_qbLsNHspH-46S5", "ext": ".jpg" },
  { "name": "result-2025-sslc-haneena", "kind": "image", "from": "drive", "id": "1PLnCWClOofwH0b3bnLdl4rQdXe5OessV", "ext": ".jpg" },
  { "name": "result-2025-sslc-anton-rayen", "kind": "image", "from": "drive", "id": "1xdoZezYmqN2NoROBHbN2oZzMIa4PfmS-", "ext": ".jpg" },
  { "name": "result-2025-sslc-sreeranjini", "kind": "image", "from": "drive", "id": "1qdKy17fW3WpX1iTdJmJmgl9vA2kr4Yqg", "ext": ".jpg" },
  { "name": "result-2025-sslc-darsana", "kind": "image", "from": "drive", "id": "14H2Z8a0GuE8l9H9NqmtVM3n0y7-FfAQ0", "ext": ".jpg" },
  { "name": "result-2025-sslc-farasha-firoz", "kind": "image", "from": "drive", "id": "1pvhWKYisdJOZb_JQhEjfUYJCLjp_QP_f", "ext": ".jpg" },
  { "name": "result-2025-plus-two-angela-ann-fiya", "kind": "image", "from": "drive", "id": "1b72UkvLYfbb3GQrEceLqvtfIBqAU2fhl", "ext": ".jpg" },
  { "name": "result-2025-plus-two-aasia-azeez", "kind": "image", "from": "drive", "id": "1cGcmf-iLLDfZ__9o4MRR97FE2cGo9byU", "ext": ".jpg" },
  { "name": "result-2025-plus-two-afna-suneer", "kind": "image", "from": "drive", "id": "1OsQVcMYmV0AcExkJOlCfUNm5raWSMmuu", "ext": ".jpg" },
  { "name": "result-2025-plus-two-agnus-manuel", "kind": "image", "from": "drive", "id": "1HQIZTMKZgq5NZ7jUBaQKvwKSm-A9IsTM", "ext": ".jpg" },
  { "name": "result-2025-plus-two-amaan-firoz", "kind": "image", "from": "drive", "id": "1PnHnADbaygtI1QmJz8SnqVR9VZB95xEu", "ext": ".jpg" },
  { "name": "result-2025-plus-two-amna-raheem", "kind": "image", "from": "drive", "id": "1jJV121RWi44viuvzXtkdcb6ebeBXq_N3", "ext": ".jpg" },
  { "name": "result-2025-plus-two-serin-mayble", "kind": "image", "from": "drive", "id": "1BxKWKce2KT5_It_DMU_sHlAc4Ep20geU", "ext": ".jpg" },
  { "name": "result-2025-plus-two-amal-antony", "kind": "image", "from": "drive", "id": "1FxcLGfwef_f5h_oCmJR70wCA8owC-7VH", "ext": ".jpg" },
  { "name": "result-2025-plus-two-rugma-ramesh", "kind": "image", "from": "drive", "id": "1Jsdn8skpqBl-OLDDrBv6y_5W6qtjkxJ-", "ext": ".jpg" },
  { "name": "result-2024-plus-one-siya-ps", "kind": "image", "from": "drive", "id": "1aKK9f3ejFUERfzNoFuIEL4gWSEVjTA8r", "ext": ".jpg" },
  { "name": "result-2024-sslc-aysha-mohammed-sunil", "kind": "image", "from": "drive", "id": "1Y3dozC-mdCu0i3o0Ghb2aVh7nPPoxIqd", "ext": ".jpg" },
  { "name": "result-2024-sslc-haleema-jihan", "kind": "image", "from": "drive", "id": "1e5zjVPfm6xcroyBZrOq2QGC-thjNz2eG", "ext": ".jpg" },
  { "name": "result-2024-sslc-devon-moses", "kind": "image", "from": "drive", "id": "1v0hf8vk4atVlmYhNyDvETrKaMLTT5d8q", "ext": ".jpg" },
  { "name": "result-2024-sslc-muhammed-faris", "kind": "image", "from": "drive", "id": "1A-DDUdIq-B15x9QIwVLo9cMJTx_-mPx-", "ext": ".jpg" },
  { "name": "result-2023-sslc-127", "kind": "image", "from": "drive", "id": "1y0U_VHC0i9vczb-C8lYNyEikiYPuSy0M", "ext": ".jpg" },
  { "name": "result-2023-plus-two-aleena-jackson", "kind": "image", "from": "drive", "id": "14LtRjyhxTozX7-rPAifvUGiDQVP9ijDB", "ext": ".jpg" },
  { "name": "result-2023-plus-two-safri-shajahan", "kind": "image", "from": "drive", "id": "1G8Yv54f-mOFCoXCU_Zn8KmsyYzWyJOCL", "ext": ".jpg" },
  { "name": "result-2023-plus-two-fahmitha-salim", "kind": "image", "from": "drive", "id": "1mul0P8mGnxjQMZeO6115vuo4fo_2kELn", "ext": ".jpg" },
  { "name": "result-2023-plus-two-samuel-shibu", "kind": "image", "from": "drive", "id": "1H79S2eTWlRg6JYCemz_j79vwZTElTD8T", "ext": ".jpg" },
  { "name": "result-2023-plus-two-thansa-hr", "kind": "image", "from": "drive", "id": "1ipvCvnwaPtRDlTI-BiXN14mZ1huCN-b6", "ext": ".jpg" },
  { "name": "result-2023-plus-two-maksoodha", "kind": "image", "from": "drive", "id": "1A9_X-9q8gXthwADh5J3Rqw0zxO2MugnJ", "ext": ".jpg" },
  { "name": "result-2023-plus-two-abdul-jezeem", "kind": "image", "from": "drive", "id": "1_iZGTw-4vWD_P6ysA6RFPG00sY4tx8uD", "ext": ".jpg" }
```

Then run: `npm run media`
Expected: 104 new `fetched` and `built` lines; `public/seed holds` stays under 60 MB.

- [ ] **Step 9: Check the new media by eye**

Make a contact sheet of every new `-480.webp` (a short Pillow or sharp script into `tmp/`) and confirm: the four cropped faculty photos show only the person; every faculty name matches its face's file; each result poster's printed name and score match its `headline` in `content.json`. Fix any mismatch in `content.json` and note it in the ledger.

- [ ] **Step 10: Run every test**

Run: `npm run check && npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add server src/lib src/components/SocialIcon.astro scripts data-seed tests public/seed
git commit -m "Add faculty, events, videos, posts, FAQs and full results with their media

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared page parts and the Founders page

**Files:**
- Create: `src/components/PageHero.astro`, `src/components/YouTube.astro`, `src/scripts/youtube.ts`, `src/pages/founders.astro`, `tests/e2e/youtube.spec.ts`
- Modify: `src/scripts/site.ts`, `tests/e2e/pages.ts`, `tests/pages.test.mjs`

**Interfaces:**
- Produces: `PageHero.astro` props `{ eyebrow: string; title: string; highlight?: string; intro?: string; tone?: 'cream' | 'purple' }` (renders the page's only `<h1>`; `highlight` is appended in a yellow marker).
- Produces: `YouTube.astro` props `{ id: string; title: string; format?: 'landscape' | 'portrait' }`; `initYouTube()` from `src/scripts/youtube.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/youtube.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('no YouTube player loads until a video is tapped', async ({ page }) => {
  const youtubeScripts: string[] = [];
  page.on('request', r => { if (/youtube\.com|youtube-nocookie\.com/.test(r.url()) && r.resourceType() !== 'image') youtubeScripts.push(r.url()); });
  await page.goto('/founders');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(youtubeScripts).toEqual([]);
  await page.locator('[data-yt] a').first().click();
  await expect(page.locator('iframe').first()).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1/);
});

test('without JavaScript a video opens on YouTube', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/founders');
  await expect(page.locator('[data-yt] a').first()).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/watch\?v=/);
  await context.close();
});
```

Append to `tests/pages.test.mjs`:

```js
test('Founders lists all four leaders with full bios and Vision 2030', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/founders');
  for (const name of ['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']) assert.match(page, new RegExp(name.replace(/\./g, '\\.')));
  assert.match(page, /Vision 2030/);
  assert.match(page, /The place where academic champions are born/);
});
```

In `tests/e2e/pages.ts` set:

```ts
export const PAGES = ['/', '/story', '/founders', '/does-not-exist'];
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test` then `npm run test:e2e -- tests/e2e/youtube.spec.ts`
Expected: FAIL — `/founders` is a 404.

- [ ] **Step 3: Create the shared parts**

Create `src/components/PageHero.astro`:

```astro
---
interface Props { eyebrow: string; title: string; highlight?: string; intro?: string; tone?: 'cream' | 'purple' }
const { eyebrow, title, highlight, intro, tone = 'cream' } = Astro.props;
---
<section class:list={['page-hero', tone === 'purple' ? 'section--purple' : 'section--cream']}>
  <div class="container">
    <p class="eyebrow">{eyebrow}</p>
    <h1>{title}{highlight && <> <span class="marker">{highlight}</span></>}</h1>
    {intro && <p class="intro">{intro}</p>}
    <slot />
  </div>
</section>
<style>
  .page-hero { padding-block: clamp(3rem, 2rem + 4vw, 5.5rem); }
  .container { display: grid; gap: 1rem; }
  h1 { font-size: var(--step-5); font-weight: 800; letter-spacing: -0.03em; max-width: 16ch; }
  .section--purple h1 { color: var(--white); }
  .intro { font-size: var(--step-1); color: var(--ink-soft); max-width: 42rem; }
  .section--purple .intro { color: var(--on-purple-soft); }
</style>
```

Create `src/components/YouTube.astro`:

```astro
---
interface Props { id: string; title: string; format?: 'landscape' | 'portrait' }
const { id, title, format = 'landscape' } = Astro.props;
---
<figure class:list={['yt', `yt--${format}`]} data-yt={id} data-reveal-item>
  <a class="yt-frame" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener" data-yt-title={title}>
    <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
    <span class="yt-play" aria-hidden="true"></span>
    <span class="sr-only">Play “{title}” (YouTube)</span>
  </a>
  <figcaption>{title}</figcaption>
</figure>
<style>
  .yt { display: grid; gap: 0.6rem; }
  .yt-frame { position: relative; display: block; overflow: hidden; border-radius: var(--radius); background: var(--purple-900); aspect-ratio: 16 / 9; }
  .yt--portrait .yt-frame { aspect-ratio: 9 / 16; }
  .yt-frame img, .yt-frame :global(iframe) { width: 100%; height: 100%; object-fit: cover; border: 0; }
  .yt-play { position: absolute; inset: 50% auto auto 50%; width: 3.5rem; height: 3.5rem; margin: -1.75rem 0 0 -1.75rem; border-radius: 50%; background: var(--yellow); }
  .yt-play::after { content: ''; position: absolute; left: 1.35rem; top: 1.05rem; border: 0.7rem solid transparent; border-left: 1.1rem solid var(--ink); border-right: 0; }
  figcaption { font-weight: 600; }
</style>
```

Create `src/scripts/youtube.ts`:

```ts
/** Swaps a YouTube link for a privacy-enhanced player only after the visitor taps it. */
export function initYouTube() {
  document.querySelectorAll<HTMLElement>('[data-yt]').forEach(figure => {
    const link = figure.querySelector<HTMLAnchorElement>('a.yt-frame');
    const id = figure.dataset.yt;
    if (!link || !id || !/^[\w-]{11}$/.test(id)) return;
    link.addEventListener('click', event => {
      event.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = link.dataset.ytTitle ?? 'YouTube video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      const frame = document.createElement('div');
      frame.className = link.className;
      frame.append(iframe);
      link.replaceWith(frame);
    });
  });
}
```

In `src/scripts/site.ts` add `import { initYouTube } from './youtube';` and call `initYouTube();` after `initVideos();`.

- [ ] **Step 4: Create `src/pages/founders.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SectionHead from '../components/SectionHead.astro';
import Picture from '../components/Picture.astro';
import YouTube from '../components/YouTube.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const leaders = store.leaders();
const talks = store.videos('chairman');
const initiatives = [
  { title: 'Coffee With Chairman', text: 'Mentoring sessions where students meet the Chairman to talk about goals, discipline and confidence.' },
  { title: 'Talent Eve', text: 'Our award ceremony and arts festival, recognising achievement and talent in every batch.' },
  { title: 'Shoot the Drugs', text: 'A sports tournament that carries an anti-drug message to students and their families.' },
];
---
<Base title="Founders" description="Meet the founders of Smartup: Mohamed Rayees, Dhanesh Narayanan Achari, Mohamed Shihas K. Y. and Shanu K. Y." page="founders">
  <PageHero eyebrow="Founders" title="The people behind" highlight="Smartup" intro={settings.positioning} />

  {leaders.length > 0 && (
    <section class="section" aria-labelledby="leaders-title">
      <div class="container">
        <h2 id="leaders-title" class="sr-only">Leadership</h2>
        <div class="leaders">
          {leaders.map(leader => (
            <article class="leader" data-reveal>
              {leader.photo && <div class="photo"><Picture base={leader.photo} alt={leader.photoAlt} sizes="(min-width: 900px) 24rem, 90vw" /></div>}
              <div class="text">
                <p class="role">{leader.role}</p>
                <h3>{leader.name}</h3>
                <p>{leader.bio || leader.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )}

  <section class="section section--cream" aria-labelledby="initiatives-title">
    <div class="container">
      <SectionHead eyebrow="Beyond the classroom" title="Initiatives led by our Chairman" id="initiatives-title" link={{ href: '/life', label: 'See Life @ Smartup' }} />
      <ul class="initiatives" data-reveal="group">
        {initiatives.map(i => <li data-reveal-item><h3>{i.title}</h3><p>{i.text}</p></li>)}
      </ul>
    </div>
  </section>

  <section class="section section--purple" aria-labelledby="vision-title">
    <div class="container vision" data-reveal>
      <p class="eyebrow">Vision 2030</p>
      <h2 id="vision-title">Mentoring beyond Class 12</h2>
      <p>{settings.vision?.vision2030}</p>
      <p class="mission"><strong>Our mission.</strong> {settings.mission}</p>
    </div>
  </section>

  {talks.length > 0 && (
    <section class="section" aria-labelledby="talks-title">
      <div class="container">
        <SectionHead eyebrow="From the Chairman" title="Talks and messages" id="talks-title" />
        <div class="rail talks" data-reveal="group">{talks.map(v => <YouTube id={v.youtubeId} title={v.title} format={v.format} />)}</div>
      </div>
    </section>
  )}
</Base>
<style>
  .leaders { display: grid; gap: clamp(2.5rem, 2rem + 3vw, 4.5rem); }
  .leader { display: grid; gap: 1.5rem; align-items: center; }
  .photo { border-radius: var(--radius); overflow: hidden; background: var(--purple-tint); }
  .photo :global(img) { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; object-position: center 22%; }
  .text { display: grid; gap: 0.6rem; max-width: 40rem; }
  .role { font-weight: 600; color: var(--purple); }
  .leader h3 { font-size: var(--step-3); font-weight: 800; }
  .initiatives { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  .initiatives li { padding: 1.5rem; border-radius: var(--radius); background: var(--white); display: grid; gap: 0.5rem; }
  .initiatives h3 { font-size: var(--step-1); }
  .vision { display: grid; gap: 1rem; max-width: 46rem; }
  .vision h2 { font-size: var(--step-4); font-weight: 800; color: var(--white); }
  .vision p { font-size: var(--step-1); color: var(--on-purple-soft); }
  .talks { grid-auto-columns: min(80%, 22rem); }
  @media (min-width: 900px) {
    .leader { grid-template-columns: 22rem 1fr; gap: 3rem; }
    .leader:nth-child(even) { grid-template-columns: 1fr 22rem; }
    .leader:nth-child(even) .photo { order: 2; }
  }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/youtube.spec.ts tests/e2e/layout.spec.ts tests/e2e/motion.spec.ts`
Expected: PASS (the JS budget test stays under 50 KB).

- [ ] **Step 6: Check it by eye** at 375px and desktop: photos alternate sides on desktop, bios readable, tapping a talk plays it in place.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add page hero, click-to-load YouTube and the Founders page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Filter chips and the Faculty ("Our team") page

**Files:**
- Create: `src/components/FilterChips.astro`, `src/scripts/filters.ts`, `src/pages/faculty.astro`, `tests/e2e/filters.spec.ts`
- Modify: `src/scripts/site.ts`, `tests/e2e/pages.ts`, `tests/pages.test.mjs`

**Interfaces:**
- Produces: `FilterChips.astro` props `{ label: string; target: string; options: { value: string; label: string }[] }` — `target` is the id of the list; list items carry `data-filter-tags="a b"`. `initFilters()` from `src/scripts/filters.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/filters.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('choosing a subject shows only that group', async ({ page }) => {
  await page.goto('/faculty');
  const people = page.locator('#team-list > li');
  const total = await people.count();
  await page.getByRole('button', { name: 'Chemistry' }).click();
  await expect(page.getByRole('button', { name: 'Chemistry' })).toHaveAttribute('aria-pressed', 'true');
  const visible = await people.evaluateAll(items => items.filter(i => !(i as HTMLElement).hidden).length);
  expect(visible).toBe(5);
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(people.filter({ visible: true })).toHaveCount(total);
});

test('without JavaScript everyone is listed and the chips are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/faculty');
  await expect(page.locator('#team-list > li')).toHaveCount(35);
  await expect(page.getByRole('button', { name: 'Chemistry' })).toBeHidden();
  await context.close();
});
```

Append to `tests/pages.test.mjs`:

```js
test('Faculty lists every published team member with qualifications', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/faculty');
  assert.equal([...page.matchAll(/data-filter-tags=/g)].length, 35);
  assert.match(page, /Aflah K\. R\./);
  assert.match(page, /MSc Botany/);
});

test('an empty faculty table shows a friendly message and no filter bar', async t => {
  const site = await start(content => content.db.exec('UPDATE faculty SET published = 0'));
  t.after(site.close);
  const page = await site.html('/faculty');
  assert.match(page, /Our team will be introduced here soon/);
  assert.doesNotMatch(page, /data-filter-for/);
});
```

In `tests/e2e/pages.ts` add `'/faculty'` before `'/does-not-exist'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — `/faculty` returns 404.

- [ ] **Step 3: Create the filter chips**

Create `src/components/FilterChips.astro`:

```astro
---
interface Props { label: string; target: string; options: { value: string; label: string }[] }
const { label, target, options } = Astro.props;
---
<div class="chips" role="group" aria-label={label} data-filter-for={target} hidden>
  <button type="button" data-filter="all" aria-pressed="true">Everyone</button>
  {options.map(o => <button type="button" data-filter={o.value} aria-pressed="false">{o.label}</button>)}
</div>
<style>
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem; }
  .chips[hidden] { display: none; }
  button { min-height: 44px; padding: 0.5rem 1.1rem; border: 1px solid var(--line); border-radius: 999px; background: var(--white); font: 600 0.95rem var(--font); color: var(--ink); cursor: pointer; }
  button[aria-pressed='true'] { background: var(--purple); border-color: var(--purple); color: var(--white); }
</style>
```

Create `src/scripts/filters.ts`:

```ts
/** Chip bars filter a list by data-filter-tags; without this script every item stays visible and the bar stays hidden. */
export function initFilters() {
  document.querySelectorAll<HTMLElement>('[data-filter-for]').forEach(bar => {
    const list = document.getElementById(bar.dataset.filterFor ?? '');
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-filter-tags]'));
    const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
    bar.hidden = false;
    buttons.forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.filter ?? 'all';
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      items.forEach(item => { item.hidden = value !== 'all' && !(item.dataset.filterTags ?? '').split(' ').includes(value); });
    }));
  });
}
```

In `src/scripts/site.ts` add `import { initFilters } from './filters';` and call `initFilters();` after `initTabs();`.

- [ ] **Step 4: Create `src/pages/faculty.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import FilterChips from '../components/FilterChips.astro';
import Picture from '../components/Picture.astro';
import { getStore } from '../lib/store';
const team = getStore(Astro.locals).faculty();
const groups = [
  { value: 'mathematics', label: 'Mathematics' }, { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' }, { value: 'biology', label: 'Biology' },
  { value: 'commerce', label: 'Commerce' }, { value: 'humanities', label: 'Humanities' },
  { value: 'team', label: 'Academic team' },
].filter(g => team.some(p => p.team === g.value));
---
<Base title="Our team" description="Meet the Smartup teachers and academic team: qualified, experienced and focused on every student." page="faculty">
  <PageHero eyebrow="Faculty" title="Teachers who know" highlight="your child" intro="Experienced, qualified teachers and an academic team that follows every student's progress." />
  <section class="section" aria-labelledby="team-title">
    <div class="container">
      <h2 id="team-title" class="sr-only">Our team</h2>
      {team.length === 0 ? <p class="empty">Our team will be introduced here soon.</p> : (
        <>
          <FilterChips label="Filter by subject" target="team-list" options={groups} />
          <ul id="team-list" class="team" data-reveal="group">
            {team.map(person => (
              <li class="person" data-filter-tags={person.team} data-reveal-item>
                {person.photo && <div class="photo"><Picture base={person.photo} alt={`Portrait of ${person.name}`} sizes="(min-width: 1200px) 14rem, (min-width: 600px) 30vw, 45vw" /></div>}
                <h3>{person.name}</h3>
                <p class="role">{person.role}</p>
                {person.qualification && <p class="qual">{person.qualification}</p>}
                {person.note && <p class="note">{person.note}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  </section>
</Base>
<style>
  .team { list-style: none; padding: 0; display: grid; gap: 1.75rem 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .person { display: grid; gap: 0.2rem; align-content: start; }
  .person[hidden] { display: none; }
  .photo { margin-bottom: 0.6rem; border-radius: var(--radius-sm); overflow: hidden; background: var(--purple-tint); }
  .photo :global(img) { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; object-position: center 20%; }
  h3 { font-size: var(--step-0); font-weight: 700; }
  .role { font-weight: 600; color: var(--purple); font-size: var(--step--1); }
  .qual, .note { font-size: var(--step--1); color: var(--ink-soft); }
  .empty { font-size: var(--step-1); }
  @media (min-width: 600px) { .team { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (min-width: 1200px) { .team { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/filters.spec.ts tests/e2e/layout.spec.ts`
Expected: PASS.

- [ ] **Step 6: Check it by eye** — 2 columns at 375px, 5 on desktop; faces framed; filtering instant.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add subject filter chips and the Our team page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The Results page

**Files:**
- Create: `src/pages/results.astro`
- Modify: `src/components/ResultCard.astro`, `tests/e2e/pages.ts`, `tests/pages.test.mjs`, `tests/e2e/filters.spec.ts`

**Interfaces:**
- Consumes: `results()` with `kind` (Task 2), `videos('toppers')`, `FilterChips`, `YouTube` (Tasks 3–4).
- Produces: `ResultCard` accepts `result.kind`; summary cards render the headline large with no poster crop; student cards keep the poster. Each poster links to its full-size `-1600.webp`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('Results groups every result by year, newest first, each naming its exam and year', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/results');
  const years = [...page.matchAll(/<section[^>]*data-year="(\d{4})"/g)].map(m => m[1]);
  assert.deepEqual(years, ['2026', '2025', '2024', '2023', '2020']);
  assert.match(page, /127 students with Full A\+/);
  assert.match(page, /SSLC · 2023/);
  assert.match(page, /href="\/seed\/img\/result-2026-sslc-107-1600\.webp"/);
});

test('Results without any rows shows a friendly message', async t => {
  const site = await start(content => content.db.exec('UPDATE results SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/results'), /Results will be published here soon/);
});
```

Append to `tests/e2e/filters.spec.ts`:

```ts
test('choosing a year on Results shows only that year', async ({ page }) => {
  await page.goto('/results');
  await page.getByRole('button', { name: '2023' }).click();
  await expect(page.locator('section[data-year]:visible')).toHaveCount(1);
  await expect(page.locator('section[data-year="2023"]')).toBeVisible();
});
```

In `tests/e2e/pages.ts` add `'/results'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — `/results` returns 404.

- [ ] **Step 3: Update `src/components/ResultCard.astro`**

```astro
---
import Picture from './Picture.astro';
interface Props { result: { year: string; exam: string; headline: string; detail: string; poster: string; posterAlt: string; kind?: string } }
const { result } = Astro.props;
const summary = result.kind === 'summary';
---
<article class:list={['result', { summary }]} data-reveal-item>
  {result.poster && (
    <a class="poster" href={`${result.poster}-1600.webp`} target="_blank" rel="noopener" aria-label={`Open the result poster: ${result.posterAlt}`}>
      <Picture base={result.poster} alt={result.posterAlt} sizes="(min-width: 900px) 18rem, 78vw" />
    </a>
  )}
  <p class="meta">{result.exam} · {result.year}</p>
  <h3>{result.headline}</h3>
  {result.detail && <p class="detail">{result.detail}</p>}
</article>
<style>
  .result { display: grid; gap: 0.35rem; align-content: start; padding: 0.75rem 0.75rem 1.25rem; border-radius: var(--radius); background: var(--white); }
  .poster { display: block; margin-bottom: 0.6rem; border-radius: var(--radius-sm); overflow: hidden; background: var(--purple-tint); }
  .poster :global(img) { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; object-position: top; }
  .meta { padding-inline: 0.25rem; font-size: var(--step--1); font-weight: 600; color: var(--purple); }
  h3 { padding-inline: 0.25rem; font-size: var(--step-1); font-weight: 700; }
  .detail { padding-inline: 0.25rem; color: var(--ink-soft); font-size: var(--step--1); }
  .summary { background: var(--purple); color: var(--cream); }
  .summary .meta { color: var(--on-purple-soft); }
  .summary h3 { font-size: var(--step-2); color: var(--white); }
  .summary .detail { color: var(--on-purple-soft); }
</style>
```

- [ ] **Step 4: Create `src/pages/results.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import FilterChips from '../components/FilterChips.astro';
import ResultCard from '../components/ResultCard.astro';
import SectionHead from '../components/SectionHead.astro';
import YouTube from '../components/YouTube.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const results = store.results();
const years = [...new Set(results.map(r => r.year))].sort((a, b) => b.localeCompare(a));
const byYear = years.map(year => ({ year, summaries: results.filter(r => r.year === year && r.kind === 'summary'), students: results.filter(r => r.year === year && r.kind !== 'summary') }));
const toppers = store.videos('toppers');
---
<Base title="Results" description="Smartup board exam results: SSLC, Plus One, Plus Two and CBSE Class 10, year by year." page="results">
  <PageHero eyebrow="Results" title="Results our students" highlight="earned" intro="Every result names its exam and year, as published by Smartup. Tap a poster to see it in full." />
  <section class="section section--cream" aria-labelledby="results-title">
    <div class="container" id="results-years">
      <h2 id="results-title" class="sr-only">Results by year</h2>
      {years.length === 0 ? <p class="empty">Results will be published here soon.</p> : (
        <>
          <FilterChips label="Filter by year" target="results-years" options={years.map(y => ({ value: y, label: y }))} />
          {byYear.map(group => (
            <section class="year" data-year={group.year} data-filter-tags={group.year} aria-labelledby={`year-${group.year}`}>
              <h3 id={`year-${group.year}`} class="year-title">{group.year}</h3>
              {group.summaries.length > 0 && <div class="summaries" data-reveal="group">{group.summaries.map(r => <ResultCard result={r} />)}</div>}
              {group.students.length > 0 && <div class="students" data-reveal="group">{group.students.map(r => <ResultCard result={r} />)}</div>}
            </section>
          ))}
        </>
      )}
    </div>
  </section>
  {toppers.length > 0 && (
    <section class="section" aria-labelledby="toppers-title">
      <div class="container">
        <SectionHead eyebrow="Toppers Talk" title="Hear it from our toppers" id="toppers-title" />
        <div class="rail toppers" data-reveal="group">{toppers.map(v => <YouTube id={v.youtubeId} title={v.title} format={v.format} />)}</div>
      </div>
    </section>
  )}
</Base>
<style>
  .year { display: grid; gap: 1.25rem; padding-bottom: clamp(2.5rem, 2rem + 3vw, 4rem); }
  .year[hidden] { display: none; }
  .year-title { font-size: var(--step-4); font-weight: 800; color: var(--purple); }
  .summaries, .students { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); }
  .students { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .empty { font-size: var(--step-1); }
  .toppers { grid-auto-columns: min(80%, 22rem); }
  @media (min-width: 600px) { .students { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (min-width: 1200px) { .students { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/filters.spec.ts tests/e2e/layout.spec.ts tests/e2e/home.spec.ts`
Expected: PASS (the homepage still shows its four featured results).

- [ ] **Step 6: Check it by eye** — summary cards purple and prominent; student posters in 2 columns at 375px; a poster tap opens the full image.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add the Results page grouped by year with full posters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Life @ Smartup and Videos pages

**Files:**
- Create: `src/pages/life.astro`, `src/pages/videos.astro`
- Modify: `tests/pages.test.mjs`, `tests/e2e/pages.ts`

**Interfaces:**
- Consumes: `events()`, `videos(category)`, `FilterChips`, `YouTube`, `Picture`, `PageHero`, `SectionHead`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('Life @ Smartup lists every event with its category', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/life');
  for (const title of ['Talent Eve 7.0', 'Shoot the Drugs', 'Coffee With Chairman', 'Onam']) assert.match(page, new RegExp(title));
  assert.match(page, /data-filter-tags="talent-eve"/);
});

test('Videos groups videos into their categories and links to the channels', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/videos');
  for (const heading of ['Live classes', 'Exam preparation', 'Short lessons', 'Toppers Talk', 'From the Chairman', 'Events']) assert.match(page, new RegExp(heading));
  assert.match(page, /youtube\.com\/@smartupeducations/);
  assert.doesNotMatch(page, /<iframe/);
});

test('an empty events table shows a friendly message', async t => {
  const site = await start(content => content.db.exec('UPDATE events SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/life'), /New photos and stories are on their way/);
});
```

In `tests/e2e/pages.ts` add `'/life', '/videos'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — both pages return 404.

- [ ] **Step 3: Create `src/pages/life.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import FilterChips from '../components/FilterChips.astro';
import Picture from '../components/Picture.astro';
import YouTube from '../components/YouTube.astro';
import { getStore } from '../lib/store';
const events = getStore(Astro.locals).events();
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const categories = [...new Set(events.map(e => e.category))].map(c => ({ value: slug(c), label: c }));
---
<Base title="Life @ Smartup" description="Talent Eve, Shoot the Drugs, Coffee With Chairman, celebrations, trips and more — student life at Smartup." page="life">
  <PageHero eyebrow="Life @ Smartup" title="Not just tuition —" highlight="the whole experience" intro="Award nights, sports, mentoring, festivals and trips: the moments students remember alongside their results." />
  <section class="section" aria-labelledby="events-title">
    <div class="container">
      <h2 id="events-title" class="sr-only">Events and activities</h2>
      {events.length === 0 ? <p class="empty">New photos and stories are on their way.</p> : (
        <>
          <FilterChips label="Filter by activity" target="event-list" options={categories} />
          <div id="event-list" class="events">
            {events.map(event => (
              <article class="event" data-filter-tags={slug(event.category)} data-reveal>
                <header>
                  <p class="eyebrow">{event.category}{event.dateLabel && <> · {event.dateLabel}</>}</p>
                  <h3>{event.title}</h3>
                  {event.summary && <p class="summary">{event.summary}</p>}
                </header>
                {(event.media.length > 0 || event.youtubeId) && (
                  <div class="gallery rail">
                    {event.youtubeId && <YouTube id={event.youtubeId} title={`${event.title} on YouTube`} />}
                    {event.media.map(m => <figure class="shot"><Picture base={m.src} alt={m.alt} sizes="(min-width: 900px) 22rem, 80vw" /></figure>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  </section>
</Base>
<style>
  .events { display: grid; gap: clamp(3rem, 2.5rem + 3vw, 5rem); }
  .event { display: grid; gap: 1.25rem; }
  .event[hidden] { display: none; }
  header { display: grid; gap: 0.5rem; max-width: 42rem; }
  h3 { font-size: var(--step-3); font-weight: 800; }
  .summary { color: var(--ink-soft); }
  .gallery { grid-auto-columns: min(85%, 22rem); }
  .shot { border-radius: var(--radius); overflow: hidden; background: var(--purple-tint); }
  .shot :global(img) { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
  .empty { font-size: var(--step-1); }
</style>
```

- [ ] **Step 4: Create `src/pages/videos.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SectionHead from '../components/SectionHead.astro';
import YouTube from '../components/YouTube.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const groups = [
  { id: 'classes', eyebrow: 'Learn', title: 'Live classes' },
  { id: 'exam-prep', eyebrow: 'Revise', title: 'Exam preparation' },
  { id: 'short-lessons', eyebrow: 'One minute', title: 'Short lessons' },
  { id: 'toppers', eyebrow: 'Inspire', title: 'Toppers Talk' },
  { id: 'chairman', eyebrow: 'Mentor', title: 'From the Chairman' },
  { id: 'events', eyebrow: 'Celebrate', title: 'Events' },
].map(g => ({ ...g, videos: store.videos(g.id) })).filter(g => g.videos.length > 0);
---
<Base title="YouTube classes" description="Free Smartup classes, question paper workouts, short lessons and Toppers Talk on YouTube." page="videos">
  <PageHero eyebrow="Videos" title="Learn with Smartup on" highlight="YouTube" intro="Live classes, question paper workouts and short lessons from our teachers — free for every student.">
    <p class="channels"><a class="btn btn--primary" href="https://www.youtube.com/@smartupeducations" target="_blank" rel="noopener">Smartup Educations channel</a><a class="btn btn--ghost" href="https://www.youtube.com/@smartup-cbse" target="_blank" rel="noopener">Smartup CBSE channel</a></p>
  </PageHero>
  {groups.map((group, i) => (
    <section class:list={['section', { 'section--cream': i % 2 === 1 }]} aria-labelledby={`videos-${group.id}`}>
      <div class="container">
        <SectionHead eyebrow={group.eyebrow} title={group.title} id={`videos-${group.id}`} />
        <div class:list={['rail', 'videos', { portrait: group.videos.every(v => v.format === 'portrait') }]} data-reveal="group">
          {group.videos.map(v => <YouTube id={v.youtubeId} title={v.title} format={v.format} />)}
        </div>
      </div>
    </section>
  ))}
</Base>
<style>
  .channels { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
  .videos { grid-auto-columns: min(82%, 22rem); }
  .videos.portrait { grid-auto-columns: min(55%, 14rem); }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/layout.spec.ts tests/e2e/youtube.spec.ts`
Expected: PASS.

- [ ] **Step 6: Check it by eye** — Life galleries swipe with a peeking next photo; Videos thumbnails load as you scroll; Shorts are tall.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add Life @ Smartup and YouTube classes pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Testimonials and Alumni pages

**Files:**
- Create: `src/pages/testimonials.astro`, `src/pages/alumni.astro`
- Modify: `tests/pages.test.mjs`, `tests/e2e/pages.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('Testimonials shows student and parent videos, and hides Google Reviews until a link is set', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/testimonials');
  assert.equal([...page.matchAll(/<video /g)].length, 3);
  assert.match(page, /Smartup through a parent/);
  assert.doesNotMatch(page, /Google Reviews/);
});

test('a Google Reviews link appears once it is set', async t => {
  const site = await start(content => content.db.prepare("UPDATE settings SET value = ? WHERE key = 'googleReviewsUrl'").run(JSON.stringify('https://g.page/r/example/review')));
  t.after(site.close);
  assert.match(await site.html('/testimonials'), /href="https:\/\/g\.page\/r\/example\/review"/);
});

test('Alumni shows the alumni videos and an invitation to share a story', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/alumni');
  assert.equal([...page.matchAll(/<video /g)].length, 3);
  assert.match(page, /mailto:info@smartupedu\.in\?subject=/);
});
```

In `tests/e2e/pages.ts` add `'/testimonials', '/alumni'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — both pages return 404.

- [ ] **Step 3: Create `src/pages/testimonials.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SectionHead from '../components/SectionHead.astro';
import VideoCard from '../components/VideoCard.astro';
import QuoteCard from '../components/QuoteCard.astro';
import YouTube from '../components/YouTube.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const items = store.testimonials('feedback');
const videos = items.filter(i => i.kind === 'video');
const written = items.filter(i => i.kind === 'written');
const parentClips = store.videos('parents');
---
<Base title="Testimonials" description="Students and parents on learning at Smartup, in their own words." page="testimonials">
  <PageHero eyebrow="Testimonials" title="In their" highlight="own words" intro="Students and parents share what changed after joining Smartup." />
  {videos.length > 0 && (
    <section class="section" aria-labelledby="student-videos">
      <div class="container">
        <SectionHead eyebrow="Students" title="Student stories" id="student-videos" />
        <div class="rail tall" data-reveal="group">{videos.map(item => <VideoCard item={item} />)}</div>
      </div>
    </section>
  )}
  {parentClips.length > 0 && (
    <section class="section section--cream" aria-labelledby="parent-videos">
      <div class="container">
        <SectionHead eyebrow="Parents" title="What parents say" id="parent-videos" />
        <div class="rail tall" data-reveal="group">{parentClips.map(v => <YouTube id={v.youtubeId} title={v.title} format={v.format} />)}</div>
      </div>
    </section>
  )}
  {written.length > 0 && (
    <section class="section" aria-labelledby="written-reviews">
      <div class="container">
        <SectionHead eyebrow="Reviews" title="Written reviews" id="written-reviews" />
        <div class="quotes" data-reveal="group">{written.map(item => <QuoteCard item={item} />)}</div>
      </div>
    </section>
  )}
  {settings.googleReviewsUrl && (
    <section class="section section--purple">
      <div class="container cta" data-reveal>
        <h2>Read our Google Reviews</h2>
        <a class="btn btn--yellow" href={settings.googleReviewsUrl} target="_blank" rel="noopener">See Google Reviews</a>
      </div>
    </section>
  )}
</Base>
<style>
  .tall { grid-auto-columns: min(60%, 15rem); }
  .quotes { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }
  .cta { display: grid; gap: 1rem; justify-items: start; }
  .cta h2 { font-size: var(--step-3); font-weight: 800; color: var(--white); }
</style>
```

- [ ] **Step 4: Create `src/pages/alumni.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SectionHead from '../components/SectionHead.astro';
import VideoCard from '../components/VideoCard.astro';
import QuoteCard from '../components/QuoteCard.astro';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const alumni = store.testimonials('alumni');
const mail = `mailto:${settings.email}?subject=${encodeURIComponent('My Smartup alumni story')}`;
---
<Base title="Alumni" description="Smartup alumni share where their journey has taken them." page="alumni">
  <PageHero eyebrow="Alumni" title="Where Smartup" highlight="students go" intro="Our students carry Smartup with them into higher education and careers." tone="purple" />
  {alumni.length > 0 && (
    <section class="section" aria-labelledby="alumni-stories">
      <div class="container">
        <SectionHead eyebrow="Stories" title="Alumni journeys" id="alumni-stories" />
        <div class="rail tall" data-reveal="group">{alumni.map(item => item.kind === 'video' ? <VideoCard item={item} /> : <QuoteCard item={item} />)}</div>
      </div>
    </section>
  )}
  <section class="section section--cream">
    <div class="container cta" data-reveal>
      <p class="eyebrow">Vision 2030</p>
      <h2>500+ Smartup-mentored professionals on one stage</h2>
      <p>{settings.vision?.vision2030}</p>
      <a class="btn btn--primary" href={mail}>Share your alumni story</a>
    </div>
  </section>
</Base>
<style>
  .tall { grid-auto-columns: min(60%, 15rem); }
  .cta { display: grid; gap: 1rem; justify-items: start; max-width: 46rem; }
  .cta h2 { font-size: var(--step-3); font-weight: 800; }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/layout.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "Add Testimonials and Alumni pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Courses page

**Files:**
- Modify: `src/data/courses.ts`
- Create: `src/pages/courses.astro`
- Modify tests: `tests/pages.test.mjs`, `tests/e2e/pages.ts`

**Interfaces:**
- Produces: `courseBoards` programmes gain `features: string[]`; new exports `classDurations: {level: string; minutes: number}[]`, `sessionPlan: {step: string; minutes: number}[]`, `parentUpdates: {name: string; who: string; covers: string[]}[]`, `mentorRatios: {programme: string; ratio: string}[]`, `stateProgramme: {method: string[]; session: {step: string; minutes: number}[]; practice: string[]; examPrep: string[]}`.

- [ ] **Step 1: Write the failing test**

Append to `tests/pages.test.mjs`:

```js
test('Courses explains every programme, class lengths and parent updates', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/courses');
  for (const text of ['Smartup Pro', 'Smartup Trio', 'Smartup Power', 'State Board programme', '1 hr 45 min', 'Monthly report', '1 mentor : 10 students', 'Previous Year Questions']) assert.match(page, new RegExp(text));
  assert.match(page, /9 centres/);
});
```

In `tests/e2e/pages.ts` add `'/courses'`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `/courses` returns 404.

- [ ] **Step 3: Extend `src/data/courses.ts`**

Add `features: string[]` to the `Programme` type and to each programme (wording from `SMARTUP CBSE.pdf`):

- Smartup Pro: `['Student diagnosis', 'Personalised learning plan', 'AI-integrated learning app and LMS', 'Strictly follows your school syllabus', 'Competency-based learning', 'Experienced in-house teaching panel', 'Daily, weekly and monthly evaluations', 'Academic counselling panel', 'Mentorship and support', 'Monthly parent meeting', 'WhatsApp learning groups and resources']`
- Smartup Trio: `['AI-integrated learning app and LMS', 'Strictly follows your school syllabus', 'Competency-based learning', 'Experienced teaching panel', 'Daily, weekly and monthly evaluations', 'Mentorship and support', 'Parent meeting every two months', 'WhatsApp learning groups and resources']`
- Smartup Power: `['AI-integrated learning app and LMS', 'Competency-based learning', 'Experienced teaching panel', 'Daily, weekly and monthly evaluations', 'Quarterly parent meeting', 'WhatsApp learning groups and resources']`
- State Board programme: `['Question-oriented teaching by experienced Smartup teachers', 'Concepts taught through exam-style questions', 'Competency-based learning', 'Familiarity with the board exam pattern']`

Append:

```ts
export const classDurations = [
  { level: 'Class 8', minutes: 90 },
  { level: 'Classes 9 and 10', minutes: 105 },
  { level: 'Plus One and Plus Two', minutes: 120 },
];

export const sessionPlan = [
  { step: 'Teaching and concept delivery', minutes: 60 },
  { step: 'Daily quiz or poll (DCC)', minutes: 10 },
  { step: 'Correction', minutes: 5 },
  { step: 'Doubts and discussion', minutes: 15 },
];

export const mentorRatios = [
  { programme: 'Smartup Pro', ratio: '1 mentor : 10 students' },
  { programme: 'Smartup Trio', ratio: '1 mentor : 20 students' },
];

export const parentUpdates = [
  { name: 'Weekly update', who: 'Smartup Pro and Trio', covers: ['Attendance', 'Topics completed', 'Homework status', 'Test performance and improvement'] },
  { name: 'Monthly report', who: 'Every programme', covers: ['Marks', 'Improvement', 'Strengths', 'Weak areas', 'Teacher remarks', "Next month's target"] },
];

export const stateProgramme = {
  method: ['Concept delivery through exam-based questions', 'Chapter-wise explanation of SCERT texts', 'Previous Year Questions in every class', 'Board-exam-oriented teaching'],
  session: [
    { step: 'Teaching session', minutes: 90 },
    { step: 'Break', minutes: 5 },
    { step: 'Daily quiz (DCC)', minutes: 10 },
    { step: 'Doubt clearance', minutes: 15 },
  ],
  practice: ['A daily workout of PYQs, expected board questions and SCERT exercises, due the next day', 'Step-by-step solutions for every workout', 'WhatsApp learning groups with notes, MCQs and exam tips', 'A quarterly grand test with rank analysis and a performance report'],
  examPrep: ['Sure-shot questions, live on YouTube', 'Most-expected questions and important derivations, live', 'PYQ marathon sessions', 'Rapid revision classes, recorded', 'Late Night Express revision on the app'],
};

export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
```

- [ ] **Step 4: Create `src/pages/courses.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SectionHead from '../components/SectionHead.astro';
import { courseBoards, classDurations, sessionPlan, mentorRatios, parentUpdates, stateProgramme, formatMinutes } from '../data/courses';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const centres = store.centres();
const cbse = courseBoards.find(b => b.id === 'cbse')!;
const state = courseBoards.find(b => b.id === 'state')!;
---
<Base title="Courses" description="Smartup programmes for CBSE and Kerala State Board: Pro, Trio, Power and the State Board programme, online and at 9 centres in Kochi." page="courses">
  <PageHero eyebrow="Courses" title="Programmes built around" highlight="every student" intro="CBSE and Kerala State Board, classes 8 to 12 — online, or at one of our centres in Kochi." />

  <section class="section" aria-labelledby="cbse-title">
    <div class="container">
      <SectionHead eyebrow="CBSE" title={cbse.heading} id="cbse-title" />
      <div class="programmes" data-reveal="group">
        {cbse.programmes.map(p => (
          <article class="programme" data-reveal-item>
            <p class="eyebrow">{p.eyebrow}</p>
            <p class="ratio">{p.ratio}</p>
            <h3>{p.name}</h3>
            <ul>{p.features.map(f => <li>{f}</li>)}</ul>
            <a class="link-arrow" href="/demo">{p.ask}</a>
          </article>
        ))}
      </div>
    </div>
  </section>

  <section class="section section--cream" aria-labelledby="class-title">
    <div class="container two">
      <div data-reveal>
        <SectionHead eyebrow="Every class" title="How long, and what happens" id="class-title" />
        <table>
          <caption class="sr-only">Class length by level</caption>
          <tbody>{classDurations.map(d => <tr><th scope="row">{d.level}</th><td>{formatMinutes(d.minutes)}</td></tr>)}</tbody>
        </table>
      </div>
      <ol class="steps" data-reveal="group">
        {sessionPlan.map(s => <li data-reveal-item><strong>{s.step}</strong><span>{formatMinutes(s.minutes)}</span></li>)}
      </ol>
    </div>
  </section>

  <section class="section" aria-labelledby="parents-title">
    <div class="container">
      <SectionHead eyebrow="For parents" title="You always know how your child is doing" id="parents-title" />
      <div class="updates" data-reveal="group">
        {parentUpdates.map(u => <article class="update" data-reveal-item><h3>{u.name}</h3><p class="who">{u.who}</p><ul>{u.covers.map(c => <li>{c}</li>)}</ul></article>)}
        <article class="update" data-reveal-item><h3>Mentors</h3><p class="who">Follow-up, attendance, homework, motivation and parent communication</p><ul>{mentorRatios.map(m => <li>{m.programme}: {m.ratio}</li>)}</ul></article>
      </div>
    </div>
  </section>

  <section class="section section--deep" aria-labelledby="state-title">
    <div class="container">
      <SectionHead eyebrow="Kerala State Board" title={state.heading} intro={state.programmes[0].features[0]} id="state-title" />
      <div class="state" data-reveal="group">
        <article data-reveal-item><h3>Teaching method</h3><ul>{stateProgramme.method.map(m => <li>{m}</li>)}</ul></article>
        <article data-reveal-item><h3>Each class, about 2 hours</h3><ul>{stateProgramme.session.map(s => <li>{s.step}: {formatMinutes(s.minutes)}</li>)}</ul></article>
        <article data-reveal-item><h3>Daily practice</h3><ul>{stateProgramme.practice.map(m => <li>{m}</li>)}</ul></article>
        <article data-reveal-item><h3>Before the exams</h3><ul>{stateProgramme.examPrep.map(m => <li>{m}</li>)}</ul></article>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="where-title">
    <div class="container" data-reveal>
      <SectionHead eyebrow="Online or offline" title={`Learn from home, or at ${centres.length} centres`} intro={`Every centre is open ${settings.hours}.`} id="where-title" link={{ href: '/contact', label: 'Find your nearest centre' }} />
      <a class="btn btn--primary" href="/demo">Book a free demo class</a>
    </div>
  </section>
</Base>
<style>
  .programmes { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
  .programme { display: grid; gap: 0.6rem; align-content: start; padding: 1.5rem; border: 1px solid var(--line); border-radius: var(--radius); }
  .ratio { font-size: var(--step-4); font-weight: 800; color: var(--purple); line-height: 1; }
  h3 { font-size: var(--step-1); }
  ul { padding-left: 1.1rem; display: grid; gap: 0.3rem; }
  .programme ul, .update ul { color: var(--ink-soft); }
  .two { display: grid; gap: 2rem; }
  table { width: 100%; border-collapse: collapse; font-size: var(--step-1); }
  th, td { padding: 0.75rem 0; border-bottom: 1px solid #ddd2c2; text-align: left; }
  td { text-align: right; font-weight: 700; color: var(--purple); }
  .steps { list-style: none; padding: 0; display: grid; gap: 0.75rem; counter-reset: s; }
  .steps li { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; border-radius: var(--radius-sm); background: var(--white); }
  .updates, .state { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  .update { padding: 1.5rem; border-radius: var(--radius); background: var(--cream); display: grid; gap: 0.5rem; align-content: start; }
  .who { font-weight: 600; color: var(--purple); font-size: var(--step--1); }
  .state article { padding: 1.5rem; border-radius: var(--radius); background: var(--purple-600); display: grid; gap: 0.6rem; align-content: start; }
  .state h3 { color: var(--white); }
  .state ul { color: var(--on-purple-soft); }
  @media (min-width: 900px) { .two { grid-template-columns: 1fr 1fr; align-items: end; } }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/layout.spec.ts tests/e2e/home.spec.ts`
Expected: PASS (homepage course tabs still show the short `points`).

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "Add the Courses page from the client's programme documents

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Blog list and post pages

**Files:**
- Create: `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`
- Modify tests: `tests/pages.test.mjs`, `tests/e2e/pages.ts`, `tests/routing.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('the blog lists posts newest first and each post renders its body', async t => {
  const site = await start();
  t.after(site.close);
  const list = await site.html('/blog');
  const slugs = [...list.matchAll(/href="\/blog\/([a-z0-9-]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(slugs)], ['board-exam-90-day-plan', 'how-parents-can-help-in-exam-season', 'daily-practice-beats-cramming']);
  const post = await site.html('/blog/board-exam-90-day-plan');
  assert.match(post, /<h2>Days 1–30: finish the first round<\/h2>/);
  assert.match(post, /<article/);
});

test('a post body cannot inject HTML', async t => {
  const site = await start(content => content.db.prepare("UPDATE posts SET body = '<img src=x onerror=alert(1)>' WHERE slug = 'daily-practice-beats-cramming'").run());
  t.after(site.close);
  const post = await site.html('/blog/daily-practice-beats-cramming');
  assert.doesNotMatch(post, /<img src=x/);
  assert.match(post, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('an empty blog shows a friendly message', async t => {
  const site = await start(content => content.db.exec('UPDATE posts SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/blog'), /First articles are on their way/);
});
```

Append to `tests/routing.test.mjs`:

```js
test('an unknown blog post returns the branded 404', async () => {
  const r = await fetch(base + '/blog/no-such-post');
  assert.equal(r.status, 404);
  assert.match(await r.text(), /This page isn't here yet/);
});
```

In `tests/e2e/pages.ts` add `'/blog', '/blog/board-exam-90-day-plan'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — `/blog` returns 404.

- [ ] **Step 3: Create `src/pages/blog/index.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import PageHero from '../../components/PageHero.astro';
import { getStore } from '../../lib/store';
const posts = getStore(Astro.locals).posts();
const date = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
---
<Base title="Blog" description="Exam preparation, study tips and guidance for parents from the Smartup academic team." page="blog">
  <PageHero eyebrow="Blog" title="Ideas for better" highlight="exam days" intro="Exam preparation, study tips and guidance for parents from the Smartup academic team." />
  <section class="section" aria-labelledby="posts-title">
    <div class="container">
      <h2 id="posts-title" class="sr-only">Articles</h2>
      {posts.length === 0 ? <p class="empty">First articles are on their way.</p> : (
        <ul class="posts" data-reveal="group">
          {posts.map(p => (
            <li class="post" data-reveal-item>
              <p class="eyebrow">{p.category}</p>
              <h3><a href={`/blog/${p.slug}`}>{p.title}</a></h3>
              <p class="excerpt">{p.excerpt}</p>
              <p class="meta"><time datetime={p.publishedAt}>{date(p.publishedAt)}</time> · {p.author}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
</Base>
<style>
  .posts { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); }
  .post { display: grid; gap: 0.6rem; align-content: start; padding: 1.5rem; border: 1px solid var(--line); border-radius: var(--radius); }
  h3 { font-size: var(--step-2); }
  h3 a { text-decoration: none; }
  h3 a:hover { color: var(--purple); }
  .excerpt { color: var(--ink-soft); }
  .meta { font-size: var(--step--1); color: var(--ink-soft); }
  .empty { font-size: var(--step-1); }
</style>
```

- [ ] **Step 4: Create `src/pages/blog/[slug].astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import { getStore } from '../../lib/store';
import { renderMarkdown } from '../../lib/markdown.mjs';
const post = getStore(Astro.locals).post(Astro.params.slug ?? '');
if (!post) return Astro.rewrite('/404');
const date = new Date(`${post.publishedAt}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const html = renderMarkdown(post.body);
---
<Base title={post.title} description={post.excerpt} page="post">
  <article class="section">
    <div class="container post">
      <p class="eyebrow"><a href="/blog">Blog</a> · {post.category}</p>
      <h1>{post.title}</h1>
      <p class="meta"><time datetime={post.publishedAt}>{date}</time> · {post.author}</p>
      <div class="body" set:html={html} />
      <aside class="cta">
        <p><strong>Want a plan for your child?</strong> Our teachers can help.</p>
        <a class="btn btn--primary" href="/demo">Book a free demo class</a>
      </aside>
    </div>
  </article>
</Base>
<style>
  .post { display: grid; gap: 1rem; max-width: 44rem; }
  .eyebrow a { color: inherit; }
  h1 { font-size: var(--step-4); font-weight: 800; }
  .meta { color: var(--ink-soft); font-size: var(--step--1); }
  .body { display: grid; gap: 1rem; margin-top: 1rem; font-size: 1.125rem; line-height: 1.7; }
  .body :global(h2) { font-size: var(--step-2); margin-top: 1rem; }
  .body :global(ul), .body :global(ol) { padding-left: 1.25rem; display: grid; gap: 0.4rem; }
  .body :global(a) { color: var(--purple); font-weight: 600; }
  .cta { display: grid; gap: 1rem; justify-items: start; margin-top: 2rem; padding: 1.5rem; border-radius: var(--radius); background: var(--cream); }
</style>
```

- [ ] **Step 5: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/layout.spec.ts`
Expected: PASS. (`Astro.rewrite('/404')` was verified on Astro 7.3.8 during planning: it renders `src/pages/404.astro` with status 404.)

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "Add the blog list and post pages with safe Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Ask Smartup, App and Community pages

**Files:**
- Create: `src/pages/ask.astro`, `src/pages/app.astro`, `src/pages/community.astro`, `src/scripts/faq-search.ts`, `tests/e2e/ask.spec.ts`
- Modify: `src/scripts/site.ts`, `tests/pages.test.mjs`, `tests/e2e/pages.ts`

**Interfaces:**
- Produces: `initFaqSearch()` — filters `[data-faq]` items by a search box `#faq-search` and shows `#faq-none` when nothing matches.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/ask.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('searching the FAQ narrows the list and says when nothing matches', async ({ page }) => {
  await page.goto('/ask');
  const items = page.locator('[data-faq]');
  // "syllabus" appears in exactly one answer ("mentor" would also match "mentorship" and "mentoring").
  await page.getByLabel('Search questions').fill('syllabus');
  await expect(items.filter({ visible: true })).toHaveCount(1);
  await page.getByLabel('Search questions').fill('zzzz');
  await expect(items.filter({ visible: true })).toHaveCount(0);
  await expect(page.locator('#faq-none')).toBeVisible();
});

test('answers open and close as native disclosures', async ({ page }) => {
  await page.goto('/ask');
  const first = page.locator('[data-faq] summary').first();
  await first.click();
  await expect(page.locator('[data-faq] details').first()).toHaveAttribute('open', '');
});
```

Append to `tests/pages.test.mjs`:

```js
test('Ask Smartup lists FAQs and offers a phone and email fallback', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/ask');
  assert.equal([...page.matchAll(/data-faq/g)].length, 13);
  assert.match(page, /href="tel:\+918891910919"/);
  assert.match(page, /mailto:info@smartupedu\.in/);
});

test('App and Community pages link to the stores and every social channel', async t => {
  const site = await start();
  t.after(site.close);
  const app = await site.html('/app');
  assert.match(app, /apps\.apple\.com\/in\/app\/smartup-learning/);
  assert.match(app, /play\.google\.com\/store\/apps\/details\?id=com\.paperlms\.smartup/);
  const community = await site.html('/community');
  assert.equal([...community.matchAll(/class="channel"/g)].length, 7);
});
```

In `tests/e2e/pages.ts` add `'/ask', '/app', '/community'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — the three pages return 404.

- [ ] **Step 3: Create the FAQ search script**

Create `src/scripts/faq-search.ts`:

```ts
export function initFaqSearch() {
  const input = document.getElementById('faq-search') as HTMLInputElement | null;
  const none = document.getElementById('faq-none');
  if (!input) return;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-faq]'));
  input.closest('form')?.removeAttribute('hidden');
  input.addEventListener('input', () => {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach(item => {
      const text = item.textContent?.toLowerCase() ?? '';
      const match = terms.every(t => text.includes(t));
      item.hidden = !match;
      if (match) shown++;
    });
    if (none) none.hidden = shown > 0;
  });
}
```

In `src/scripts/site.ts` add `import { initFaqSearch } from './faq-search';` and call `initFaqSearch();` after `initFilters();`.

- [ ] **Step 4: Create `src/pages/ask.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const faqs = store.faqs();
const categories = [...new Set(faqs.map(f => f.category))];
const mail = `mailto:${settings.email}?subject=${encodeURIComponent('A question for Smartup')}`;
---
<Base title="Ask Smartup" description="Answers to common questions about Smartup classes, programmes, centres and admissions." page="ask">
  <PageHero eyebrow="Ask Smartup" title="Questions," highlight="answered" intro="Search the questions parents and students ask most. Can't find yours? Ask us directly.">
    <form class="search" role="search" hidden onsubmit="return false">
      <label for="faq-search">Search questions</label>
      <input id="faq-search" type="search" placeholder="Try “fees”, “mentor” or “online”" autocomplete="off" />
    </form>
  </PageHero>
  <section class="section" aria-labelledby="faq-title">
    <div class="container narrow">
      <h2 id="faq-title" class="sr-only">Frequently asked questions</h2>
      {faqs.length === 0 && <p>Answers to common questions will appear here soon.</p>}
      {categories.map(category => (
        <div class="group">
          <h3 class="eyebrow">{category}</h3>
          {faqs.filter(f => f.category === category).map(f => (
            <div class="faq" data-faq>
              <details><summary>{f.question}</summary><p>{f.answer}</p></details>
            </div>
          ))}
        </div>
      ))}
      <p id="faq-none" class="none" hidden>No questions match. Ask us below.</p>
    </div>
  </section>
  <section class="section section--purple" aria-labelledby="ask-us">
    <div class="container ask" data-reveal>
      <h2 id="ask-us">Still have a question?</h2>
      <p>Our team answers every day from 5 to 9 pm.</p>
      <div class="actions">
        {settings.phone && <a class="btn btn--yellow" href={`tel:${settings.phone}`}>Call {formatPhone(settings.phone)}</a>}
        {settings.whatsapp && <a class="btn btn--ghost" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener">WhatsApp us</a>}
        <a class="btn btn--ghost" href={mail}>Email your question</a>
      </div>
    </div>
  </section>
</Base>
<style>
  .search { display: grid; gap: 0.4rem; max-width: 32rem; margin-top: 0.5rem; }
  .search[hidden] { display: none; }
  label { font-weight: 600; }
  input { min-height: 3rem; padding: 0 1rem; border: 1px solid var(--line); border-radius: 999px; font: 1rem var(--font); }
  .narrow { max-width: 48rem; }
  .group { display: grid; gap: 0.5rem; margin-bottom: 2rem; }
  .faq[hidden] { display: none; }
  details { border-bottom: 1px solid var(--line); }
  summary { min-height: 44px; padding: 1rem 0; font-weight: 600; cursor: pointer; list-style-position: outside; }
  details p { padding-bottom: 1rem; color: var(--ink-soft); }
  .ask { display: grid; gap: 1rem; justify-items: start; }
  .ask h2 { font-size: var(--step-4); font-weight: 800; color: var(--white); }
  .ask p { color: var(--on-purple-soft); }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .actions .btn--ghost { color: var(--white); }
</style>
```

- [ ] **Step 5: Create `src/pages/app.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import Owl from '../components/Owl.astro';
import { getStore } from '../lib/store';
const settings = getStore(Astro.locals).settings();
const features = [
  { title: 'Notes from every class', text: 'Class notes are shared through the app, so revision starts where the lesson ended.' },
  { title: 'Recorded classes', text: 'Catch up on recorded classes within the week, at your own pace.' },
  { title: 'Late Night Express', text: 'Quick revision sessions on the app before board exams.' },
  { title: 'AI-integrated learning and LMS', text: 'Tracks practice and progress alongside live classes and daily quizzes.' },
];
---
<Base title="Smartup App" description="The Smartup Learning app: class notes, recorded classes and revision in one place. On the App Store and Google Play." page="app">
  <PageHero eyebrow="Smartup App" title="Your classes, notes and revision" highlight="in one place" intro="Smartup Learning is our AI-integrated learning app and LMS, used by students in every programme." tone="purple">
    <div class="stores">
      <a class="btn btn--yellow" href={settings.appLinks?.ios} target="_blank" rel="noopener">Download on the App Store</a>
      <a class="btn btn--ghost" href={settings.appLinks?.android} target="_blank" rel="noopener">Get it on Google Play</a>
    </div>
  </PageHero>
  <section class="section" aria-labelledby="features-title">
    <div class="container">
      <h2 id="features-title" class="title">What students use it for</h2>
      <ul class="features" data-reveal="group">{features.map(f => <li data-reveal-item><h3>{f.title}</h3><p>{f.text}</p></li>)}</ul>
    </div>
  </section>
  <section class="section section--cream">
    <div class="container quest" data-reveal>
      <Owl size="5rem" badge />
      <div><h2>Try Smartup Quest</h2><p>A free learning challenge for Classes 5 to 10 that shows where your child stands in each subject.</p><a class="link-arrow" href="/assessment/">Start Smartup Quest</a></div>
    </div>
  </section>
</Base>
<style>
  .stores { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
  .stores .btn--ghost { color: var(--white); }
  .title { font-size: var(--step-4); font-weight: 800; margin-bottom: 2rem; }
  .features { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); }
  .features li { padding: 1.5rem; border: 1px solid var(--line); border-radius: var(--radius); display: grid; gap: 0.5rem; }
  .features h3 { font-size: var(--step-1); }
  .features p { color: var(--ink-soft); }
  .quest { display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; }
  .quest h2 { font-size: var(--step-3); font-weight: 800; }
</style>
```

- [ ] **Step 6: Create `src/pages/community.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SocialIcon from '../components/SocialIcon.astro';
import { getStore } from '../lib/store';
const settings = getStore(Astro.locals).settings();
const describe = { facebook: 'News, results and event photos', instagram: 'Reels, results and student life', youtube: 'Free classes, workouts and events', linkedin: 'Company news and careers' } as Record<string, string>;
---
<Base title="Community" description="Join the Smartup community on Instagram, YouTube, Facebook and LinkedIn." page="community">
  <PageHero eyebrow="Community" title="Join the Smartup" highlight="community" intro="Follow us for free classes, study tips, results and student life. Enrolled students also get WhatsApp learning groups with notes, MCQs and exam tips." />
  <section class="section" aria-labelledby="channels-title">
    <div class="container">
      <h2 id="channels-title" class="sr-only">Our channels</h2>
      <ul class="channels" data-reveal="group">
        {settings.social.map((s: any) => (
          <li data-reveal-item>
            <a class="channel" href={s.url} target="_blank" rel="noopener">
              <span class="icon"><SocialIcon network={s.network} /></span>
              <span><strong>{s.label}</strong><span class="desc">{describe[s.network]}</span></span>
            </a>
          </li>
        ))}
      </ul>
      {settings.communityLinks?.length > 0 && (
        <div class="groups"><h3>Student groups</h3><ul>{settings.communityLinks.map((g: any) => <li><a class="link-arrow" href={g.url} target="_blank" rel="noopener">{g.label}</a></li>)}</ul></div>
      )}
    </div>
  </section>
</Base>
<style>
  .channels { list-style: none; padding: 0; display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); }
  .channel { display: flex; gap: 1rem; align-items: center; min-height: 44px; padding: 1.1rem 1.25rem; border: 1px solid var(--line); border-radius: var(--radius); text-decoration: none; }
  .channel:hover { border-color: var(--purple); }
  .icon { display: grid; place-items: center; width: 48px; height: 48px; flex: none; border-radius: 50%; background: var(--purple-tint); color: var(--purple); }
  .channel strong { display: block; }
  .desc { display: block; font-size: var(--step--1); color: var(--ink-soft); }
  .groups { margin-top: 2.5rem; display: grid; gap: 0.5rem; }
  .groups ul { list-style: none; padding: 0; }
</style>
```

- [ ] **Step 7: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/ask.spec.ts tests/e2e/layout.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src tests
git commit -m "Add Ask Smartup with FAQ search, the App page and the Community page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Contact, Careers and an interim Demo page

**Files:**
- Create: `src/pages/contact.astro`, `src/pages/careers.astro`, `src/pages/demo.astro`
- Modify tests: `tests/pages.test.mjs`, `tests/e2e/pages.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('Contact lists every centre, all phone numbers and the registered office', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/contact');
  assert.equal([...page.matchAll(/class="centre"/g)].length, 9);
  for (const tel of ['+918891910919', '+917356072079', '+917994436060']) assert.match(page, new RegExp(`href="tel:\\${tel}"`));
  assert.match(page, /Smartup Eduventures Private Limited/);
  assert.match(page, /Kadavanthra, Ernakulam 682020/);
});

test('Careers groups openings by type and each one has an email to apply', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/careers');
  assert.equal([...page.matchAll(/mailto:info@smartupedu\.in\?subject=Application/g)].length, 12);
  for (const type of ['Full time', 'Part time', 'Teaching assistant', 'Other']) assert.match(page, new RegExp(`<h2[^>]*>${type}`));
});

test('Careers without openings says so and still invites applications', async t => {
  const site = await start(content => content.db.exec('UPDATE jobs SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/careers'), /No openings right now/);
});

test('the demo page explains how to book and lists centre phones', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/demo');
  assert.match(page, /<h1[^>]*>Book a free/);
  assert.ok([...page.matchAll(/href="tel:\+91/g)].length >= 10);
});

test('every menu link resolves to a page', async t => {
  const site = await start();
  t.after(site.close);
  const { navGroups, quickLinks } = await import('../src/lib/nav.ts');
  const links = new Set([...navGroups.flatMap(g => g.links), ...quickLinks].map(l => l.href));
  for (const href of links) await site.html(href);
});
```

In `tests/e2e/pages.ts` add `'/contact', '/careers', '/demo'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL — the three pages return 404 (and the menu test fails on them).

- [ ] **Step 3: Create `src/pages/contact.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const centres = store.centres();
---
<Base title="Centres & contact" description="Smartup centres in Kochi, phone numbers, email and our registered office." page="contact">
  <PageHero eyebrow="Centres & contact" title="Visit us, call us," highlight="ask us anything" intro={`${centres.length} centres across Kochi, all open ${settings.hours}.`} />
  <section class="section" aria-labelledby="centres-title">
    <div class="container">
      <h2 id="centres-title" class="title">Our centres</h2>
      <ul class="centres" data-reveal="group">
        {centres.map(c => (
          <li class="centre" data-reveal-item>
            <h3>{c.name}</h3>
            <p class="hours">Open {c.hours}</p>
            <div class="actions"><a class="btn btn--primary" href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a><a class="link-arrow" href={c.mapUrl} target="_blank" rel="noopener">Directions</a></div>
          </li>
        ))}
      </ul>
    </div>
  </section>
  <section class="section section--cream" aria-labelledby="reach-title">
    <div class="container reach" data-reveal>
      <div>
        <h2 id="reach-title" class="title">Talk to our team</h2>
        <ul class="lines">
          {settings.phones.map((p: string) => <li><a href={`tel:${p}`}>{formatPhone(p)}</a></li>)}
          <li><a href={`mailto:${settings.email}`}>{settings.email}</a></li>
          {settings.whatsapp && <li><a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener">WhatsApp us</a></li>}
        </ul>
      </div>
      {settings.registeredOffice && (
        <address>
          <strong>{settings.legalName}</strong><br />
          Registered office: {settings.registeredOffice.address}<br />
          <a class="link-arrow" href={settings.registeredOffice.mapUrl} target="_blank" rel="noopener">Open in Maps</a>
        </address>
      )}
    </div>
  </section>
</Base>
<style>
  .title { font-size: var(--step-4); font-weight: 800; margin-bottom: 2rem; }
  .centres { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
  .centre { display: grid; gap: 0.6rem; padding: 1.5rem; border: 1px solid var(--line); border-radius: var(--radius); }
  h3 { font-size: var(--step-2); }
  .hours { color: var(--ink-soft); }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
  .reach { display: grid; gap: 2rem; }
  .lines { list-style: none; padding: 0; display: grid; gap: 0.5rem; font-size: var(--step-1); font-weight: 600; }
  .lines a { text-decoration: none; }
  address { font-style: normal; line-height: 1.7; }
  @media (min-width: 900px) { .reach { grid-template-columns: 1fr 1fr; } }
</style>
```

- [ ] **Step 4: Create `src/pages/careers.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const jobs = store.jobs();
const types = [...new Set(jobs.map(j => j.type))];
const apply = (title: string) => `mailto:${settings.email}?subject=${encodeURIComponent(`Application: ${title}`)}`;
---
<Base title="Careers" description="Teach with Smartup: current openings for teachers, teaching assistants, counsellors and mentors in Kochi." page="careers">
  <PageHero eyebrow="Careers" title="Teach with" highlight="Smartup" intro="Join a team of teachers and mentors helping thousands of students across Kochi." />
  <section class="section" aria-label="Current openings">
    <div class="container">
      {jobs.length === 0 && <p class="empty">No openings right now — but we'd still like to hear from you.</p>}
      {types.map(type => (
        <div class="group">
          <h2 class="type">{type}</h2>
          <ul class="jobs" data-reveal="group">
            {jobs.filter(j => j.type === type).map(job => (
              <li class="job" data-reveal-item>
                <div><h3>{job.title}</h3>{job.location && <p class="location">{job.location}</p>}</div>
                <a class="btn btn--primary" href={apply(job.title)}>Apply by email</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
  <section class="section section--cream">
    <div class="container how" data-reveal>
      <h2>How to apply</h2>
      <p>Email your CV to <a href={`mailto:${settings.email}`}>{settings.email}</a> with the role in the subject line{settings.phone && <>, or call <a href={`tel:${settings.phone}`}>{formatPhone(settings.phone)}</a></>}.</p>
    </div>
  </section>
</Base>
<style>
  .group { display: grid; gap: 1rem; margin-bottom: 2.5rem; }
  .type { font-size: var(--step-3); font-weight: 800; color: var(--purple); }
  .jobs { list-style: none; padding: 0; display: grid; gap: 0.75rem; }
  .job { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; border: 1px solid var(--line); border-radius: var(--radius); }
  h3 { font-size: var(--step-1); }
  .location { color: var(--ink-soft); font-size: var(--step--1); }
  .empty { font-size: var(--step-1); margin-bottom: 2rem; }
  .how { display: grid; gap: 0.75rem; max-width: 44rem; }
  .how h2 { font-size: var(--step-3); font-weight: 800; }
  .how a { color: var(--purple); font-weight: 600; }
</style>
```

- [ ] **Step 5: Create `src/pages/demo.astro`** (interim — Phase 3 adds the booking form)

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const centres = store.centres();
const steps = ['Call us or visit a centre between 5 and 9 pm', 'Tell us your class, board and subjects', 'Join a free demo class, online or at a centre'];
---
<Base title="Book a free demo class" description="Book a free Smartup demo class online or at one of our centres in Kochi." page="demo">
  <PageHero eyebrow="Free demo class" title="Book a free" highlight="demo class" intro="See how Smartup teaches before you decide. It takes one call." tone="purple">
    <div class="actions">
      {settings.phone && <a class="btn btn--yellow" href={`tel:${settings.phone}`}>Call {formatPhone(settings.phone)}</a>}
      {settings.whatsapp && <a class="btn btn--ghost" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I would like to book a free demo class.')}`} target="_blank" rel="noopener">WhatsApp us</a>}
    </div>
  </PageHero>
  <section class="section" aria-labelledby="steps-title">
    <div class="container">
      <h2 id="steps-title" class="title">How it works</h2>
      <ol class="steps" data-reveal="group">{steps.map((s, i) => <li data-reveal-item><span class="n">{i + 1}</span>{s}</li>)}</ol>
    </div>
  </section>
  <section class="section section--cream" aria-labelledby="near-title">
    <div class="container">
      <h2 id="near-title" class="title">Or call your nearest centre</h2>
      <ul class="near">{centres.map(c => <li><span>{c.name}</span><a href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a></li>)}</ul>
    </div>
  </section>
</Base>
<style>
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
  .actions .btn--ghost { color: var(--white); }
  .title { font-size: var(--step-3); font-weight: 800; margin-bottom: 1.5rem; }
  .steps { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  .steps li { display: grid; gap: 0.75rem; padding: 1.5rem; border: 1px solid var(--line); border-radius: var(--radius); font-weight: 600; }
  .n { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--purple); color: var(--white); font-weight: 800; }
  .near { list-style: none; padding: 0; display: grid; gap: 0.25rem; max-width: 32rem; }
  .near li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #ddd2c2; }
  .near a { font-weight: 600; text-decoration: none; color: var(--purple); }
</style>
```

- [ ] **Step 6: Run the tests**

Run: `npm test && npm run test:e2e -- tests/e2e/layout.spec.ts`
Expected: PASS, including "every menu link resolves to a page".

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add Contact, Careers and an interim Demo page; every menu link now resolves

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Phase 2 verification and hand-off

**Files:**
- Modify: `DESIGN.md`, `README.md` (one line each)

- [ ] **Step 1: Run the full suite from clean**

```bash
rm -rf build tmp/e2e-data
npm run check && npm test && npm run test:e2e
```

Expected: all PASS, including the 360px overflow check across every page in `PAGES`.

- [ ] **Step 2: Measure mobile Lighthouse on the heaviest pages**

```bash
npm run build && (PORT=3000 DATA_DIR=tmp/lh-data node server.mjs & echo $! > tmp/server.pid); sleep 2
for p in results faculty life videos; do npx --yes lighthouse "http://localhost:3000/$p" --only-categories=performance,accessibility --output=json --output-path="tmp/lh-$p.json" --chrome-flags="--headless=new" --quiet; done
kill "$(cat tmp/server.pid)"
node -e "for (const p of ['results','faculty','life','videos']) { const r = JSON.parse(require('fs').readFileSync('tmp/lh-'+p+'.json')); console.log(p, 'performance', Math.round(r.categories.performance.score*100), 'accessibility', Math.round(r.categories.accessibility.score*100), 'LCP', r.audits['largest-contentful-paint'].displayValue); }"
```

Expected: performance ≥ 90 and accessibility ≥ 95 on each. If not, fix the specific audits Lighthouse names and ledger what changed.

- [ ] **Step 3: Update the docs**

Append to the v2 section of `DESIGN.md`: "Phase 2 adds Founders, Our team, Results, Life @ Smartup, Videos, Testimonials, Alumni, Courses, Blog, Ask Smartup, App, Community, Contact, Careers and an interim Demo page. Lists filter with chip bars that show everything without JavaScript; YouTube videos load only when tapped, from youtube-nocookie.com." Add to `README.md` under Preview: "After pulling Phase 2, run `npm run content:reset` once so local content picks up the new seed."

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md README.md
git commit -m "Document Phase 2 pages and the one-time content reset

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand off**

Report in plain language: pages built, Lighthouse scores, and the items for the client to approve before launch — the three starter blog posts, the FAQ answers, faculty roles and photos, result transcriptions, and the class range ("8 to +2" vs "Grades 1–12"). Do not deploy.
