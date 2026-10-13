# Smartup v2 — Phase 3: Admin Panel and Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Smartup staff run the website without code. This phase adds an admin panel for every content section, the settings, photos and the enquiry inboxes, and turns the Demo, Careers and Ask pages into working forms. It also clears the Phase 2 follow-ups, so the whole site is ready for the client preview.

**Architecture:**
- **API routes.** New routes plug into the existing Quest handler, which already owns admin sign-in, the same-origin checks and the rate limiter. Public forms live at `/api/forms/:kind`; staff routes live under `/api/admin/…`.
- **One schema file.** `server/admin-schema.mjs` describes every editable section and every settings field. The server validates against it and the admin UI draws its forms from it, so adding a field takes one line.
- **Inboxes.** Inbox entries live in their own tables (`server/inbox.mjs`).
- **Uploaded photos.** sharp re-encodes each upload into `DATA_DIR/uploads`, and the server serves it at `/media/…`. Files use the `-480/-960/-1600.webp` names that the `Picture` component already uses.
- **Admin UI.** The admin UI is a static Astro page at `/admin`. Its vanilla TypeScript builds DOM nodes from API data and never builds HTML strings.

**Tech Stack:** Node 24 (node:sqlite, node:http), Astro 7.3.8 SSR, vanilla TypeScript, sharp 0.35.5 (moved to runtime dependencies), node:test, Playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-10-08-smartup-v2-website-design.md`

## Global Constraints

- Node.js ≥ 24. Add no new runtime dependencies; the only change is moving `sharp` from devDependencies to dependencies.
- Mobile-first: no horizontal scroll at 360px, tap targets ≥ 44px, body text ≥ 16px. Form inputs are 16px so iOS does not zoom.
- Brand: Rubik only on public pages and purple `#5f2ea8` as the main colour. Yellow `#ede60f` is an accent only, with at most one yellow call-to-action per screen. English only; no Malayalam.
- Forms (from the spec):
  - Server-side validation of lengths, the Indian phone format and class 5–12.
  - A honeypot field.
  - A per-IP rate limit that reuses v1's limiter.
  - A JSON body of at most 20 KB.
  - A short data notice above each submit button.
  - After submitting, a confirmation screen. It shows "Continue on WhatsApp" only when `settings.whatsapp` is set; otherwise it shows the phone number.
- Image upload: JPEG/PNG/WebP up to 10 MB. sharp re-encodes each one to WebP at 480/960/1600px widths, stores it in `DATA_DIR/uploads`, and the server serves it at `/media/…`. Alt text is required.
- Admin: staff sign in with the existing `ADMIN_PASSWORD`. The UI is plain and conventional, usable on a phone and optimised for desktop.
- Blog Markdown: raw HTML never renders. Posts use the escape-first renderer in `src/lib/markdown.mjs`.
- No-JS: text, navigation and form fallbacks all work without JavaScript. Forms post natively and then redirect.
- Marketing pages ship at most 50 KB of gzipped JS (admin excluded). Lighthouse mobile scores are ≥ 90 for performance and ≥ 95 for accessibility.
- Never put visitor data into a URL we build (query strings, redirects). The one exception is the `wa.me` link that the visitor chooses to open.
- Never commit, print or document the admin password.
- Commit only on branch `v2-website`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run every command under Node 24: `source ~/.nvm/nvm.sh && nvm use 24`. The local default is Node 20.

## Decisions this plan makes (spec deviations, for the reviewer)

1. **The session cookie path stays `/api/admin`.** The spec moves it to `/` so that server-rendered admin pages can read it. Here, `/admin` is a static shell and every data call goes through the API, which checks the session. The narrower path also keeps the session cookie off public page requests.
2. **The Ask inbox table is `ask_questions`,** because Quest already owns a table named `questions`.
3. **Markdown keeps the escape-first renderer** (a Phase 2 ruling) instead of `marked`.
4. **The `is_sample` flag ("Sample — to be replaced") exists only on posts, testimonials and alumni.** Those are the places where a placeholder could pass as a genuine article or endorsement. The three starter posts are seeded as samples until the client approves them.
5. **A testimonial "screenshot" is a written testimonial with an `image`.** This needs no new kind and no table rebuild.
6. **Fields that nothing renders are not added:** `updated_at`, `centres.address`, `posts.cover`. Video uploads are also out (the spec says images only); new videos come from YouTube.
7. **The forms rate limit is 20 submissions per form, per IP, per 10 minutes.** With `TRUST_PROXY_HOPS=0` on Railway, all visitors may share one proxy IP, so the limit is set well above real traffic. The honeypot handles bots on its own.
8. **Phase 2 follow-ups are folded in:**
   - Results board filter and Ask topic chips.
   - Faculty experience, expertise and intro fields.
   - Job descriptions and alumni story cards.
   - Markdown fixes and the small polish items.
9. **Left out because they need client content:** App screenshots, and an online-vs-offline comparison on Courses.

## Review Focus

1. **Visitor-typed text in the admin inbox.** A name or question such as `<img src=x onerror=alert(1)>` must show as plain text everywhere in the admin and never be parsed as HTML. Pinned in Task 17 (`tests/e2e/admin.spec.ts`).
2. **A CSV export opened in Excel.** A name like `=HYPERLINK("http://x")` must arrive as text, not as a formula. Pinned in Task 4 (`tests/inbox.test.mjs`) and Task 10 (`tests/admin-inbox.test.mjs`).
3. **A form posted without JavaScript.** The entry must be saved, and the visitor sees either the thanks page or the form page with a message; never a raw JSON page. Pinned in Task 5 (`tests/forms-api.test.mjs`) and Task 6 (`tests/e2e/forms.spec.ts`).
4. **The WhatsApp number left empty.** Every WhatsApp button stays hidden and the phone number shows instead, including on form confirmations. Pinned in Task 6 (e2e) and Task 8 (`tests/admin-api.test.mjs`).
5. **An upload that lies about its type, is not an image, or is over 10 MB.** It must be refused with a clear message, and nothing half-written may be left in `uploads/`. Pinned in Task 9 (`tests/media-library.test.mjs`).

## File map

| Create | Responsibility |
|---|---|
| `server/validators.mjs` | Small shared checks: `line`, `block`, `isWebUrl`, `isEmail`, `httpError` |
| `server/read-body.mjs` | `readBuffer(req, limit)`: a raw body with a 413 over the limit |
| `server/inbox.mjs` | `InboxStore` and the three inbox tables, CSV export, publish to FAQ |
| `server/forms.mjs` | Form validators and `createFormRoutes` for `/api/forms/:kind` |
| `server/admin-schema.mjs` | `SECTIONS`, `SETTINGS`, `cleanValue`, `validateRow`, `validateSettings`, `publicSchema` |
| `server/admin-content.mjs` | `AdminContent`: generic list, create, update, delete and reorder; settings |
| `server/media-library.mjs` | `MediaLibrary`: upload → WebP variants, list, delete |
| `server/admin-routes.mjs` | `createAdminRoutes`: schema, content, settings, media and inbox endpoints |
| `src/components/FormField.astro`, `src/components/SmartForm.astro` | Public form building blocks |
| `src/components/AlumniCard.astro`, `src/components/SampleBadge.astro` | New public cards |
| `src/scripts/forms.ts` | Progressive form submit with confirmation and WhatsApp link |
| `src/pages/thanks.astro`, `src/pages/privacy.astro` | No-JS confirmation; new privacy page |
| `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`, `src/lib/site.ts`, `src/lib/structured-data.ts` | SEO |
| `src/layouts/Admin.astro`, `src/pages/admin/index.astro`, `src/styles/admin.css` | Admin shell |
| `src/scripts/admin/{dom,api,fields,media,content-view,settings-view,media-view,inbox-view,app}.ts` | Admin UI |
| `scripts/make-og-image.mjs`, `public/brand/og.jpg` | Social preview image |
| `tests/helpers/site.mjs` | Shared HTTP test fixture |
| `docs/admin-guide.md` | A short guide for Smartup staff |

Modified: `server/assessment.mjs`, `server.mjs`, `server/content-store.mjs`, `src/lib/markdown.mjs`, `src/layouts/Base.astro`, `src/components/{Footer,FilterChips,QuoteCard,VideoCard,ResultCard}.astro`, `src/scripts/{site,filters,faq-search}.ts`, `src/pages/{index,demo,careers,ask,alumni,faculty,testimonials,results,life,videos,contact,courses,404}.astro`, `src/pages/blog/{index,[slug]}.astro`, `data-seed/content.json`, `scripts/reset-content.mjs`, `package.json`, `README.md`, `DESIGN.md`.

---

### Task 1: Markdown fixes before staff can edit posts

Fixes the four Markdown issues deferred from the Phase 2 review. Admin edits arrive with Windows line endings (CRLF), so these must be fixed before the blog editor exists.

**Files:**
- Modify: `src/lib/markdown.mjs`
- Test: `tests/markdown.test.mjs`

**Interfaces:**
- Produces: `renderMarkdown(source: string): string`. The signature is unchanged; the admin preview (Task 16) imports it in the browser.

- [ ] **Step 1: Write the failing tests**

Append to `tests/markdown.test.mjs`:

```js
test('Windows line endings from a form post render the same as Unix ones', () => {
  assert.equal(renderMarkdown('## Plan\r\n\r\n- One\r\n- Two'), '<h2>Plan</h2>\n<ul><li>One</li><li>Two</li></ul>');
});

test('a heading followed directly by text becomes a heading and a paragraph', () => {
  assert.equal(renderMarkdown('## Plan\nStart early.'), '<h2>Plan</h2>\n<p>Start early.</p>');
  assert.equal(renderMarkdown('# Title'), '<h2>Title</h2>');
});

test('stars and brackets inside a link address stay part of the link', () => {
  assert.equal(renderMarkdown('[guide](https://example.com/a*b*c)'), '<p><a href="https://example.com/a*b*c">guide</a></p>');
  assert.equal(renderMarkdown('[Kerala](https://en.wikipedia.org/wiki/Kerala_(state))'), '<p><a href="https://en.wikipedia.org/wiki/Kerala_(state)">Kerala</a></p>');
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. The 3 new tests fail (CRLF collapses into one paragraph, `*` turns into `<em>`, and the URL is cut at `)`).

- [ ] **Step 3: Replace `src/lib/markdown.mjs`**

```js
const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// http(s) and mailto only; one level of balanced brackets is allowed inside the address.
const LINK = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)(?:[^()\s]|\([^()\s]*\))+)\)/g;

// Inline formatting runs on already-escaped text, so no HTML from the source can survive.
// Links are swapped out before emphasis runs, so a * inside an address never becomes markup.
function inline(text) {
  const links = [];
  return escapeHtml(text)
    .replace(LINK, (_, label, href) => `\u0000${links.push(`<a href="${href}">${label}</a>`) - 1}\u0000`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

/** Renders the small Markdown subset staff use for posts. Output is safe to insert as HTML. */
export function renderMarkdown(source) {
  const text = String(source).replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  return text.split(/\n\s*\n/).flatMap(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    // The page title is the only h1, so # and ## both become h2.
    const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
    if (heading) {
      const level = Math.max(2, heading[1].length);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      lines.shift();
    }
    if (lines.length === 0) return out;
    if (lines.every(l => /^[-*]\s+/.test(l))) out.push(`<ul>${lines.map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`);
    else if (lines.every(l => /^\d+\.\s+/.test(l))) out.push(`<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`);
    else out.push(`<p>${inline(lines.join(' '))}</p>`);
    return out;
  }).join('\n');
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS, including the three existing Markdown tests (escaping, unsafe links, `&quot;` in links).

- [ ] **Step 5: Commit**

```bash
git add src/lib/markdown.mjs tests/markdown.test.mjs
git commit -m "Handle Windows line endings, heading-plus-text and link addresses in Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: New content fields and the alumni table

**Files:**
- Modify: `server/content-store.mjs`, `data-seed/content.json`, `scripts/reset-content.mjs`
- Test: `tests/content-store.test.mjs`

**Interfaces:**
- Produces, as new or extended `ContentStore` readers:
  - `faculty()` rows gain `experienceYears: number`, `expertise: string`, `intro: string`.
  - `jobs()` rows gain `description: string`.
  - `posts()` and `post(slug)` gain `isSample: boolean`.
  - `testimonials(section)` rows gain `image: string` and `isSample: boolean`.
  - New `alumni(): {name, batch, nowRole, story, achievements, photo, photoAlt, isSample}[]`.
- Produces: an exported `seedSettings(): object` (the seed's settings, cached), used by Task 8.
- Produces the tables and columns: `alumni(name, batch, now_role, story, achievements, photo, photo_alt, is_sample, sort, published)`, `faculty.experience_years/expertise/intro`, `jobs.description`, `posts.is_sample`, `testimonials.is_sample/image`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/content-store.test.mjs`:

```js
test('an older database gains the Phase 3 columns with safe defaults', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE faculty(id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', team TEXT NOT NULL DEFAULT 'team', qualification TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)");
  db.exec("INSERT INTO faculty(name) VALUES('Old teacher')");
  db.exec("CREATE TABLE jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)");
  db.exec("INSERT INTO jobs(title, type) VALUES('Old job', 'Other')");
  const store = new ContentStore(db);
  assert.deepEqual(store.faculty()[0], { name: 'Old teacher', role: '', team: 'team', qualification: '', note: '', photo: '', experienceYears: 0, expertise: '', intro: '' });
  assert.equal(store.jobs()[0].description, '');
});

test('alumni stories come in order and unpublished ones stay hidden', () => {
  const store = seeded();
  store.db.exec("INSERT INTO alumni(name, batch, now_role, story, sort) VALUES('Second', 'SSLC 2019', 'Engineer', 'Story two', 2), ('First', 'Plus Two 2018', 'Doctor', 'Story one', 1), ('Hidden', '', '', '', 0)");
  store.db.exec("UPDATE alumni SET published = 0 WHERE name = 'Hidden'");
  assert.deepEqual(store.alumni().map(a => a.name), ['First', 'Second']);
  assert.equal(store.alumni()[0].nowRole, 'Doctor');
  assert.equal(store.alumni()[0].isSample, false);
});

test('the starter blog posts are marked as samples until the client approves them', () => {
  const store = seeded();
  assert.ok(store.posts().length > 0 && store.posts().every(p => p.isSample === true));
  assert.equal(store.post(store.posts()[0].slug).isSample, true);
});

test('testimonials report a screenshot image and the sample flag', () => {
  const store = seeded();
  store.db.exec("UPDATE testimonials SET image = '/media/u-shot', is_sample = 1 WHERE rowid = (SELECT MIN(rowid) FROM testimonials WHERE section = 'feedback')");
  const [first] = store.testimonials('feedback');
  assert.equal(first.image, '/media/u-shot');
  assert.equal(first.isSample, true);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. The 4 new tests fail (`no such table: alumni`, missing fields, `isSample` undefined).

- [ ] **Step 3: Extend `server/content-store.mjs`**

1. Append the alumni table to the end of `SCHEMA` (inside the template string, after the `faqs` line):

```sql
CREATE TABLE IF NOT EXISTS alumni(id INTEGER PRIMARY KEY, name TEXT NOT NULL, batch TEXT NOT NULL DEFAULT '', now_role TEXT NOT NULL DEFAULT '', story TEXT NOT NULL DEFAULT '', achievements TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', photo_alt TEXT NOT NULL DEFAULT '', is_sample INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
```

2. Replace the two lines that define and use `defaultSettings`:

```js
let seedSettings;
const defaultSettings = () => (seedSettings ??= loadSeed().settings ?? {});
```

with:

```js
let cachedSeedSettings;
/** The seed's settings: defaults for any key missing from the database. */
export const seedSettings = () => (cachedSeedSettings ??= loadSeed().settings ?? {});
```

In `settings()`, change `...defaultSettings(),` to `...seedSettings(),`.

3. Add this list above `export class ContentStore`:

```js
// Columns added after the first release; the constructor adds any that an existing database lacks.
const ADDED_COLUMNS = [
  ['results', 'kind', "TEXT NOT NULL DEFAULT 'student'"],
  ['faculty', 'experience_years', 'INTEGER NOT NULL DEFAULT 0'],
  ['faculty', 'expertise', "TEXT NOT NULL DEFAULT ''"],
  ['faculty', 'intro', "TEXT NOT NULL DEFAULT ''"],
  ['jobs', 'description', "TEXT NOT NULL DEFAULT ''"],
  ['posts', 'is_sample', 'INTEGER NOT NULL DEFAULT 0'],
  ['testimonials', 'is_sample', 'INTEGER NOT NULL DEFAULT 0'],
  ['testimonials', 'image', "TEXT NOT NULL DEFAULT ''"],
];
```

4. Replace the constructor body:

```js
  constructor(db) {
    this.db = db;
    this.db.exec(SCHEMA);
    for (const [table, column, ddl] of ADDED_COLUMNS) {
      const existing = this.db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!existing.includes(column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  }
```

5. In `SECTIONS.posts`, store the sample flag:

```js
  posts(db, rows) {
    const put = db.prepare('INSERT INTO posts(slug, title, category, excerpt, body, author, published_at, is_sample) VALUES(?, ?, ?, ?, ?, ?, ?, ?)');
    for (const r of rows) put.run(r.slug, r.title, r.category, r.excerpt ?? '', r.body, r.author ?? 'Smartup Academic Team', r.publishedAt, flag(r.isSample));
  },
```

6. Replace these readers and add `alumni()`:

```js
  faculty() {
    return this.db.prepare('SELECT name, role, team, qualification, note, photo, experience_years AS experienceYears, expertise, intro FROM faculty WHERE published = 1 ORDER BY sort, id').all();
  }

  posts() {
    return this.db.prepare('SELECT slug, title, category, excerpt, author, published_at AS publishedAt, is_sample AS isSample FROM posts WHERE published = 1 ORDER BY published_at DESC, id DESC').all()
      .map(r => ({ ...r, isSample: r.isSample === 1 }));
  }

  post(slug) {
    const row = this.db.prepare('SELECT slug, title, category, excerpt, author, published_at AS publishedAt, body, is_sample AS isSample FROM posts WHERE published = 1 AND slug = ?').get(slug);
    return row ? { ...row, isSample: row.isSample === 1 } : null;
  }

  testimonials(section) {
    return this.db.prepare('SELECT kind, section, title, person, quote, video, poster, image, is_sample AS isSample FROM testimonials WHERE published = 1 AND section = ? ORDER BY sort, id').all(section)
      .map(r => ({ ...r, isSample: r.isSample === 1 }));
  }

  jobs() {
    return this.db.prepare('SELECT title, type, location, description FROM jobs WHERE published = 1 ORDER BY sort, id').all();
  }

  alumni() {
    return this.db.prepare('SELECT name, batch, now_role AS nowRole, story, achievements, photo, photo_alt AS photoAlt, is_sample AS isSample FROM alumni WHERE published = 1 ORDER BY sort, id').all()
      .map(r => ({ ...r, isSample: r.isSample === 1 }));
  }
```

- [ ] **Step 4: Mark the starter posts as samples and include alumni in the local reset**

```bash
node -e "const fs=require('fs');const f='data-seed/content.json';const c=JSON.parse(fs.readFileSync(f,'utf8'));for(const p of c.posts)p.isSample=true;fs.writeFileSync(f,JSON.stringify(c,null,2)+'\n')"
git diff --stat data-seed/content.json
```

Expected: `data-seed/content.json | 3 +++` (the file is already canonical 2-space JSON, so only three lines change).

In `scripts/reset-content.mjs`, add `'alumni'` to the table list, after `'faqs'`.

- [ ] **Step 5: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS, including 'an older database without a results kind column is upgraded'.

- [ ] **Step 6: Commit**

```bash
git add server/content-store.mjs data-seed/content.json scripts/reset-content.mjs tests/content-store.test.mjs
git commit -m "Add alumni stories, faculty and job details, and sample flags to the content store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: API plumbing for forms and admin extensions

**Files:**
- Create: `server/read-body.mjs`, `server/validators.mjs`, `tests/helpers/site.mjs`, `tests/api-routes.test.mjs`
- Modify: `server/assessment.mjs`, `server.mjs`

**Interfaces:**
- Produces: `readBuffer(req, limit: number): Promise<Buffer>`. It rejects with an error carrying `status: 413` when the body exceeds `limit`.
- Produces, in `server/validators.mjs`:
  - `line(v): string` collapses whitespace.
  - `block(v): string` normalises line endings and trims.
  - `isWebUrl(s): boolean` and `isEmail(s): boolean`.
  - `httpError(status, message, fields?): Error`.
- Produces: `createAssessmentHandler({ …, routes: { forms?, admin? } })`. A route handler receives `{ req, res, url, route, respond, ip, limited }` (forms) or `{ req, res, url, route, respond, body }` (admin). It must answer every request it gets.
  - `/api/forms/*` skips the `X-Smartup-Request`/JSON check but keeps the Origin and `Sec-Fetch-Site` checks.
  - `/api/admin/media` may send any content type with `X-Smartup-Request: 1`.
- Produces: `GET /api/admin/session`, which returns 200 when signed in and 401 otherwise.
- Produces: `createSiteServer({ routes })`, which passes `routes` to the handler (Tasks 5 and 8 add the real ones).
- Produces: a test fixture `startSite(t, { prepare?, ...serverOptions })` returning `{ base, store, content, db, uploadsDir, call(route, {method, json, body, headers, signedIn}), signIn(), page(route) }`.

- [ ] **Step 1: Create the shared test fixture**

Create `tests/helpers/site.mjs` (not matched by `tests/*.test.mjs`, so it is not run as a test):

```js
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSiteServer } from '../../server.mjs';
import { AssessmentStore } from '../../server/assessment.mjs';
import { ContentStore } from '../../server/content-store.mjs';

export const ADMIN_PASSWORD = 'synthetic-admin-password-for-tests';

/** Starts the full site on a free port with an in-memory database and a temporary uploads folder. */
export async function startSite(t, { prepare = () => {}, ...options } = {}) {
  const store = new AssessmentStore(':memory:');
  const content = new ContentStore(store.db);
  content.applySeed();
  prepare(content);
  const uploadsDir = mkdtempSync(path.join(tmpdir(), 'smartup-uploads-'));
  const server = createSiteServer({ store, content, adminPassword: ADMIN_PASSWORD, secureCookies: false, uploadsDir, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    store.close();
    rmSync(uploadsDir, { recursive: true, force: true });
  });
  let cookie = '';
  async function call(route, { method = 'GET', json, body, headers = {}, signedIn = true } = {}) {
    const response = await fetch(base + route, {
      method,
      redirect: 'manual',
      headers: { 'X-Smartup-Request': '1', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(signedIn && cookie ? { Cookie: cookie } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : body,
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* CSV, HTML or empty */ }
    return { status: response.status, data, text, headers: response.headers };
  }
  async function signIn() {
    const r = await call('/api/admin/login', { method: 'POST', json: { password: ADMIN_PASSWORD }, signedIn: false });
    assert.equal(r.status, 200);
    cookie = r.headers.get('set-cookie').split(';')[0];
  }
  async function page(route) {
    const r = await fetch(base + route);
    assert.equal(r.status, 200, route);
    return r.text();
  }
  return { base, store, content, db: store.db, uploadsDir, call, signIn, page };
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/api-routes.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';
import { readBuffer } from '../server/read-body.mjs';

const routes = {
  forms: async ({ req, respond }) => respond(200, { hit: 'forms', length: (await readBuffer(req, 64)).length }),
  admin: async ({ route, respond }) => respond(200, { hit: 'admin', route }),
};

test('the session check tells the admin page whether staff are signed in', async t => {
  const site = await startSite(t, { routes });
  assert.equal((await site.call('/api/admin/session', { signedIn: false })).status, 401);
  await site.signIn();
  assert.equal((await site.call('/api/admin/session')).status, 200);
});

test('form routes accept plain HTML posts from this site but not from other sites', async t => {
  const site = await startSite(t, { routes });
  const post = headers => fetch(`${site.base}/api/forms/demo`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: 'name=Asha' });
  const plain = await post({});
  assert.equal(plain.status, 200);
  assert.deepEqual(await plain.json(), { hit: 'forms', length: 9 });
  assert.equal((await post({ Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ Origin: 'null' })).status, 403);
  assert.equal((await post({ 'Sec-Fetch-Site': 'cross-site' })).status, 403);
});

test('a body larger than the route allows is answered with 413', async t => {
  const site = await startSite(t, { routes });
  const r = await fetch(`${site.base}/api/forms/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(100) });
  assert.equal(r.status, 413);
});

test('admin extension routes run only for signed-in staff, after the Quest routes', async t => {
  const site = await startSite(t, { routes });
  assert.equal((await site.call('/api/admin/content/faqs', { signedIn: false })).status, 401);
  await site.signIn();
  assert.deepEqual((await site.call('/api/admin/content/faqs')).data, { hit: 'admin', route: '/api/admin/content/faqs' });
  assert.ok(Array.isArray((await site.call('/api/admin/questions')).data.questions), 'Quest admin routes still answer first');
});

test('media uploads may send image bytes; other admin writes must send JSON', async t => {
  const site = await startSite(t, { routes });
  await site.signIn();
  assert.equal((await site.call('/api/admin/media', { method: 'POST', body: Buffer.from('png'), headers: { 'Content-Type': 'image/png' } })).status, 200);
  assert.equal((await site.call('/api/admin/content/faqs', { method: 'POST', body: 'x', headers: { 'Content-Type': 'text/plain' } })).status, 403);
  assert.equal((await site.call('/api/admin/media', { method: 'POST', body: Buffer.from('png'), headers: { 'Content-Type': 'image/png', 'X-Smartup-Request': '' } })).status, 403);
});
```

- [ ] **Step 3: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. `tests/api-routes.test.mjs` cannot load because `server/read-body.mjs` does not exist.

- [ ] **Step 4: Create `server/read-body.mjs`**

```js
const tooLarge = () => Object.assign(new Error('Request is too large.'), { status: 413 });

/** Reads a request body up to `limit` bytes. A larger body rejects with status 413 and is drained, not stored. */
export function readBuffer(req, limit) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > limit) return reject(tooLarge());
    const chunks = [];
    let length = 0;
    const onData = chunk => {
      length += chunk.length;
      if (length <= limit) return chunks.push(chunk);
      req.off('data', onData);
      req.resume();
      reject(tooLarge());
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
```

- [ ] **Step 5: Create `server/validators.mjs`**

```js
/** Single-line text: trimmed, inner whitespace collapsed. Anything that is not a string becomes ''. */
export const line = value => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** Multi-line text: Windows and old Mac line endings become \n, then trimmed. */
export const block = value => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '');

export function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** An error the API turns into `{ error, fields? }` with this status. */
export const httpError = (status, message, fields) => Object.assign(new Error(message), { status, ...(fields ? { fields } : {}) });
```

- [ ] **Step 6: Extend `server/assessment.mjs`**

Use exact-string edits; keep the file's compact style.

1. Signature. Replace
`trustedProxyHops=Number(process.env.TRUST_PROXY_HOPS)||0}={}) {`
with
`trustedProxyHops=Number(process.env.TRUST_PROXY_HOPS)||0,routes={}}={}) {`

2. Write checks. Replace the block

```js
   if(req.method!=='GET'){
    if(req.headers['x-smartup-request']!=='1'||!req.headers['content-type']?.startsWith('application/json'))return respond(403,{error:'This request is not allowed.'});
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return respond(403,{error:'This request is not allowed.'});
    if(req.headers['sec-fetch-site']==='cross-site')return respond(403,{error:'This request is not allowed.'});
   }
```

with

```js
   if(req.method!=='GET'){
    // Public forms also accept plain HTML posts (the no-JS fallback); media uploads send image bytes.
    const form=route.startsWith('/api/forms/'),upload=route==='/api/admin/media';
    if(!form&&(req.headers['x-smartup-request']!=='1'||(!upload&&!req.headers['content-type']?.startsWith('application/json'))))return respond(403,{error:'This request is not allowed.'});
    let originHost=null;try{originHost=req.headers.origin?new URL(req.headers.origin).host:null;}catch{return respond(403,{error:'This request is not allowed.'});}
    if(originHost&&originHost!==req.headers.host)return respond(403,{error:'This request is not allowed.'});
    if(req.headers['sec-fetch-site']==='cross-site')return respond(403,{error:'This request is not allowed.'});
   }
```

3. Forms dispatch. Replace
`   const ip=clientAddress(req);`
with
```js
   const ip=clientAddress(req);
   if(route.startsWith('/api/forms/'))return routes.forms?await routes.forms({req,res,url,route,respond,ip,limited}):respond(404,{error:'Not found.'});
```

4. Session check. Replace
```js
     return respond(200,{ok:true},{'Set-Cookie':`smartup_admin=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies?'; Secure':''}`});
    }
```
with
```js
     return respond(200,{ok:true},{'Set-Cookie':`smartup_admin=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies?'; Secure':''}`});
    }
    if(route==='/api/admin/session'&&req.method==='GET')return respond(200,{ok:true});
```

5. Admin dispatch. Replace
`    if(deletion&&req.method==='DELETE'){store.db.prepare('DELETE FROM runs WHERE id=?').run(deletion[1]);return respond(200,{ok:true});}`
with
```js
    if(deletion&&req.method==='DELETE'){store.db.prepare('DELETE FROM runs WHERE id=?').run(deletion[1]);return respond(200,{ok:true});}
    if(routes.admin)return await routes.admin({req,res,url,route,respond,body});
```

(`return await` keeps a thrown `httpError` inside the existing `try`, which answers with its status.)

- [ ] **Step 7: Pass routes through `createSiteServer`**

In `server.mjs`, replace
`  const api = createAssessmentHandler({ ...options, store });`
with
`  const api = createAssessmentHandler({ ...options, store, routes: { ...options.routes } });`

- [ ] **Step 8: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS, including every existing `assessment.test.mjs` test (cookie path `Path=/api/admin` unchanged).

- [ ] **Step 9: Commit**

```bash
git add server/read-body.mjs server/validators.mjs server/assessment.mjs server.mjs tests/helpers/site.mjs tests/api-routes.test.mjs
git commit -m "Let form and admin routes plug into the API, with a session check and body limits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Inbox store and form validation

**Files:**
- Create: `server/inbox.mjs`, `server/forms.mjs` (validation part), `tests/inbox.test.mjs`

**Interfaces:**
- Consumes: `normalizePhone`, `formatPhone` (content-store), plus `line`, `block`, `isWebUrl`, `isEmail`, `httpError` (Task 3).
- Produces in `server/forms.mjs`:
  - The option lists `GRADES: {value,label}[]`, `BOARDS: string[]` and `MODES: string[]`.
  - `validateDemo(input, {centres: string[]})`, `validateCareers(input, {roles: string[]})` and `validateAsk(input)`. Each returns `{ values, errors }`, where `values` keys are the inbox column names.
  - `isBot(input): boolean`.
- Produces in `server/inbox.mjs`:
  - `INBOXES` (`{demo, careers, ask}`), where each entry is `{ table, label, fields: {name,label}[] }`, and `STATUSES`.
  - `csvCell(value): string`.
  - `class InboxStore(db)` with `add(kind, values) → id`, `list(kind) → rows`, `update(kind, id, {status?, notes?, answer?}) → boolean`, `remove(kind, id) → boolean`, `counts() → {demo, careers, ask}` (new entries) and `csv(kind) → string`.
  - `publishAnswer(id, {category, question, answer}) → faqId | null`, which throws `httpError(400, …, fields)` on bad input.
- Tables: `demo_bookings`, `job_applications`, `ask_questions`. Each has `id`, `created_at`, `status` (new/contacted/closed) and `notes`.

- [ ] **Step 1: Write the failing tests**

Create `tests/inbox.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ContentStore } from '../server/content-store.mjs';
import { InboxStore, csvCell } from '../server/inbox.mjs';
import { validateDemo, validateCareers, validateAsk, isBot } from '../server/forms.mjs';

const centres = ['Kadavanthra', 'Vennala'];
const demo = { name: '  Asha   K ', phone: '98950 85731', grade: '9', board: 'CBSE', mode: 'At a centre', centre: 'Vennala', preferred_time: '6 pm' };

test('a demo booking is cleaned: name trimmed, phone in +91 form', () => {
  const { values, errors } = validateDemo(demo, { centres });
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { name: 'Asha K', phone: '+919895085731', grade: '9', board: 'CBSE', mode: 'At a centre', centre: 'Vennala', preferred_time: '6 pm' });
});

test('an online booking drops any centre, and a centre booking needs a real centre', () => {
  assert.equal(validateDemo({ ...demo, mode: 'Online' }, { centres }).values.centre, '');
  assert.ok(validateDemo({ ...demo, centre: 'Mars' }, { centres }).errors.centre);
});

test('demo bookings reject a bad phone, a class outside 5 to 12 and unknown boards', () => {
  const { errors } = validateDemo({ ...demo, phone: '12345', grade: '4', board: 'IB' }, { centres });
  assert.deepEqual(Object.keys(errors).sort(), ['board', 'grade', 'phone']);
});

test('job applications need a listed role, a real email and a web link for the CV', () => {
  const base = { name: 'Ravi', phone: '9895085731', email: 'ravi@example.com', role: 'Physics teacher', experience: '3 years', message: 'Hello', cv_url: 'https://drive.google.com/x' };
  assert.deepEqual(validateCareers(base, { roles: ['Physics teacher'] }).errors, {});
  assert.ok(validateCareers({ ...base, role: 'Pilot' }, { roles: ['Physics teacher'] }).errors.role);
  assert.equal(validateCareers({ ...base, role: 'Other' }, { roles: [] }).errors.role, undefined);
  assert.ok(validateCareers({ ...base, cv_url: 'javascript:alert(1)' }, { roles: ['Physics teacher'] }).errors.cv_url);
  assert.ok(validateCareers({ ...base, email: 'not-an-email' }, { roles: ['Physics teacher'] }).errors.email);
});

test('questions need 10 or more characters; email is optional but must be valid', () => {
  assert.deepEqual(validateAsk({ name: 'Meera', phone: '9895085731', question: 'Do you teach Class 8 maths online?' }).errors, {});
  assert.ok(validateAsk({ name: 'Meera', phone: '9895085731', question: 'Fees?' }).errors.question);
  assert.ok(validateAsk({ name: 'Meera', phone: '9895085731', email: 'x', question: 'Do you teach Class 8 maths online?' }).errors.email);
});

test('the hidden website field marks a bot', () => {
  assert.equal(isBot({ website: '' }), false);
  assert.equal(isBot({}), false);
  assert.equal(isBot({ website: 'http://spam.example' }), true);
});

test('spreadsheet formulas in exported cells are neutralised and quotes are escaped', () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(csvCell('+918891910919'), "'+918891910919");
  assert.equal(csvCell('-1'), "'-1");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('Line one\nLine two'), '"Line one\nLine two"');
  assert.equal(csvCell('Plain'), 'Plain');
  assert.equal(csvCell(null), '');
});

const setup = () => {
  const db = new DatabaseSync(':memory:');
  const content = new ContentStore(db);
  content.applySeed();
  return { content, inbox: new InboxStore(db) };
};

test('inbox entries list newest first, change status and can be deleted', () => {
  const { inbox } = setup();
  const first = inbox.add('demo', validateDemo(demo, { centres }).values);
  const second = inbox.add('demo', validateDemo({ ...demo, name: 'Second' }, { centres }).values);
  assert.deepEqual(inbox.list('demo').map(r => r.id), [second, first]);
  assert.deepEqual(inbox.counts(), { demo: 2, careers: 0, ask: 0 });
  assert.equal(inbox.update('demo', first, { status: 'contacted', notes: 'Called\r\nat 6' }), true);
  assert.equal(inbox.list('demo').find(r => r.id === first).notes, 'Called\nat 6');
  assert.equal(inbox.counts().demo, 1);
  assert.throws(() => inbox.update('demo', first, { status: 'lost' }), /new, contacted or closed/);
  assert.equal(inbox.update('demo', 9999, { status: 'closed' }), false);
  assert.equal(inbox.remove('demo', first), true);
  assert.equal(inbox.list('demo').length, 1);
  assert.throws(() => inbox.list('nope'), /Unknown inbox/);
});

test('the CSV export has a header, readable phones and safe cells', () => {
  const { inbox } = setup();
  inbox.add('demo', validateDemo({ ...demo, name: '=HYPERLINK("http://x")' }, { centres }).values);
  const csv = inbox.csv('demo');
  assert.ok(csv.startsWith('﻿Received,Student,Phone,Class,Board,Online or centre,Centre,Preferred time,Status,Notes\r\n'));
  assert.match(csv, /,"'=HYPERLINK\(""http:\/\/x""\)",'\+91 98950 85731,9,CBSE,At a centre,Vennala,6 pm,new,\r\n$/);
});

test('an answered question is published to the FAQ and closed', () => {
  const { inbox, content } = setup();
  const id = inbox.add('ask', validateAsk({ name: 'Meera', phone: '9895085731', question: 'do u teach class 8 online??' }).values);
  const faqId = inbox.publishAnswer(id, { category: 'Programmes', question: 'Do you teach Class 8 online?', answer: 'Yes. Class 8 is taught online and at every centre.' });
  assert.ok(faqId > 0);
  assert.equal(content.faqs().at(-1).question, 'Do you teach Class 8 online?');
  const [row] = inbox.list('ask');
  assert.equal(row.status, 'closed');
  assert.equal(row.faq_id, faqId);
  assert.throws(() => inbox.publishAnswer(id, { category: '', question: 'Q?', answer: '' }), /highlighted/);
  assert.equal(inbox.publishAnswer(9999, { category: 'Programmes', question: 'Question?', answer: 'Answer.' }), null);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. `tests/inbox.test.mjs` cannot import `../server/inbox.mjs`.

- [ ] **Step 3: Create `server/forms.mjs` (validation)**

```js
import { normalizePhone } from './content-store.mjs';
import { line, block, isWebUrl, isEmail } from './validators.mjs';

export const GRADES = [
  { value: '5', label: 'Class 5' }, { value: '6', label: 'Class 6' }, { value: '7', label: 'Class 7' },
  { value: '8', label: 'Class 8' }, { value: '9', label: 'Class 9' }, { value: '10', label: 'Class 10' },
  { value: '11', label: 'Plus One (Class 11)' }, { value: '12', label: 'Plus Two (Class 12)' },
];
export const BOARDS = ['CBSE', 'State Board', 'Other'];
export const MODES = ['Online', 'At a centre'];

function check(errors, key, ok, message) {
  if (!ok && !errors[key]) errors[key] = message;
}

function person(input, errors) {
  const name = line(input.name);
  check(errors, 'name', name.length >= 2 && name.length <= 80, 'Enter a name (2 to 80 characters).');
  let phone = '';
  try { phone = normalizePhone(line(input.phone)); } catch { errors.phone = 'Enter a 10-digit Indian mobile number.'; }
  return { name, phone };
}

export function validateDemo(input, { centres }) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const grade = line(input.grade);
  const board = line(input.board);
  const mode = line(input.mode);
  const preferred_time = line(input.preferred_time);
  let centre = line(input.centre);
  check(errors, 'grade', GRADES.some(g => g.value === grade), 'Choose a class from 5 to 12.');
  check(errors, 'board', BOARDS.includes(board), 'Choose a board.');
  check(errors, 'mode', MODES.includes(mode), 'Choose online or at a centre.');
  if (mode === 'At a centre') check(errors, 'centre', centres.includes(centre), 'Choose a centre.');
  else centre = '';
  check(errors, 'preferred_time', preferred_time.length <= 60, 'Keep this under 60 characters.');
  return { values: { name, phone, grade, board, mode, centre, preferred_time }, errors };
}

export function validateCareers(input, { roles }) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const email = line(input.email);
  const role = line(input.role);
  const experience = line(input.experience);
  const message = block(input.message);
  const cv_url = line(input.cv_url);
  check(errors, 'email', email.length <= 120 && isEmail(email), 'Enter a valid email address.');
  check(errors, 'role', [...roles, 'Other'].includes(role), 'Choose a role.');
  check(errors, 'experience', experience.length <= 200, 'Keep this under 200 characters.');
  check(errors, 'message', message.length <= 1500, 'Keep your message under 1,500 characters.');
  check(errors, 'cv_url', cv_url === '' || (cv_url.length <= 300 && isWebUrl(cv_url)), 'Use a full link starting with https://');
  return { values: { name, phone, email, role, experience, message, cv_url }, errors };
}

export function validateAsk(input) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const email = line(input.email);
  const question = block(input.question);
  check(errors, 'email', email === '' || (email.length <= 120 && isEmail(email)), 'Enter a valid email address, or leave it empty.');
  check(errors, 'question', question.length >= 10 && question.length <= 1500, 'Write your question in 10 to 1,500 characters.');
  return { values: { name, phone, email, question }, errors };
}

/** People never see the "website" field; only bots fill it in. */
export const isBot = input => line(input.website) !== '';
```

- [ ] **Step 4: Create `server/inbox.mjs`**

```js
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
    if (!this.db.prepare('SELECT 1 FROM ask_questions WHERE id = ?').get(id)) return null;
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
```

- [ ] **Step 5: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/forms.mjs server/inbox.mjs tests/inbox.test.mjs
git commit -m "Add inbox tables, form validation and safe CSV export

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Public form API

**Files:**
- Modify: `server/forms.mjs` (append `createFormRoutes`), `server.mjs`
- Create: `tests/forms-api.test.mjs`

**Interfaces:**
- Consumes: `readBuffer` (Task 3); the validators, `isBot` and `InboxStore` (Task 4); the forms hook context `{ req, res, route, respond, ip, limited }` (Task 3).
- Produces: `POST /api/forms/{demo|careers|ask}`.
  - A JSON request gets 201 `{ok:true}`, or 400 `{error, fields}`, 429, 413 or 415.
  - A urlencoded request gets 303 to `/thanks?form=<kind>`, or 303 to `/<page>?error=invalid|busy#<anchor>`. The anchors are `/demo#book`, `/careers#apply` and `/ask#ask-form`.
- Produces: `createSiteServer` creates an `InboxStore`, or uses `options.inbox` when one is passed.

- [ ] **Step 1: Write the failing tests**

Create `tests/forms-api.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';
import { InboxStore } from '../server/inbox.mjs';

const booking = { name: 'Asha', phone: '9895085731', grade: '9', board: 'CBSE', mode: 'Online', centre: '', preferred_time: '' };
const question = { name: 'Meera', phone: '9895085731', question: 'Do you teach Class 8 maths online?' };
const postJson = (site, kind, data) => site.call(`/api/forms/${kind}`, { method: 'POST', json: data, signedIn: false });
const postForm = (site, kind, data) => fetch(`${site.base}/api/forms/${kind}`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });

test('a demo booking sent as JSON is saved for the team', async t => {
  const site = await startSite(t);
  assert.equal((await postJson(site, 'demo', booking)).status, 201);
  const [saved] = new InboxStore(site.db).list('demo');
  assert.equal(saved.phone, '+919895085731');
  assert.equal(saved.status, 'new');
});

test('invalid details come back as field messages and nothing is saved', async t => {
  const site = await startSite(t);
  const r = await postJson(site, 'demo', { ...booking, phone: '123' });
  assert.equal(r.status, 400);
  assert.ok(r.data.fields.phone);
  assert.equal(new InboxStore(site.db).list('demo').length, 0);
});

test('a filled honeypot looks like success but saves nothing', async t => {
  const site = await startSite(t);
  assert.equal((await postJson(site, 'demo', { ...booking, website: 'spam' })).status, 201);
  assert.equal(new InboxStore(site.db).list('demo').length, 0);
});

test('without JavaScript a booking redirects to the thanks page, and a bad one back to the form', async t => {
  const site = await startSite(t);
  const ok = await postForm(site, 'demo', booking);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('location'), '/thanks?form=demo');
  const bad = await postForm(site, 'demo', { ...booking, grade: '' });
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('location'), '/demo?error=invalid#book');
  assert.equal(new InboxStore(site.db).list('demo').length, 1);
});

test('careers and ask forms save to their own inboxes', async t => {
  const site = await startSite(t);
  const role = site.content.jobs()[0].title;
  assert.equal((await postJson(site, 'careers', { name: 'Ravi', phone: '9895085731', email: 'ravi@example.com', role, experience: '', message: '', cv_url: '' })).status, 201);
  assert.equal((await postJson(site, 'ask', question)).status, 201);
  const inbox = new InboxStore(site.db);
  assert.equal(inbox.list('careers')[0].role, role);
  assert.equal(inbox.list('ask').length, 1);
});

test('form posts are limited per visitor', async t => {
  const site = await startSite(t);
  for (let i = 0; i < 20; i++) assert.equal((await postJson(site, 'ask', question)).status, 201);
  assert.equal((await postJson(site, 'ask', question)).status, 429);
  assert.equal((await postForm(site, 'ask', question)).headers.get('location'), '/ask?error=busy#ask-form');
});

test('oversized, wrongly typed, malformed and unknown form posts are refused', async t => {
  const site = await startSite(t);
  const raw = (body, type) => site.call('/api/forms/demo', { method: 'POST', body, headers: { 'Content-Type': type }, signedIn: false });
  assert.equal((await raw(JSON.stringify({ name: 'x'.repeat(25000) }), 'application/json')).status, 413);
  assert.equal((await raw('hello', 'text/plain')).status, 415);
  assert.equal((await raw('[1]', 'application/json')).status, 400);
  assert.equal((await postJson(site, 'nope', booking)).status, 404);
  assert.equal((await site.call('/api/forms/demo', { signedIn: false })).status, 405);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. Form posts get 404 because no forms route is wired.

- [ ] **Step 3: Append `createFormRoutes` to `server/forms.mjs`**

Add `import { readBuffer } from './read-body.mjs';` to the imports, then append:

```js
export const FORM_LIMIT = 20 * 1024;

const FORMS = {
  demo: { page: '/demo', anchor: 'book', validate: (input, content) => validateDemo(input, { centres: content.centres().map(c => c.name) }) },
  careers: { page: '/careers', anchor: 'apply', validate: (input, content) => validateCareers(input, { roles: content.jobs().map(j => j.title) }) },
  ask: { page: '/ask', anchor: 'ask-form', validate: input => validateAsk(input) },
};

/** POST /api/forms/:kind — JSON from the page script, or a plain HTML post when JavaScript is off. */
export function createFormRoutes({ content, inbox }) {
  return async ({ req, res, route, respond, ip, limited }) => {
    const kind = route.slice('/api/forms/'.length);
    if (!Object.hasOwn(FORMS, kind)) return respond(404, { error: 'Not found.' });
    if (req.method !== 'POST') return respond(405, { error: 'Method not allowed.' });
    const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    const native = type === 'application/x-www-form-urlencoded';
    if (!native && type !== 'application/json') return respond(415, { error: 'Send the form as JSON.' });
    const { page, anchor, validate } = FORMS[kind];
    // Redirects carry only the form name and an error code, never what the visitor typed.
    const redirect = location => { res.writeHead(303, { Location: location, 'Cache-Control': 'no-store' }); res.end(); };
    const back = code => redirect(`${page}?error=${code}#${anchor}`);
    const raw = (await readBuffer(req, FORM_LIMIT)).toString('utf8');
    let input;
    if (native) input = Object.fromEntries(new URLSearchParams(raw));
    else {
      try { input = JSON.parse(raw); } catch { input = null; }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return respond(400, { error: 'Send a valid JSON object.' });
    }
    if (limited(`form:${kind}:${ip}`, 20, 600000)) return native ? back('busy') : respond(429, { error: 'Too many messages from this connection. Please try again later, or call us.' });
    if (isBot(input)) return native ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
    const { values, errors } = validate(input, content);
    if (Object.keys(errors).length) return native ? back('invalid') : respond(400, { error: 'Check the highlighted details.', fields: errors });
    inbox.add(kind, values);
    return native ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
  };
}
```

- [ ] **Step 4: Wire the forms into `createSiteServer`**

In `server.mjs` add the imports:

```js
import { InboxStore } from './server/inbox.mjs';
import { createFormRoutes } from './server/forms.mjs';
```

and replace
`  const api = createAssessmentHandler({ ...options, store, routes: { ...options.routes } });`
with
```js
  const inbox = options.inbox ?? new InboxStore(store.db);
  const api = createAssessmentHandler({ ...options, store, routes: { forms: createFormRoutes({ content, inbox }), ...options.routes } });
```

- [ ] **Step 5: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS. `tests/api-routes.test.mjs` still passes, because its stub `routes` override the real ones.

- [ ] **Step 6: Commit**

```bash
git add server/forms.mjs server.mjs tests/forms-api.test.mjs
git commit -m "Accept demo, careers and ask forms as JSON or plain HTML posts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Forms on the Demo, Careers and Ask pages

**Files:**
- Create: `src/components/FormField.astro`, `src/components/SmartForm.astro`, `src/scripts/forms.ts`, `src/pages/thanks.astro`, `tests/e2e/forms.spec.ts`
- Modify: `src/layouts/Base.astro` (the `noindex` prop), `src/scripts/site.ts`, `src/pages/demo.astro`, `src/pages/careers.astro`, `src/pages/ask.astro`, `tests/pages.test.mjs`, `tests/e2e/pages.ts`

**Interfaces:**
- Consumes: `GRADES`, `BOARDS`, `MODES` (Task 4) and the form API (Task 5).
- Produces: `<FormField name label as? type? required? maxlength? options? placeholder? autocomplete? inputmode? rows? value? hint?>`. It renders an error slot `[data-error-for=<name>]` and adds "(optional)" to the label of any field that is not required.
- Produces: `<SmartForm kind submit done waText whatsapp phone error?>`. It renders `form[data-smartup-form]` with method="post", the honeypot `website`, the data notice and a hidden `[data-form-done]` panel.
- Produces: `initForms()`, which enhances every `form[data-smartup-form]`.
- Produces: Base gets the prop `noindex?: boolean`.

- [ ] **Step 1: Write the failing tests**

In `tests/pages.test.mjs`, change the last line of `start()` from
`  return { html, content, close: () => new Promise(r => server.close(() => { store.close(); r(); })) };`
to
`  return { html, base, content, close: () => new Promise(r => server.close(() => { store.close(); r(); })) };`

Then replace the test 'Careers groups openings by type and each one has an email to apply' with:

```js
test('Careers groups openings by type and each one links to the application form', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/careers');
  assert.equal([...page.matchAll(/href="\/careers\?role=[^"#]+#apply"/g)].length, 12);
  for (const type of ['Full time', 'Part time', 'Teaching assistant', 'Other']) assert.match(page, new RegExp(`<h2[^>]*>${type}`));
  assert.match(page, /<form method="post" action="\/api\/forms\/careers"/);
});
```

Append:

```js
test('the demo page has a booking form that works without JavaScript', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/demo');
  assert.match(page, /<form method="post" action="\/api\/forms\/demo"/);
  for (const name of ['name', 'phone', 'grade', 'board', 'mode', 'centre', 'preferred_time', 'website']) assert.match(page, new RegExp(`name="${name}"`));
  assert.equal([...page.matchAll(/<option value="(Chullickal|Kadavanthra|Eraveli|Thoppumpady|Palluruthy|Moolamkuzhi|Fort Kochi|Vennala|Edappally)"/g)].length, 9);
  assert.match(page, /We use these details only to reply to you/);
  assert.match(page, /href="\/privacy"/);
});

test('a form that failed without JavaScript explains what to do', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/demo?error=invalid'), /Some details were missing or not valid/);
  assert.match(await site.html('/ask?error=busy'), /Too many attempts right now/);
  assert.doesNotMatch(await site.html('/demo'), /Some details were missing/);
});

test('Careers preselects the role named in the link', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/careers?role=Physics%20teacher'), /<option value="Physics teacher" selected/);
});

test('Ask Smartup has a question form', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/ask');
  assert.match(page, /<form method="post" action="\/api\/forms\/ask"/);
  assert.match(page, /name="question"/);
});

test('the thanks page confirms each form and stays out of search; an unknown form is not found', async t => {
  const site = await start();
  t.after(site.close);
  const demo = await site.html('/thanks?form=demo');
  assert.match(demo, /Your demo class request is in/);
  assert.match(demo, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(await site.html('/thanks?form=careers'), /Thank you for applying/);
  assert.match(await site.html('/thanks?form=ask'), /Your question is with our team/);
  assert.equal((await fetch(`${site.base}/thanks?form=nope`)).status, 404);
});
```

Create `tests/e2e/forms.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';

async function fillDemo(page: Page, phone = '98950 85731') {
  await page.getByLabel("Student's name").fill(`E2E Booking ${test.info().project.name}`);
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByLabel('Class', { exact: true }).selectOption('9');
  await page.getByLabel('Board').selectOption('CBSE');
  await page.getByLabel('Online or at a centre?').selectOption('Online');
}

test('booking a demo shows a confirmation and offers a call while WhatsApp is not set up', async ({ page }) => {
  await page.goto('/demo');
  await fillDemo(page);
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue on WhatsApp' })).toHaveCount(0);
  await expect(page.locator('[data-form-done]').getByRole('link', { name: /^Call / })).toBeVisible();
});

test('a wrong phone number is explained next to the field', async ({ page }) => {
  await page.goto('/demo');
  await fillDemo(page, '12345');
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page.locator('[data-error-for="phone"]')).toHaveText('Enter a 10-digit Indian mobile number.');
  await expect(page.getByLabel('Mobile number')).toBeFocused();
});

test('without JavaScript the form posts and lands on the thanks page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/demo');
  await fillDemo(page);
  await page.getByRole('button', { name: 'Book my free demo' }).click();
  await expect(page).toHaveURL(/\/thanks\?form=demo$/);
  await expect(page.getByRole('heading', { name: 'Your demo class request is in' })).toBeVisible();
  await context.close();
});
```

In `tests/e2e/pages.ts` add `'/thanks?form=demo'` before `'/does-not-exist'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. The new page tests fail: no form markup, and `/thanks` returns 404.

- [ ] **Step 3: Add the `noindex` prop to `src/layouts/Base.astro`**

Change the Props line to:
`interface Props { title?: string; description: string; page: string; noindex?: boolean }`
and the destructuring to:
`const { title, description, page, noindex = false } = Astro.props;`
Then add after the `og:description` meta:
`    {noindex && <meta name="robots" content="noindex, nofollow" />}`

- [ ] **Step 4: Create `src/components/FormField.astro`**

```astro
---
type Option = string | { value: string; label: string };
interface Props {
  name: string; label: string; as?: 'input' | 'select' | 'textarea'; type?: string; required?: boolean; maxlength?: number;
  options?: Option[]; placeholder?: string; autocomplete?: string; inputmode?: string; rows?: number; value?: string; hint?: string;
}
const { name, label, as = 'input', type = 'text', required = false, maxlength, options = [], placeholder, autocomplete, inputmode, rows = 4, value = '', hint } = Astro.props;
const id = `f-${name}`;
const choices = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
const describedBy = [hint ? `${id}-hint` : '', `${id}-error`].filter(Boolean).join(' ');
---
<div class="field">
  <label for={id}>{label}{!required && <span class="optional"> (optional)</span>}</label>
  {hint && <p class="hint" id={`${id}-hint`}>{hint}</p>}
  {as === 'select' ? (
    <select id={id} name={name} required={required} aria-describedby={describedBy}>
      <option value="" selected={!value}>{placeholder ?? 'Choose…'}</option>
      {choices.map(o => <option value={o.value} selected={o.value === value}>{o.label}</option>)}
    </select>
  ) : as === 'textarea' ? (
    <textarea id={id} name={name} required={required} maxlength={maxlength} rows={rows} placeholder={placeholder} aria-describedby={describedBy}>{value}</textarea>
  ) : (
    <input id={id} name={name} type={type} required={required} maxlength={maxlength} placeholder={placeholder} autocomplete={autocomplete} inputmode={inputmode} value={value} aria-describedby={describedBy} />
  )}
  <p class="field-error" id={`${id}-error`} data-error-for={name} hidden></p>
</div>
<style>
  .field { display: grid; gap: 0.35rem; }
  label { font-weight: 600; }
  .optional { font-weight: 400; color: var(--ink-soft); }
  .hint { font-size: var(--step--1); color: var(--ink-soft); }
  input, select, textarea { width: 100%; min-height: 3rem; padding: 0.7rem 0.9rem; border: 1px solid #cbbfdc; border-radius: var(--radius-sm); background: var(--white); font: 400 1rem/1.4 var(--font); color: var(--ink); }
  textarea { min-height: 8rem; resize: vertical; }
  input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--purple-300); outline-offset: 1px; border-color: var(--purple); }
  [aria-invalid='true'] { border-color: #b3261e; }
  .field-error { color: #b3261e; font-size: var(--step--1); font-weight: 600; }
  .field-error[hidden] { display: none; }
</style>
```

- [ ] **Step 5: Create `src/components/SmartForm.astro`**

```astro
---
import { formatPhone } from '../../server/content-store.mjs';
interface Props { kind: 'demo' | 'careers' | 'ask'; submit: string; done: string; waText: string; whatsapp: string | null; phone: string | null; error?: string | null }
const { kind, submit, done, waText, whatsapp, phone, error } = Astro.props;
const errorText = error === 'busy' ? 'Too many attempts right now. Please try again later, or call us.'
  : error ? 'Some details were missing or not valid. Please check them and send again.' : '';
const wa = whatsapp ? whatsapp.replace(/\D/g, '') : '';
---
<div class="smart-form" data-form-wrap>
  <form method="post" action={`/api/forms/${kind}`} data-smartup-form={kind} data-wa={wa} data-wa-text={waText}>
    <p class="form-error" role="alert" data-form-error hidden={!errorText}>{errorText}</p>
    <div class="fields"><slot /></div>
    <div class="trap" aria-hidden="true">
      <label for={`${kind}-website`}>Leave this empty</label>
      <input id={`${kind}-website`} name="website" tabindex="-1" autocomplete="off" />
    </div>
    <p class="notice">We use these details only to reply to you. <a href="/privacy">How we handle your data</a>.</p>
    <button class="btn btn--primary" type="submit">{submit}</button>
  </form>
  <div class="done" data-form-done hidden tabindex="-1">
    <h3>Thank you!</h3>
    <p>{done}</p>
    {wa ? <a class="btn btn--primary" data-wa-link href={`https://wa.me/${wa}`} target="_blank" rel="noopener">Continue on WhatsApp</a>
      : phone && <a class="btn btn--primary" href={`tel:${phone}`}>Call {formatPhone(phone)}</a>}
  </div>
</div>
<style>
  .smart-form { max-width: 40rem; }
  form { display: grid; gap: 1.25rem; }
  form[hidden] { display: none; }
  .fields { display: grid; gap: 1.1rem; }
  .form-error { padding: 0.9rem 1rem; border-radius: var(--radius-sm); background: #fde8e7; color: #8c1d18; font-weight: 600; }
  .form-error[hidden] { display: none; }
  .trap { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
  .notice { font-size: var(--step--1); color: var(--ink-soft); }
  .notice a { color: var(--purple); font-weight: 600; }
  button { justify-self: start; }
  .done { display: grid; gap: 1rem; justify-items: start; padding: 1.75rem; border-radius: var(--radius); background: var(--purple-tint); color: var(--ink); }
  .done[hidden] { display: none; }
  .done h3 { font-size: var(--step-2); font-weight: 800; }
</style>
```

- [ ] **Step 6: Create `src/scripts/forms.ts` and load it**

```ts
type Values = Record<string, string>;

/** Sends enquiry forms with fetch so visitors stay on the page; without JS they post normally. */
export function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-smartup-form]').forEach(form => {
    form.noValidate = true;
    const banner = form.querySelector<HTMLElement>('[data-form-error]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form)) as Values;
      clearErrors(form, banner);
      if (button) button.disabled = true;
      try {
        const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        const result = await response.json().catch(() => ({}));
        if (response.ok) showDone(form, values);
        else if (response.status === 400 && result.fields) showErrors(form, result.fields);
        else showBanner(banner, result.error ?? 'Something went wrong. Please try again, or call us.');
      } catch {
        showBanner(banner, 'You seem to be offline. Please try again, or call us.');
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
}

function clearErrors(form: HTMLFormElement, banner: HTMLElement | null) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach(el => { el.textContent = ''; el.hidden = true; });
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  if (banner) banner.hidden = true;
}

function showBanner(banner: HTMLElement | null, message: string) {
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

function showErrors(form: HTMLFormElement, fields: Values) {
  let first: HTMLElement | null = null;
  for (const [name, message] of Object.entries(fields)) {
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(name)}"]`);
    const control = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
    if (slot) { slot.textContent = message; slot.hidden = false; }
    if (control) { control.setAttribute('aria-invalid', 'true'); first ??= control; }
  }
  first?.focus();
}

function showDone(form: HTMLFormElement, values: Values) {
  const done = form.closest('[data-form-wrap]')?.querySelector<HTMLElement>('[data-form-done]');
  const link = done?.querySelector<HTMLAnchorElement>('[data-wa-link]');
  if (link && form.dataset.wa) {
    const text = (form.dataset.waText ?? '').replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
    link.href = `https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(text)}`;
  }
  form.hidden = true;
  if (done) { done.hidden = false; done.focus(); }
}
```

In `src/scripts/site.ts` add `import { initForms } from './forms';` after the `faq-search` import, and call `initForms();` after `initFaqSearch();`.

- [ ] **Step 7: Create `src/pages/thanks.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { getStore } from '../lib/store';
const copy = {
  demo: { title: 'Your demo class request is in', text: 'Our team will call you within a day to fix a time for the free demo class.', wa: 'Hi Smartup, I just booked a free demo class on your website.', back: { href: '/courses', label: 'Explore our courses' } },
  careers: { title: 'Thank you for applying', text: 'Our team will review your application and contact you if there is a match.', wa: 'Hi Smartup, I just applied for a job on your website.', back: { href: '/story', label: 'Read our story' } },
  ask: { title: 'Your question is with our team', text: 'We will reply by phone or email, usually within a day.', wa: 'Hi Smartup, I just sent a question on your website.', back: { href: '/ask', label: 'Back to the questions' } },
};
const kind = Astro.url.searchParams.get('form') ?? '';
if (!Object.hasOwn(copy, kind)) return Astro.rewrite('/404');
const page = copy[kind as keyof typeof copy];
const settings = getStore(Astro.locals).settings();
const wa = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(page.wa)}` : null;
---
<Base title="Thank you" description="Your message has reached the Smartup team." page="thanks" noindex>
  <section class="section">
    <div class="container done">
      <p class="eyebrow">Sent</p>
      <h1>{page.title}</h1>
      <p class="text">{page.text}</p>
      <div class="actions">
        {wa ? <a class="btn btn--primary" href={wa} target="_blank" rel="noopener">Continue on WhatsApp</a>
          : settings.phone && <a class="btn btn--primary" href={`tel:${settings.phone}`}>Call {formatPhone(settings.phone)}</a>}
        <a class="link-arrow" href={page.back.href}>{page.back.label}</a>
      </div>
    </div>
  </section>
</Base>
<style>
  .done { display: grid; gap: 1rem; justify-items: start; max-width: 40rem; }
  h1 { font-size: var(--step-4); font-weight: 800; }
  .text { font-size: var(--step-1); color: var(--ink-soft); }
  .actions { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
</style>
```

- [ ] **Step 8: Replace `src/pages/demo.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import PageHero from '../components/PageHero.astro';
import SmartForm from '../components/SmartForm.astro';
import FormField from '../components/FormField.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { GRADES, BOARDS, MODES } from '../../server/forms.mjs';
import { getStore } from '../lib/store';
const store = getStore(Astro.locals);
const settings = store.settings();
const centres = store.centres();
const error = Astro.url.searchParams.get('error');
const steps = [`Send the form, or call us (${settings.hours})`, 'We call you back to fix a time that suits you', 'Join a free demo class, online or at a centre'];
---
<Base title="Book a free demo class" description="Book a free Smartup demo class online or at one of our centres in Kochi." page="demo">
  <PageHero eyebrow="Free demo class" title="Book a free" highlight="demo class" intro="See how Smartup teaches before you decide. Fill in the form and we will call you back." tone="purple">
    <div class="actions">
      <a class="btn btn--yellow" href="#book">Book now</a>
      {settings.phone && <a class="btn btn--ghost" href={`tel:${settings.phone}`}>Call {formatPhone(settings.phone)}</a>}
      {settings.whatsapp && <a class="btn btn--ghost" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I would like to book a free demo class.')}`} target="_blank" rel="noopener">WhatsApp us</a>}
    </div>
  </PageHero>
  <section class="section" id="book" aria-labelledby="book-title">
    <div class="container">
      <h2 id="book-title" class="title">Tell us about the student</h2>
      <SmartForm kind="demo" submit="Book my free demo" done="Our team will call you within a day to fix a time for the demo class." waText="Hi Smartup, I'm {name}. I just booked a free demo class for Class {grade} ({board})." whatsapp={settings.whatsapp} phone={settings.phone} error={error}>
        <FormField name="name" label="Student's name" required maxlength={80} autocomplete="name" />
        <FormField name="phone" label="Mobile number" type="tel" required maxlength={16} autocomplete="tel" inputmode="tel" hint="We call this number to fix the demo." />
        <FormField name="grade" label="Class" as="select" required options={GRADES} />
        <FormField name="board" label="Board" as="select" required options={BOARDS} />
        <FormField name="mode" label="Online or at a centre?" as="select" required options={MODES} />
        <FormField name="centre" label="Preferred centre" as="select" options={centres.map(c => c.name)} placeholder="Choose if learning at a centre" />
        <FormField name="preferred_time" label="Preferred time" maxlength={60} placeholder="e.g. 6 pm on weekdays" />
      </SmartForm>
    </div>
  </section>
  <section class="section section--cream" aria-labelledby="steps-title">
    <div class="container">
      <h2 id="steps-title" class="title">How it works</h2>
      <ol class="steps" data-reveal="group">{steps.map((s, i) => <li data-reveal-item><span class="n">{i + 1}</span>{s}</li>)}</ol>
    </div>
  </section>
  {centres.length > 0 && (
    <section class="section" aria-labelledby="near-title">
      <div class="container">
        <h2 id="near-title" class="title">Or call your nearest centre</h2>
        <ul class="near">{centres.map(c => <li><span>{c.name}</span><a href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a></li>)}</ul>
      </div>
    </section>
  )}
</Base>
<style>
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
  .actions .btn--ghost { color: var(--white); }
  .title { font-size: var(--step-3); font-weight: 800; margin-bottom: 1.5rem; }
  .steps { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  .steps li { display: grid; gap: 0.75rem; padding: 1.5rem; border-radius: var(--radius); background: var(--white); font-weight: 600; }
  .n { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--purple); color: var(--white); font-weight: 800; }
  .near { list-style: none; padding: 0; display: grid; gap: 0.25rem; max-width: 32rem; }
  .near li { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.15rem 0; border-bottom: 1px solid #ddd2c2; }
  .near a { display: inline-flex; align-items: center; min-height: 44px; font-weight: 600; text-decoration: none; color: var(--purple); }
</style>
```

- [ ] **Step 9: Add the application form to `src/pages/careers.astro`**

1. In the frontmatter:
   - Delete the `apply` constant.
   - Add `import SmartForm from '../components/SmartForm.astro';` and `import FormField from '../components/FormField.astro';`.
   - Add these lines:
     ```ts
     const roles = jobs.map(j => j.title);
     const asked = Astro.url.searchParams.get('role') ?? '';
     const chosen = roles.includes(asked) ? asked : '';
     const error = Astro.url.searchParams.get('error');
     ```
2. Replace the job button
`<a class="btn btn--primary" href={apply(job.title)}>Apply by email</a>`
with
`<a class="btn btn--primary" href={`/careers?role=${encodeURIComponent(job.title)}#apply`}>Apply</a>`.
3. Insert this section before the "How to apply" section:

```astro
  <section class="section section--cream" id="apply" aria-labelledby="apply-title">
    <div class="container">
      <h2 id="apply-title" class="apply-title">Apply for a role</h2>
      <SmartForm kind="careers" submit="Send my application" done="Our team will review your application and contact you if there is a match." waText="Hi Smartup, I'm {name}. I just applied for {role}." whatsapp={settings.whatsapp} phone={settings.phone} error={error}>
        <FormField name="name" label="Your name" required maxlength={80} autocomplete="name" />
        <FormField name="phone" label="Mobile number" type="tel" required maxlength={16} autocomplete="tel" inputmode="tel" />
        <FormField name="email" label="Email" type="email" required maxlength={120} autocomplete="email" />
        <FormField name="role" label="Role" as="select" required options={[...roles, 'Other']} value={chosen} />
        <FormField name="experience" label="Teaching experience" maxlength={200} placeholder="e.g. 3 years teaching Physics for Class 11 and 12" />
        <FormField name="cv_url" label="Link to your CV" type="url" maxlength={300} hint="Share a Google Drive or LinkedIn link. We can't accept file uploads." />
        <FormField name="message" label="Message" as="textarea" maxlength={1500} />
      </SmartForm>
    </div>
  </section>
```

4. Change the "How to apply" heading text to `Prefer email?`, and add this style:
```css
  .apply-title { font-size: var(--step-3); font-weight: 800; margin-bottom: 1.5rem; }
```

- [ ] **Step 10: Add the question form to `src/pages/ask.astro`**

Add `import SmartForm from '../components/SmartForm.astro';` and `import FormField from '../components/FormField.astro';`, plus `const error = Astro.url.searchParams.get('error');` in the frontmatter. Insert this section between the FAQ section and the purple "Still have a question?" section:

```astro
  <section class="section section--cream" id="ask-form" aria-labelledby="ask-form-title">
    <div class="container">
      <h2 id="ask-form-title" class="form-title">Ask your question</h2>
      <p class="form-intro">Our team replies by phone or email, usually within a day.</p>
      <SmartForm kind="ask" submit="Send my question" done="Our team will reply by phone or email, usually within a day." waText="Hi Smartup, I'm {name}. I just sent a question on your website." whatsapp={settings.whatsapp} phone={settings.phone} error={error}>
        <FormField name="name" label="Your name" required maxlength={80} autocomplete="name" />
        <FormField name="phone" label="Mobile number" type="tel" required maxlength={16} autocomplete="tel" inputmode="tel" />
        <FormField name="email" label="Email" type="email" maxlength={120} autocomplete="email" />
        <FormField name="question" label="Your question" as="textarea" required maxlength={1500} rows={5} />
      </SmartForm>
    </div>
  </section>
```

Change the purple section's heading from `Still have a question?` to `Prefer to talk?`, and add these styles:
```css
  .form-title { font-size: var(--step-3); font-weight: 800; }
  .form-intro { margin: 0.5rem 0 1.5rem; color: var(--ink-soft); }
```

- [ ] **Step 11: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)" && npm run test:e2e -- tests/e2e/forms.spec.ts tests/e2e/layout.spec.ts tests/e2e/ask.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS. This includes the 360px overflow check on `/demo`, `/careers`, `/ask` and `/thanks?form=demo`, and the existing Ask e2e tests.

- [ ] **Step 12: Commit**

```bash
git add src tests
git commit -m "Turn Demo, Careers and Ask into working forms with a no-JS fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Admin schema and validation

**Files:**
- Create: `server/admin-schema.mjs`, `tests/admin-schema.test.mjs`

**Interfaces:**
- Consumes: `normalizePhone`, `isWebUrl`, `isEmail`.
- Produces: `SECTIONS: Record<key, {label, table, order, sortable?, title, subtitle, fields: Field[], check?(values) → errors}>`. The keys are `timeline, stats, growth, leaders, faculty, results, testimonials, alumni, videos, events, posts, faqs, jobs, centres`.
- Produces: `SETTINGS: Field[]`.
- Produces: `Field = {name, label, type, required?, max?, min?, options?: {value,label}[], hint?, default?, pattern?, patternMessage?, prefix?, of?, itemMax?, fields?, item?, nullable?}`. The types are `text, textarea, markdown, int, checkbox, select, url, email, phone, youtube, slug, date, image, path, lines, group, list`.
- Produces: `cleanValue(field, raw)` (throws an `Error` whose message is shown to staff), `validateRow(section, input) → {values, errors}`, `validateSettings(input) → {values, errors}`, `youtubeId(text) → id | null` and `publicSchema()`.

- [ ] **Step 1: Write the failing tests**

Create `tests/admin-schema.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ContentStore } from '../server/content-store.mjs';
import { SECTIONS, SETTINGS, cleanValue, validateRow, validateSettings, youtubeId, publicSchema } from '../server/admin-schema.mjs';

const field = (type, extra = {}) => ({ name: 'f', label: 'Field', type, ...extra });

test('text is trimmed, required and limited in length', () => {
  assert.equal(cleanValue(field('text', { max: 20 }), '  Two   words '), 'Two words');
  assert.throws(() => cleanValue(field('text', { required: true }), '  '), /required/);
  assert.throws(() => cleanValue(field('text', { max: 5 }), 'too long'), /under 5/);
  assert.equal(cleanValue(field('textarea'), 'a\r\nb'), 'a\nb');
  assert.throws(() => cleanValue(field('text', { pattern: '^\\d{4}', patternMessage: 'Start with the year.' }), 'Next'), /Start with the year/);
});

test('links must be web addresses', () => {
  assert.equal(cleanValue(field('url'), 'https://maps.app.goo.gl/x'), 'https://maps.app.goo.gl/x');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'maps.app.goo.gl/x']) assert.throws(() => cleanValue(field('url'), bad), /https:\/\//, bad);
});

test('YouTube links of every common shape become a video ID', () => {
  for (const link of ['dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1', 'https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ']) assert.equal(youtubeId(link), 'dQw4w9WgXcQ', link);
  assert.equal(youtubeId('https://vimeo.com/123'), null);
  assert.throws(() => cleanValue(field('youtube', { required: true }), 'nope'), /YouTube/);
});

test('images must come from the media library or the seed photos', () => {
  assert.equal(cleanValue(field('image'), '/media/u-abc-12345678'), '/media/u-abc-12345678');
  assert.equal(cleanValue(field('image'), '/seed/img/faculty-x'), '/seed/img/faculty-x');
  for (const bad of ['/media/../server', 'https://evil.example/x', '/media/u-x.webp']) assert.throws(() => cleanValue(field('image'), bad), /media library/, bad);
});

test('numbers, dates, slugs, phones, choices and checkboxes are checked', () => {
  assert.equal(cleanValue(field('int', { min: 0, max: 10 }), '7'), 7);
  assert.throws(() => cleanValue(field('int', { min: 0, max: 10 }), '11'), /0 to 10/);
  assert.throws(() => cleanValue(field('int'), '2.5'), /whole number/);
  assert.equal(cleanValue(field('date'), '2026-10-13'), '2026-10-13');
  assert.throws(() => cleanValue(field('date'), '2026-02-31'), /date like/);
  assert.throws(() => cleanValue(field('slug'), 'Board Exam'), /lowercase/);
  assert.equal(cleanValue(field('phone'), '98950 85731'), '+919895085731');
  assert.throws(() => cleanValue(field('select', { options: [{ value: 'a', label: 'A' }] }), 'b'), /options/);
  assert.equal(cleanValue(field('checkbox'), true), 1);
  assert.equal(cleanValue(field('checkbox'), undefined), 0);
  assert.throws(() => cleanValue(field('path', { prefix: '/seed/video/' }), '/etc/passwd'), /\/seed\/video\//);
});

test('lists check every item and say which one is wrong', () => {
  const photos = SECTIONS.events.fields.find(f => f.name === 'media');
  assert.deepEqual(cleanValue(photos, [{ src: '/media/u-a-1', alt: 'Stage' }]), [{ src: '/media/u-a-1', alt: 'Stage' }]);
  assert.throws(() => cleanValue(photos, [{ src: '/media/u-a-1', alt: 'Stage' }, { src: '/media/u-b-2', alt: '' }]), /Item 2: Describe the photo: This is required/);
});

test('rows are validated as a whole, including a photo needing its description', () => {
  const { values, errors } = validateRow(SECTIONS.faqs, { category: 'Admissions', question: 'When do classes start?', answer: 'In June.', published: true });
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { category: 'Admissions', question: 'When do classes start?', answer: 'In June.', published: 1 });
  assert.deepEqual(validateRow(SECTIONS.leaders, { name: 'A', role: 'B', photo: '/media/u-a-1', photo_alt: '' }).errors, { photo_alt: 'Describe the photo for people who cannot see it.' });
});

test('settings clean every field; an empty WhatsApp number means "not set"', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  store.applySeed();
  const current = Object.fromEntries(store.db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, JSON.parse(r.value)]));
  const { values, errors } = validateSettings({ ...current, whatsapp: '', phones: '88919 10919\n73560 72079' });
  assert.deepEqual(errors, {});
  assert.equal(values.whatsapp, null);
  assert.deepEqual(values.phones, ['+918891910919', '+917356072079']);
  assert.equal(validateSettings({ ...current, whatsapp: '98950 85731' }).values.whatsapp, '+919895085731');
  assert.ok(validateSettings({ ...current, social: [{ network: 'facebook', label: 'Facebook', url: 'javascript:x' }] }).errors.social);
});

test('every section field is a real column of its table', () => {
  const store = new ContentStore(new DatabaseSync(':memory:'));
  for (const [key, section] of Object.entries(SECTIONS)) {
    const columns = store.db.prepare(`PRAGMA table_info(${section.table})`).all().map(c => c.name);
    assert.ok(columns.length > 0, `${key}: table ${section.table} exists`);
    for (const f of section.fields) assert.ok(columns.includes(f.name), `${key}.${f.name}`);
  }
});

test('the schema sent to the admin page has no table names or server checks', () => {
  const schema = JSON.parse(JSON.stringify(publicSchema()));
  assert.equal(schema.faqs.label, 'FAQ');
  assert.equal(schema.faqs.table, undefined);
  assert.equal(schema.leaders.check, undefined);
  assert.equal(schema.faqs.sortable, true);
  assert.equal(SETTINGS.find(f => f.name === 'whatsapp').nullable, true);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. `server/admin-schema.mjs` does not exist.

- [ ] **Step 3: Create `server/admin-schema.mjs`**

```js
import { normalizePhone } from './content-store.mjs';
import { isWebUrl, isEmail } from './validators.mjs';

const options = (...items) => items.map(item => (Array.isArray(item) ? { value: item[0], label: item[1] } : { value: item, label: item }));
const published = { name: 'published', label: 'Show on the website', type: 'checkbox', default: true };
const sample = { name: 'is_sample', label: 'Sample — to be replaced (the website shows this label)', type: 'checkbox' };
const photos = { name: 'media', label: 'Photos', type: 'list', max: 12, item: [
  { name: 'src', label: 'Photo', type: 'image', required: true },
  { name: 'alt', label: 'Describe the photo', type: 'text', required: true, max: 200 },
] };
const needsAlt = (image, alt) => values => (values[image] && !values[alt] ? { [alt]: 'Describe the photo for people who cannot see it.' } : {});

/** Every section staff can edit: its table, list columns and form fields. Field names are column names. */
export const SECTIONS = {
  timeline: {
    label: 'Our Story timeline', table: 'timeline_entries', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'year_label',
    fields: [
      { name: 'year_label', label: 'Year', type: 'text', required: true, max: 10, hint: 'A year such as 2026, or Next' },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'story', label: 'Story', type: 'textarea', max: 1000 },
      { name: 'stat_value', label: 'Number', type: 'text', max: 20, hint: 'e.g. 1,600+' },
      { name: 'stat_label', label: 'What the number counts', type: 'text', max: 60, hint: 'e.g. students' },
      { ...photos, max: 6 },
      { name: 'source_url', label: 'Source link', type: 'url' },
      { name: 'featured', label: 'Show on the homepage', type: 'checkbox' },
      published,
    ],
  },
  stats: {
    label: 'Proof numbers', table: 'stats', order: 'sort, rowid', sortable: true, title: 'label', subtitle: 'value',
    fields: [
      { name: 'value', label: 'Number', type: 'text', required: true, max: 20, hint: 'e.g. 30,000+' },
      { name: 'label', label: 'Label', type: 'text', required: true, max: 60 },
      { name: 'source', label: 'Source or cohort', type: 'text', max: 120, hint: 'e.g. SSLC 2026' },
      published,
    ],
  },
  growth: {
    label: 'Growth chart', table: 'growth_points', order: 'year', title: 'year', subtitle: 'students_label',
    fields: [
      { name: 'year', label: 'Year', type: 'int', required: true, min: 2000, max: 2100 },
      { name: 'students', label: 'Students (number for the bar)', type: 'int', required: true, min: 0, max: 1000000 },
      { name: 'students_label', label: 'Students (as shown)', type: 'text', required: true, max: 20, hint: 'e.g. 1,600+' },
      { name: 'centres', label: 'Centres', type: 'int', required: true, min: 0, max: 100 },
    ],
  },
  leaders: {
    label: 'Founders', table: 'leaders', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'role',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'role', label: 'Role', type: 'text', required: true, max: 80 },
      { name: 'summary', label: 'One-line summary', type: 'textarea', max: 300 },
      { name: 'bio', label: 'Biography', type: 'textarea', max: 3000 },
      { name: 'photo', label: 'Photo', type: 'image' },
      { name: 'photo_alt', label: 'Describe the photo', type: 'text', max: 200 },
      published,
    ],
    check: needsAlt('photo', 'photo_alt'),
  },
  faculty: {
    label: 'Faculty', table: 'faculty', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'role',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'role', label: 'Subject or role', type: 'text', max: 80 },
      { name: 'team', label: 'Filter group', type: 'select', required: true, options: options(['mathematics', 'Mathematics'], ['physics', 'Physics'], ['chemistry', 'Chemistry'], ['biology', 'Biology'], ['commerce', 'Commerce'], ['humanities', 'Humanities'], ['team', 'Academic team']) },
      { name: 'qualification', label: 'Qualification', type: 'text', max: 120 },
      { name: 'experience_years', label: 'Years of teaching experience', type: 'int', min: 0, max: 60, hint: 'Leave 0 to hide' },
      { name: 'expertise', label: 'Expertise', type: 'text', max: 160, hint: 'e.g. Board exam problem solving' },
      { name: 'intro', label: 'Short introduction', type: 'textarea', max: 400 },
      { name: 'note', label: 'Note on the card', type: 'text', max: 160 },
      { name: 'photo', label: 'Photo', type: 'image' },
      published,
    ],
  },
  results: {
    label: 'Results', table: 'results', order: 'sort, rowid', sortable: true, title: 'headline', subtitle: 'year',
    fields: [
      { name: 'year', label: 'Year', type: 'text', required: true, max: 9, pattern: '^\\d{4}', patternMessage: 'Start with the year, e.g. 2026.' },
      { name: 'board', label: 'Board', type: 'select', required: true, options: options(['State', 'State Board'], 'CBSE') },
      { name: 'exam', label: 'Exam', type: 'select', required: true, options: options('SSLC', 'Class 10', 'Plus One', 'Plus Two') },
      { name: 'kind', label: 'Card type', type: 'select', required: true, options: options(['student', 'Student result'], ['summary', 'Summary (purple card)']) },
      { name: 'headline', label: 'Headline', type: 'text', required: true, max: 120, hint: 'e.g. Haleema Jihan — 9 A+' },
      { name: 'detail', label: 'Detail', type: 'textarea', max: 300 },
      { name: 'poster', label: 'Poster', type: 'image' },
      { name: 'poster_alt', label: 'Describe the poster', type: 'text', max: 200 },
      { name: 'featured', label: 'Show on the homepage', type: 'checkbox' },
      published,
    ],
    check: needsAlt('poster', 'poster_alt'),
  },
  testimonials: {
    label: 'Testimonials', table: 'testimonials', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'section',
    fields: [
      { name: 'section', label: 'Page', type: 'select', required: true, options: options(['feedback', 'Testimonials (students and parents)'], ['alumni', 'Alumni']) },
      { name: 'kind', label: 'Type', type: 'select', required: true, options: options(['written', 'Written review or screenshot'], ['video', 'Video file']) },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'person', label: 'Who said it', type: 'text', max: 120, hint: 'e.g. Parent of a Class 10 student' },
      { name: 'quote', label: 'Quote', type: 'textarea', max: 1000 },
      { name: 'image', label: 'Screenshot', type: 'image', hint: 'A screenshot of genuine feedback, if any' },
      { name: 'video', label: 'Video file', type: 'path', prefix: '/seed/video/', hint: 'Set by the developer. Add new videos on YouTube instead.' },
      { name: 'poster', label: 'Video poster', type: 'path', prefix: '/seed/video/' },
      sample,
      published,
    ],
    check: values => (values.kind === 'video' && !values.video ? { video: 'A video testimonial needs a video file. Use YouTube videos for new clips.' }
      : values.kind === 'written' && !values.quote && !values.image ? { quote: 'Add the quote, a screenshot, or both.' } : {}),
  },
  alumni: {
    label: 'Alumni stories', table: 'alumni', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'now_role',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'batch', label: 'Batch', type: 'text', max: 40, hint: 'e.g. SSLC 2019' },
      { name: 'now_role', label: 'Where they are now', type: 'text', max: 120, hint: 'e.g. MBBS student, Government Medical College' },
      { name: 'story', label: 'Their story', type: 'textarea', max: 1200 },
      { name: 'achievements', label: 'Achievements', type: 'textarea', max: 600 },
      { name: 'photo', label: 'Photo', type: 'image' },
      { name: 'photo_alt', label: 'Describe the photo', type: 'text', max: 200 },
      sample,
      published,
    ],
    check: needsAlt('photo', 'photo_alt'),
  },
  videos: {
    label: 'YouTube videos', table: 'videos', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'category',
    fields: [
      { name: 'youtube_id', label: 'YouTube link or video ID', type: 'youtube', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'category', label: 'Group', type: 'select', required: true, options: options(['classes', 'Live classes'], ['exam-prep', 'Exam preparation'], ['short-lessons', 'Short lessons'], ['toppers', 'Toppers Talk'], ['chairman', 'From the Chairman'], ['events', 'Events'], ['parents', 'Parent feedback (Testimonials page)']) },
      { name: 'format', label: 'Shape', type: 'select', required: true, options: options(['landscape', 'Landscape (16:9)'], ['portrait', 'Portrait (Shorts)']) },
      published,
    ],
  },
  events: {
    label: 'Life @ Smartup', table: 'events', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'category',
    fields: [
      { name: 'category', label: 'Activity', type: 'select', required: true, options: options('Talent Eve', 'Shoot the Drugs', 'Coffee With Chairman', 'Workshops & academics', 'Celebrations', 'Trips & camps') },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'date_label', label: 'When', type: 'text', max: 40, hint: 'e.g. March 2026' },
      { name: 'summary', label: 'Summary', type: 'textarea', max: 600 },
      photos,
      { name: 'youtube_id', label: 'YouTube video', type: 'youtube' },
      published,
    ],
  },
  posts: {
    label: 'Blog', table: 'posts', order: 'published_at DESC, rowid DESC', title: 'title', subtitle: 'published_at',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, max: 140 },
      { name: 'slug', label: 'Web address', type: 'slug', required: true, max: 80, hint: 'Lowercase words joined by hyphens, e.g. board-exam-tips. The post appears at /blog/ followed by this.' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: options('CBSE updates', 'Board exams', 'Exam preparation', 'Study tips', 'Parent guidance', 'Career guidance', 'Education trends', 'Subject tips', 'Scholarships') },
      { name: 'excerpt', label: 'Summary for the blog list', type: 'textarea', required: true, max: 300 },
      { name: 'body', label: 'Article', type: 'markdown', required: true, max: 50000, hint: '## for a heading, - for a list, **bold**, *italic*, [link text](https://…)' },
      { name: 'author', label: 'Author', type: 'text', required: true, max: 80, default: 'Smartup Academic Team' },
      { name: 'published_at', label: 'Date', type: 'date', required: true },
      sample,
      published,
    ],
  },
  faqs: {
    label: 'FAQ', table: 'faqs', order: 'sort, rowid', sortable: true, title: 'question', subtitle: 'category',
    fields: [
      { name: 'category', label: 'Topic', type: 'text', required: true, max: 60, hint: 'e.g. Admissions. Questions with the same topic are grouped.' },
      { name: 'question', label: 'Question', type: 'text', required: true, max: 200 },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true, max: 2000 },
      published,
    ],
  },
  jobs: {
    label: 'Job openings', table: 'jobs', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'type',
    fields: [
      { name: 'title', label: 'Role', type: 'text', required: true, max: 120 },
      { name: 'type', label: 'Type', type: 'select', required: true, options: options('Full time', 'Part time', 'Teaching assistant', 'Other') },
      { name: 'location', label: 'Location', type: 'text', max: 120 },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000 },
      published,
    ],
  },
  centres: {
    label: 'Centres', table: 'centres', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'phone',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 60 },
      { name: 'phone', label: 'Phone', type: 'phone', required: true },
      { name: 'map_url', label: 'Google Maps link', type: 'url', required: true },
      { name: 'hours', label: 'Hours', type: 'text', required: true, max: 40 },
      published,
    ],
  },
};

/** Site-wide settings, each stored as JSON under its name in the settings table. */
export const SETTINGS = [
  { name: 'heroHeadline', label: 'Homepage headline', type: 'text', required: true, max: 60 },
  { name: 'heroHighlight', label: 'Highlighted word (yellow marker)', type: 'text', required: true, max: 30 },
  { name: 'heroDescription', label: 'Line under the headline', type: 'text', required: true, max: 120 },
  { name: 'aboutTitle', label: 'About section title', type: 'text', required: true, max: 80 },
  { name: 'aboutText', label: 'About section text', type: 'textarea', required: true, max: 800 },
  { name: 'phone', label: 'Main phone number', type: 'phone', required: true },
  { name: 'phones', label: 'Other phone numbers (one per line)', type: 'lines', of: 'phone', max: 5 },
  { name: 'whatsapp', label: 'WhatsApp number', type: 'phone', nullable: true, hint: 'Leave empty to hide every WhatsApp button and show the phone number instead.' },
  { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
  { name: 'hours', label: 'Centre hours', type: 'text', required: true, max: 40 },
  { name: 'googleReviewsUrl', label: 'Google Reviews link', type: 'url', nullable: true },
  { name: 'appLinks', label: 'App store links', type: 'group', fields: [
    { name: 'ios', label: 'App Store link', type: 'url', required: true },
    { name: 'android', label: 'Google Play link', type: 'url', required: true },
  ] },
  { name: 'social', label: 'Social media links', type: 'list', max: 12, item: [
    { name: 'network', label: 'Network', type: 'select', required: true, options: options(['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']) },
    { name: 'label', label: 'Label', type: 'text', required: true, max: 80 },
    { name: 'url', label: 'Link', type: 'url', required: true },
  ] },
  { name: 'communityLinks', label: 'Student groups (WhatsApp, Telegram)', type: 'list', max: 10, item: [
    { name: 'label', label: 'Name', type: 'text', required: true, max: 80 },
    { name: 'url', label: 'Invite link', type: 'url', required: true },
  ] },
  { name: 'positioning', label: 'Positioning line', type: 'text', max: 160 },
  { name: 'mission', label: 'Mission', type: 'textarea', max: 600 },
  { name: 'companyVision', label: 'Company vision', type: 'textarea', max: 600 },
  { name: 'vision', label: 'Vision for the future (Our Story)', type: 'group', fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
    { name: 'tagline', label: 'Tagline', type: 'text', required: true, max: 120 },
    { name: 'text', label: 'Paragraphs (one per line)', type: 'lines', of: 'text', itemMax: 800, max: 6 },
    { name: 'priorities', label: 'Priorities', type: 'list', max: 8, item: [
      { name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
      { name: 'text', label: 'Text', type: 'textarea', required: true, max: 400 },
    ] },
    { name: 'vision2030', label: 'Vision 2030', type: 'textarea', max: 600 },
  ] },
  { name: 'legalName', label: 'Registered company name', type: 'text', max: 120 },
  { name: 'registeredOffice', label: 'Registered office', type: 'group', fields: [
    { name: 'address', label: 'Address', type: 'textarea', required: true, max: 300 },
    { name: 'mapUrl', label: 'Map link', type: 'url', required: true },
  ] },
];

const IMAGE = /^\/(seed\/img|media)\/[a-z0-9]+(-[a-z0-9]+)*$/;
const YOUTUBE_ID = /^[\w-]{11}$/;
const empty = value => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/** A YouTube ID from an ID, a watch/short/embed link or a youtu.be link; null otherwise. */
export function youtubeId(value) {
  const text = String(value).trim();
  if (YOUTUBE_ID.test(text)) return text;
  try {
    const url = new URL(text);
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    const id = host === 'youtu.be' ? url.pathname.slice(1)
      : host === 'youtube.com' ? (url.searchParams.get('v') ?? /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(url.pathname)?.[1] ?? '')
      : '';
    return YOUTUBE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

function cleanGroup(fields, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Fill in this section.');
  const out = {};
  for (const sub of fields) {
    try { out[sub.name] = cleanValue(sub, raw[sub.name]); } catch (error) { throw new Error(`${sub.label}: ${error.message}`); }
  }
  return out;
}

/** Returns the cleaned value for one field, or throws an Error whose message is shown to staff. */
export function cleanValue(field, raw) {
  const fail = message => { throw new Error(message); };
  if (field.type === 'checkbox') return raw === true || raw === 1 || raw === '1' || raw === 'on' ? 1 : 0;
  if (field.type === 'group') return cleanGroup(field.fields, raw);
  if (field.type === 'list') {
    const items = raw ?? [];
    if (!Array.isArray(items)) fail('Use a list here.');
    if (items.length > (field.max ?? 20)) fail(`Add at most ${field.max ?? 20} items.`);
    return items.map((item, i) => { try { return cleanGroup(field.item, item); } catch (error) { throw new Error(`Item ${i + 1}: ${error.message}`); } });
  }
  if (field.type === 'lines') {
    const items = (Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('\n') : []).map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
    if (field.required && !items.length) fail('Add at least one line.');
    if (items.length > (field.max ?? 20)) fail(`Add at most ${field.max ?? 20} lines.`);
    return items.map((item, i) => {
      try { return cleanValue({ type: field.of ?? 'text', label: '', required: true, max: field.itemMax ?? 200 }, item); } catch (error) { throw new Error(`Line ${i + 1}: ${error.message}`); }
    });
  }
  if (empty(raw)) {
    if (field.required) fail('This is required.');
    return field.type === 'int' ? 0 : '';
  }
  if (field.type === 'int') {
    const n = Number(raw);
    if (!Number.isInteger(n)) fail('Use a whole number.');
    if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) fail(`Use a number from ${field.min} to ${field.max}.`);
    return n;
  }
  if (typeof raw !== 'string') fail('Use text here.');
  const multi = field.type === 'textarea' || field.type === 'markdown';
  const text = multi ? raw.replace(/\r\n?/g, '\n').trim() : raw.replace(/\s+/g, ' ').trim();
  const max = field.max ?? (multi ? 5000 : 200);
  if (text.length > max) fail(`Keep this under ${max} characters.`);
  switch (field.type) {
    case 'text':
      if (field.pattern && !new RegExp(field.pattern).test(text)) fail(field.patternMessage ?? 'Check the format.');
      return text;
    case 'textarea':
    case 'markdown':
      return text;
    case 'select':
      if (!field.options.some(o => o.value === text)) fail('Choose one of the options.');
      return text;
    case 'url':
      if (!isWebUrl(text)) fail('Use a full web address starting with https://');
      return text;
    case 'email':
      if (!isEmail(text)) fail('Use a valid email address.');
      return text;
    case 'phone':
      try { return normalizePhone(text); } catch { return fail('Use a 10-digit Indian mobile number.'); }
    case 'youtube':
      return youtubeId(text) ?? fail('Paste a YouTube link or an 11-character video ID.');
    case 'slug':
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(text)) fail('Use lowercase letters, numbers and hyphens, e.g. board-exam-tips.');
      return text;
    case 'date': {
      const date = new Date(`${text}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) fail('Use a date like 2026-10-13.');
      return text;
    }
    case 'image':
      if (!IMAGE.test(text)) fail('Choose an image from the media library.');
      return text;
    case 'path':
      if (!text.startsWith(field.prefix) || text.includes('..') || !/^[\w/.-]+$/.test(text)) fail(`Use a file path starting with ${field.prefix}`);
      return text;
    default:
      return fail(`Unknown field type ${field.type}.`);
  }
}

export function validateRow(section, input) {
  const values = {};
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { values, errors: { _: 'Send the form fields.' } };
  for (const field of section.fields) {
    try { values[field.name] = cleanValue(field, input[field.name]); } catch (error) { errors[field.name] = error.message; }
  }
  if (!Object.keys(errors).length && section.check) Object.assign(errors, section.check(values));
  return { values, errors };
}

export function validateSettings(input) {
  const values = {};
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { values, errors: { _: 'Send the settings.' } };
  for (const field of SETTINGS) {
    try { values[field.name] = field.nullable && empty(input[field.name]) ? null : cleanValue(field, input[field.name]); } catch (error) { errors[field.name] = error.message; }
  }
  return { values, errors };
}

/** The schema as the admin page sees it: labels and fields only; tables and checks stay on the server. */
export function publicSchema() {
  return Object.fromEntries(Object.entries(SECTIONS).map(([key, s]) => [key, { label: s.label, title: s.title, subtitle: s.subtitle, sortable: Boolean(s.sortable), fields: s.fields }]));
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

If 'settings clean every field' fails on a seeded value (for example a vision paragraph longer than `itemMax`), the seed is right and the limit is too tight. Raise that one limit and ledger it as a ruling.

- [ ] **Step 5: Commit**

```bash
git add server/admin-schema.mjs tests/admin-schema.test.mjs
git commit -m "Describe every editable section and setting in one validated schema

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Admin content and settings API

**Files:**
- Create: `server/admin-content.mjs`, `server/admin-routes.mjs`, `tests/admin-api.test.mjs`
- Modify: `server.mjs`

**Interfaces:**
- Consumes: `SECTIONS`, `SETTINGS`, `validateRow`, `validateSettings`, `publicSchema` (Task 7); `seedSettings` (Task 2); `httpError` (Task 3); the admin hook context `{ req, res, url, route, respond, body }` (Task 3).
- Produces: `class AdminContent(db)` with these methods:
  - `list(key)` returns rows that each carry `id` (the rowid), with checkboxes as booleans and lists/groups as parsed JSON.
  - `create(key, input) → id` and `update(key, id, input)`.
  - `remove(key, id)` and `reorder(key, ids: number[])`.
  - `settings() → object` and `saveSettings(input)`.
  - `references(base) → section labels`.
  - Errors are `httpError` values (400 with `fields`, 404, 409 with `fields`).
- Produces: `createAdminRoutes({ admin, media?, inbox? })`, which serves:
  - `GET /api/admin/schema` → `{sections, settings}`.
  - `GET|POST /api/admin/content/:key`.
  - `PUT /api/admin/content/:key/order {ids}`.
  - `PUT|DELETE /api/admin/content/:key/:id`.
  - `GET|PUT /api/admin/settings`.
  - Errors return `{error, fields?}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/admin-api.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startSite } from './helpers/site.mjs';
import { ContentStore } from '../server/content-store.mjs';
import { SECTIONS, validateRow } from '../server/admin-schema.mjs';
import { AdminContent } from '../server/admin-content.mjs';

test('every seeded row already passes its section rules, so staff can save it unchanged', () => {
  const content = new ContentStore(new DatabaseSync(':memory:'));
  content.applySeed();
  const admin = new AdminContent(content.db);
  for (const [key, section] of Object.entries(SECTIONS)) {
    for (const row of admin.list(key)) assert.deepEqual(validateRow(section, row).errors, {}, `${key} #${row.id}`);
  }
});

test('admin content and the schema need a signed-in session', async t => {
  const site = await startSite(t);
  assert.equal((await site.call('/api/admin/content/faqs', { signedIn: false })).status, 401);
  assert.equal((await site.call('/api/admin/schema', { signedIn: false })).status, 401);
});

test('the schema lists every section and settings field for the admin page', async t => {
  const site = await startSite(t);
  await site.signIn();
  const { data } = await site.call('/api/admin/schema');
  assert.deepEqual(Object.keys(data.sections), Object.keys(SECTIONS));
  assert.ok(data.settings.some(f => f.name === 'whatsapp'));
});

test('staff can add, edit, reorder and delete an FAQ, and the Ask page follows', async t => {
  const site = await startSite(t);
  await site.signIn();
  const created = await site.call('/api/admin/content/faqs', { method: 'POST', json: { category: 'Admissions', question: 'Is there a sibling discount?', answer: 'Ask our team at any centre.', published: true } });
  assert.equal(created.status, 201);
  const { id } = created.data;
  assert.match(await site.page('/ask'), /Is there a sibling discount\?/);
  assert.equal((await site.call(`/api/admin/content/faqs/${id}`, { method: 'PUT', json: { category: 'Admissions', question: 'Do siblings get a discount?', answer: 'Yes, ask at any centre.', published: true } })).status, 200);
  const ask = await site.page('/ask');
  assert.match(ask, /Do siblings get a discount\?/);
  assert.doesNotMatch(ask, /Is there a sibling discount/);
  const { items } = (await site.call('/api/admin/content/faqs')).data;
  assert.equal(items.at(-1).id, id, 'new items go to the end');
  const order = [id, ...items.filter(i => i.id !== id).map(i => i.id)];
  assert.equal((await site.call('/api/admin/content/faqs/order', { method: 'PUT', json: { ids: order } })).status, 200);
  assert.equal((await site.call('/api/admin/content/faqs')).data.items[0].id, id);
  assert.equal((await site.call(`/api/admin/content/faqs/${id}`, { method: 'DELETE', json: {} })).status, 200);
  assert.doesNotMatch(await site.page('/ask'), /Do siblings get a discount/);
  assert.equal((await site.call(`/api/admin/content/faqs/${id}`, { method: 'DELETE', json: {} })).status, 404);
});

test('hidden items stay in the admin list but leave the website', async t => {
  const site = await startSite(t);
  await site.signIn();
  const { data } = await site.call('/api/admin/content/faqs', { method: 'POST', json: { category: 'Admissions', question: 'A hidden draft question?', answer: 'Not yet.', published: false } });
  assert.doesNotMatch(await site.page('/ask'), /A hidden draft question/);
  const item = (await site.call('/api/admin/content/faqs')).data.items.find(i => i.id === data.id);
  assert.equal(item.published, false);
});

test('invalid input returns field messages; a used web address is refused', async t => {
  const site = await startSite(t);
  await site.signIn();
  const bad = await site.call('/api/admin/content/faqs', { method: 'POST', json: { category: '', question: '', answer: '' } });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.data.fields).sort(), ['answer', 'category', 'question']);
  const [post] = (await site.call('/api/admin/content/posts')).data.items;
  const dup = await site.call('/api/admin/content/posts', { method: 'POST', json: { ...post, title: 'Copy' } });
  assert.equal(dup.status, 409);
  assert.ok(dup.data.fields.slug);
});

test('unknown sections, ids and inherited names are not found', async t => {
  const site = await startSite(t);
  await site.signIn();
  for (const route of ['/api/admin/content/nope', '/api/admin/content/__proto__', '/api/admin/content/constructor', '/api/admin/nope']) assert.equal((await site.call(route)).status, 404, route);
  assert.equal((await site.call('/api/admin/content/faqs/99999', { method: 'PUT', json: { category: 'A', question: 'Question here?', answer: 'Answer here.' } })).status, 404);
});

test('settings load, save, and change the site; bad values are explained', async t => {
  const site = await startSite(t);
  await site.signIn();
  const { settings } = (await site.call('/api/admin/settings')).data;
  assert.equal(settings.whatsapp, null);
  assert.doesNotMatch(await site.page('/demo'), /wa\.me/);
  assert.equal((await site.call('/api/admin/settings', { method: 'PUT', json: { ...settings, whatsapp: '98950 85731', hours: '4–9 pm' } })).status, 200);
  assert.match(await site.page('/demo'), /wa\.me\/919895085731/);
  assert.match(await site.page('/contact'), /4–9 pm/);
  const bad = await site.call('/api/admin/settings', { method: 'PUT', json: { ...settings, email: 'nope' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.fields.email);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. `server/admin-content.mjs` does not exist.

- [ ] **Step 3: Create `server/admin-content.mjs`**

```js
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
    const { values, errors } = validateSettings(input);
    if (Object.keys(errors).length) throw httpError(400, 'Check the highlighted fields.', errors);
    const put = this.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, value] of Object.entries(values)) put.run(key, JSON.stringify(value));
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
    return used;
  }
}
```

- [ ] **Step 4: Create `server/admin-routes.mjs`**

```js
import { publicSchema, SETTINGS } from './admin-schema.mjs';

/** Staff API under /api/admin/. The Quest handler has already checked the session. */
export function createAdminRoutes({ admin, media, inbox }) {
  return async ({ req, res, url, route, respond, body }) => {
    const [area, key, id, action] = route.split('/').slice(3);
    const numeric = value => (/^\d+$/.test(value ?? '') ? Number(value) : null);
    try {
      if (area === 'schema' && req.method === 'GET') return respond(200, { sections: publicSchema(), settings: SETTINGS });
      if (area === 'content' && key) {
        if (req.method === 'GET' && id === undefined) return respond(200, { items: admin.list(key) });
        if (req.method === 'POST' && id === undefined) return respond(201, { id: admin.create(key, await body(req)) });
        if (req.method === 'PUT' && id === 'order') { admin.reorder(key, (await body(req)).ids); return respond(200, { ok: true }); }
        const itemId = numeric(id);
        if (itemId !== null && action === undefined) {
          if (req.method === 'PUT') { admin.update(key, itemId, await body(req)); return respond(200, { ok: true }); }
          if (req.method === 'DELETE') { admin.remove(key, itemId); return respond(200, { ok: true }); }
        }
      }
      if (area === 'settings' && key === undefined) {
        if (req.method === 'GET') return respond(200, { settings: admin.settings() });
        if (req.method === 'PUT') { admin.saveSettings(await body(req)); return respond(200, { ok: true }); }
      }
      return respond(404, { error: 'Not found.' });
    } catch (error) {
      if (!error.status) throw error;
      return respond(error.status, { error: error.message, ...(error.fields ? { fields: error.fields } : {}) });
    }
  };
}
```

(`media`, `inbox`, `res` and `url` are used in Tasks 9 and 10.)

- [ ] **Step 5: Wire the admin routes into `createSiteServer`**

In `server.mjs` add:

```js
import { AdminContent } from './server/admin-content.mjs';
import { createAdminRoutes } from './server/admin-routes.mjs';
```

and change the handler line to:

```js
  const admin = new AdminContent(store.db);
  const api = createAssessmentHandler({ ...options, store, routes: { forms: createFormRoutes({ content, inbox }), admin: createAdminRoutes({ admin, inbox }), ...options.routes } });
```

- [ ] **Step 6: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

If 'every seeded row already passes its section rules' fails, the message names the section, the row and the field. Raise that field's `max` in `server/admin-schema.mjs` (seed content is client-approved) and ledger a ruling.

- [ ] **Step 7: Commit**

```bash
git add server/admin-content.mjs server/admin-routes.mjs server.mjs tests/admin-api.test.mjs
git commit -m "Add the admin API for every content section and the site settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Media library: uploads, WebP sizes and /media

**Files:**
- Create: `server/media-library.mjs`, `tests/media-library.test.mjs`
- Modify: `server/admin-routes.mjs`, `server.mjs`, `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: `readBuffer` (Task 3), `AdminContent.references(base)` (Task 8) and `httpError`.
- Produces: `WIDTHS = [480, 960, 1600]`, `MAX_UPLOAD = 10 MB` and `MEDIA_TYPES: string[]`.
- Produces: `class MediaLibrary(db, dir)` with these methods:
  - `list()` returns `{id, name, alt, width, height, createdAt, base}[]`, newest first.
  - `async add(buffer, type, alt)` returns `{id, name, alt, width, height, base}`.
  - `get(id)` and `async remove(id) → boolean`.
- Produces the routes:
  - `GET /api/admin/media`.
  - `POST /api/admin/media?alt=…` with the raw image body. It returns 201, or 400, 413 or 415.
  - `DELETE /api/admin/media/:id`. It returns 200, 404, or 409 when the photo is in use.
- Produces: `GET /media/<name>-<width>.webp`, served from `uploadsDir` with immutable caching.
- Produces: `createSiteServer({ uploadsDir })`. The default is `DATA_DIR/uploads`.

- [ ] **Step 1: Move sharp to runtime dependencies**

Run: `npm install sharp@0.35.5 --save`
Expected: `package.json` lists `"sharp": "0.35.5"` under `dependencies` and no longer under `devDependencies`. If npm writes `^0.35.5`, change it to the exact `0.35.5` to match the other pins.

- [ ] **Step 2: Write the failing tests**

Create `tests/media-library.test.mjs`:

```js
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
```

- [ ] **Step 3: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. `server/media-library.mjs` does not exist.

- [ ] **Step 4: Create `server/media-library.mjs`**

```js
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
```

- [ ] **Step 5: Add the media routes to `server/admin-routes.mjs`**

Add the imports:

```js
import { readBuffer } from './read-body.mjs';
import { MAX_UPLOAD, MEDIA_TYPES } from './media-library.mjs';
```

Insert before the `settings` block:

```js
      if (area === 'media' && media) {
        if (req.method === 'GET' && key === undefined) return respond(200, { items: media.list() });
        if (req.method === 'POST' && key === undefined) {
          const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
          if (!MEDIA_TYPES.includes(type)) return respond(415, { error: 'Upload a JPEG, PNG or WebP image.' });
          const buffer = await readBuffer(req, MAX_UPLOAD);
          return respond(201, await media.add(buffer, type, url.searchParams.get('alt')));
        }
        const itemId = numeric(key);
        if (req.method === 'DELETE' && itemId !== null && id === undefined) {
          const item = media.get(itemId);
          if (!item) return respond(404, { error: 'This photo no longer exists.' });
          const used = admin.references(item.base);
          if (used.length) return respond(409, { error: `This photo is used in: ${used.join(', ')}. Remove it there first.` });
          await media.remove(itemId);
          return respond(200, { ok: true });
        }
      }
```

- [ ] **Step 6: Serve `/media` and pass the library in `server.mjs`**

Add `import { MediaLibrary } from './server/media-library.mjs';`. In `createSiteServer`, before `const admin = …`, add:

```js
  const uploadsDir = path.resolve(options.uploadsDir ?? path.join(process.env.DATA_DIR || 'data', 'uploads'));
  const media = new MediaLibrary(store.db, uploadsDir);
```

and pass `media` into the admin routes: `admin: createAdminRoutes({ admin, media, inbox })`.

In the request handler, insert this right after the line that rejects dot-files and `/server|client` paths:

```js
      // Staff uploads: unique names, so they never change and can be cached for a year.
      if (pathname.startsWith('/media/')) {
        const found = await findFile(uploadsDir, pathname.slice('/media'.length));
        return found ? sendFile(req, res, found, 'public, max-age=31536000, immutable', send) : send(404, 'Page not found');
      }
```

- [ ] **Step 7: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/media-library.mjs server/admin-routes.mjs server.mjs package.json package-lock.json tests/media-library.test.mjs
git commit -m "Add the media library: photo uploads become WebP sizes served from /media

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Inbox admin API

**Files:**
- Modify: `server/admin-routes.mjs`
- Create: `tests/admin-inbox.test.mjs`

**Interfaces:**
- Consumes: `InboxStore`, `INBOXES` (Task 4) and `createAdminRoutes` (Task 8).
- Produces these routes:
  - `GET /api/admin/inbox` → `{counts}`.
  - `GET /api/admin/inbox/:kind` → `{items}`.
  - `GET /api/admin/inbox/:kind/export` → a CSV download.
  - `PUT /api/admin/inbox/:kind/:id {status?, notes?, answer?}`.
  - `DELETE /api/admin/inbox/:kind/:id`.
  - `POST /api/admin/inbox/ask/:id/publish {category, question, answer}` → `{faqId}`.
- Produces: `GET /api/admin/schema` also returns `inboxes: {demo|careers|ask: {label, fields}}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/admin-inbox.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from './helpers/site.mjs';

const booking = { name: 'Asha', phone: '9895085731', grade: '9', board: 'CBSE', mode: 'Online' };
const send = (site, kind, data) => site.call(`/api/forms/${kind}`, { method: 'POST', json: data, signedIn: false });

test('a booking from the website appears in the admin inbox and its count', async t => {
  const site = await startSite(t);
  await send(site, 'demo', booking);
  assert.equal((await site.call('/api/admin/inbox/demo', { signedIn: false })).status, 401);
  await site.signIn();
  assert.equal((await site.call('/api/admin/inbox/demo')).data.items[0].name, 'Asha');
  assert.deepEqual((await site.call('/api/admin/inbox')).data.counts, { demo: 1, careers: 0, ask: 0 });
  assert.deepEqual(Object.keys((await site.call('/api/admin/schema')).data.inboxes), ['demo', 'careers', 'ask']);
});

test('staff can update the status and notes, then delete an entry', async t => {
  const site = await startSite(t);
  await send(site, 'demo', booking);
  await site.signIn();
  const [entry] = (await site.call('/api/admin/inbox/demo')).data.items;
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'PUT', json: { status: 'contacted', notes: 'Demo fixed for Monday' } })).status, 200);
  const [updated] = (await site.call('/api/admin/inbox/demo')).data.items;
  assert.equal(updated.status, 'contacted');
  assert.equal(updated.notes, 'Demo fixed for Monday');
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'PUT', json: { status: 'lost' } })).status, 400);
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'DELETE', json: {} })).status, 200);
  assert.equal((await site.call(`/api/admin/inbox/demo/${entry.id}`, { method: 'DELETE', json: {} })).status, 404);
  assert.equal((await site.call('/api/admin/inbox/nope')).status, 404);
});

test('the CSV export downloads every booking with formulas neutralised', async t => {
  const site = await startSite(t);
  await send(site, 'demo', { ...booking, name: '=HYPERLINK("http://x")' });
  assert.equal((await site.call('/api/admin/inbox/demo/export', { signedIn: false })).status, 401);
  await site.signIn();
  const csv = await site.call('/api/admin/inbox/demo/export');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /^text\/csv/);
  assert.match(csv.headers.get('content-disposition'), /^attachment; filename="smartup-demo-\d{4}-\d{2}-\d{2}\.csv"$/);
  assert.match(csv.text, /"'=HYPERLINK\(""http:\/\/x""\)"/);
});

test('an answered question can be published to the FAQ', async t => {
  const site = await startSite(t);
  await send(site, 'ask', { name: 'Meera', phone: '9895085731', question: 'do u teach class 8 online??' });
  await site.signIn();
  const [question] = (await site.call('/api/admin/inbox/ask')).data.items;
  const published = await site.call(`/api/admin/inbox/ask/${question.id}/publish`, { method: 'POST', json: { category: 'Programmes', question: 'Do you teach Class 8 online?', answer: 'Yes. Class 8 is taught online and at every centre.' } });
  assert.equal(published.status, 201);
  assert.match(await site.page('/ask'), /Do you teach Class 8 online\?/);
  assert.equal((await site.call('/api/admin/inbox/ask')).data.items[0].status, 'closed');
  const bad = await site.call(`/api/admin/inbox/ask/${question.id}/publish`, { method: 'POST', json: { category: '', question: 'Q', answer: '' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.fields.category);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. The inbox routes return 404.

- [ ] **Step 3: Add the inbox routes to `server/admin-routes.mjs`**

Add `import { INBOXES } from './inbox.mjs';`. Change the schema line to:

```js
      if (area === 'schema' && req.method === 'GET') {
        const inboxes = Object.fromEntries(Object.entries(INBOXES).map(([kind, box]) => [kind, { label: box.label, fields: box.fields }]));
        return respond(200, { sections: publicSchema(), settings: SETTINGS, inboxes });
      }
```

Insert before the `settings` block:

```js
      if (area === 'inbox' && inbox) {
        if (key === undefined && req.method === 'GET') return respond(200, { counts: inbox.counts() });
        if (!Object.hasOwn(INBOXES, key)) return respond(404, { error: 'Not found.' });
        if (req.method === 'GET' && id === undefined) return respond(200, { items: inbox.list(key) });
        if (req.method === 'GET' && id === 'export') {
          const date = new Date().toISOString().slice(0, 10);
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="smartup-${key}-${date}.csv"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(inbox.csv(key));
        }
        const itemId = numeric(id);
        const gone = () => respond(404, { error: 'This entry no longer exists.' });
        if (itemId !== null && action === undefined && req.method === 'PUT') return inbox.update(key, itemId, await body(req)) ? respond(200, { ok: true }) : gone();
        if (itemId !== null && action === undefined && req.method === 'DELETE') return inbox.remove(key, itemId) ? respond(200, { ok: true }) : gone();
        if (itemId !== null && key === 'ask' && action === 'publish' && req.method === 'POST') {
          const faqId = inbox.publishAnswer(itemId, await body(req));
          return faqId ? respond(201, { faqId }) : gone();
        }
      }
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/admin-routes.mjs tests/admin-inbox.test.mjs
git commit -m "Add admin inboxes: list, status and notes, delete, CSV export, publish to FAQ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Show the new content on the public pages

**Files:**
- Create: `src/components/SampleBadge.astro`, `src/components/AlumniCard.astro`
- Modify: `src/pages/alumni.astro`, `src/pages/index.astro`, `src/pages/faculty.astro`, `src/pages/careers.astro`, `src/components/QuoteCard.astro`, `src/components/VideoCard.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `tests/pages.test.mjs`

**Interfaces:**
- Consumes: the `alumni()` reader and the extra fields from Task 2.
- Produces: `<SampleBadge />` and `<AlumniCard story={…} />`. `QuoteCard`'s `item` gains `image?`, `isSample?`; `VideoCard`'s `item` gains `isSample?`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('alumni stories from the admin appear on the Alumni page and the homepage', async t => {
  const site = await start(content => content.db.exec("INSERT INTO alumni(name, batch, now_role, story, achievements, is_sample) VALUES('Anjali R', 'SSLC 2016', 'Software engineer, Bengaluru', 'Joined in Class 8.', 'Full A+', 1)"));
  t.after(site.close);
  const alumni = await site.html('/alumni');
  assert.match(alumni, /Anjali R/);
  assert.match(alumni, /SSLC 2016 · Software engineer, Bengaluru/);
  assert.match(alumni, /Sample — to be replaced/);
  assert.match(await site.html('/'), /Anjali R/);
});

test('faculty details and job descriptions show once staff add them', async t => {
  const site = await start(content => {
    content.db.exec("UPDATE faculty SET experience_years = 12, expertise = 'Board exam problem solving' WHERE rowid = (SELECT MIN(rowid) FROM faculty)");
    content.db.exec("UPDATE jobs SET description = 'Teach Physics to Classes 11 and 12.' WHERE rowid = (SELECT MIN(rowid) FROM jobs)");
  });
  t.after(site.close);
  const faculty = await site.html('/faculty');
  assert.match(faculty, /12 years of teaching/);
  assert.match(faculty, /Board exam problem solving/);
  assert.match(await site.html('/careers'), /Teach Physics to Classes 11 and 12\./);
});

test('a written review can be a screenshot, and sample reviews are labelled', async t => {
  const site = await start(content => content.db.exec("INSERT INTO testimonials(kind, section, title, person, quote, image, is_sample, sort) VALUES('written', 'feedback', 'WhatsApp message from a parent', 'Parent', '', '/seed/img/faculty-abdul-ahad-ag', 1, 99)"));
  t.after(site.close);
  const page = await site.html('/testimonials');
  assert.match(page, /srcset="\/seed\/img\/faculty-abdul-ahad-ag-480\.webp/);
  assert.match(page, /Sample — to be replaced/);
});

test('the starter blog posts carry the sample label until approved', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/blog'), /Sample — to be replaced/);
  assert.match(await site.html('/blog/board-exam-90-day-plan'), /Sample — to be replaced/);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. All 4 new tests fail.

- [ ] **Step 3: Create the two components**

`src/components/SampleBadge.astro`:

```astro
<span class="sample-badge">Sample — to be replaced</span>
<style>
  .sample-badge { display: inline-block; justify-self: start; align-self: start; padding: 0.15rem 0.6rem; border-radius: 999px; background: #fff4d6; color: #6b4e00; font-size: var(--step--1); font-weight: 600; }
</style>
```

`src/components/AlumniCard.astro`:

```astro
---
import Picture from './Picture.astro';
import SampleBadge from './SampleBadge.astro';
interface Props { story: { name: string; batch: string; nowRole: string; story: string; achievements: string; photo: string; photoAlt: string; isSample: boolean } }
const { story } = Astro.props;
const meta = [story.batch, story.nowRole].filter(Boolean).join(' · ');
---
<article class="alumni-card" data-reveal-item>
  {story.photo && <div class="photo"><Picture base={story.photo} alt={story.photoAlt} sizes="(min-width: 900px) 22rem, 80vw" /></div>}
  {story.isSample && <SampleBadge />}
  <h3>{story.name}</h3>
  {meta && <p class="meta">{meta}</p>}
  {story.story && <p class="story">{story.story}</p>}
  {story.achievements && <p class="achievements"><strong>Achievements:</strong> {story.achievements}</p>}
</article>
<style>
  .alumni-card { display: grid; gap: 0.6rem; align-content: start; padding: 1.25rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--white); color: var(--ink); }
  .photo { border-radius: var(--radius-sm); overflow: hidden; background: var(--purple-tint); }
  .photo :global(img) { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
  h3 { font-size: var(--step-2); }
  .meta { font-weight: 600; color: var(--purple); font-size: var(--step--1); }
  .story { white-space: pre-line; }
  .achievements { color: var(--ink-soft); font-size: var(--step--1); white-space: pre-line; }
</style>
```

- [ ] **Step 4: Alumni page and homepage**

In `src/pages/alumni.astro`:
- Add the import `import AlumniCard from '../components/AlumniCard.astro';` and `const stories = store.alumni();`.
- Rename `const alumni = …` to `const videos = store.testimonials('alumni');`.
- Replace the existing `{alumni.length > 0 && (…)}` section with:

```astro
  {stories.length > 0 && (
    <section class="section" aria-labelledby="alumni-stories-title">
      <div class="container">
        <SectionHead eyebrow="Stories" title="Alumni journeys" id="alumni-stories-title" />
        <div class="stories" data-reveal="group">{stories.map(story => <AlumniCard story={story} />)}</div>
      </div>
    </section>
  )}
  {videos.length > 0 && (
    <section class="section" aria-labelledby="alumni-videos-title">
      <div class="container">
        <SectionHead eyebrow="Videos" title="In their own words" id="alumni-videos-title" />
        <div class="rail tall" data-reveal="group">{videos.map(item => item.kind === 'video' ? <VideoCard item={item} /> : <QuoteCard item={item} />)}</div>
      </div>
    </section>
  )}
  {stories.length === 0 && videos.length === 0 && (
    <section class="section"><div class="container"><p class="empty">Alumni stories will appear here soon.</p></div></section>
  )}
```

Add these styles:
```css
  .stories { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); }
  .empty { font-size: var(--step-1); }
```

In `src/pages/index.astro`:
- Add `import AlumniCard from '../components/AlumniCard.astro';` and `const alumniStories = store.alumni().slice(0, 3);`.
- Change `{alumni.length > 0 && (` to `{(alumni.length > 0 || alumniStories.length > 0) && (`.
- Change the rail body to:

```astro
          {alumniStories.map(story => <AlumniCard story={story} />)}
          {alumni.map(item => item.kind === 'video' ? <VideoCard item={item} /> : <QuoteCard item={item} />)}
```

- [ ] **Step 5: Faculty and job details**

In `src/pages/faculty.astro`, after `{person.qualification && <p class="qual">{person.qualification}</p>}` add:

```astro
                {person.experienceYears > 0 && <p class="qual">{person.experienceYears} {person.experienceYears === 1 ? 'year' : 'years'} of teaching</p>}
                {person.expertise && <p class="note">{person.expertise}</p>}
                {person.intro && <p class="intro">{person.intro}</p>}
```

and the style `.intro { font-size: var(--step--1); margin-top: 0.25rem; }`.

In `src/pages/careers.astro`, below the job location line inside the same `<div>`, add
`{job.description && <p class="description">{job.description}</p>}`
and the style `.description { margin-top: 0.35rem; color: var(--ink-soft); font-size: var(--step--1); white-space: pre-line; }`.

- [ ] **Step 6: Screenshots and sample labels on cards and posts**

Replace `src/components/QuoteCard.astro`:

```astro
---
import Picture from './Picture.astro';
import SampleBadge from './SampleBadge.astro';
interface Props { item: { title: string; person: string; quote: string; image?: string; isSample?: boolean } }
const { item } = Astro.props;
---
<figure class="quote-card" data-reveal-item>
  {item.isSample && <SampleBadge />}
  {item.image && (
    <a class="shot" href={`${item.image}-1600.webp`} target="_blank" rel="noopener" aria-label={`Open the screenshot: ${item.title}`}>
      <Picture base={item.image} alt={`Screenshot of feedback: ${item.title}`} sizes="(min-width: 900px) 22rem, 80vw" />
    </a>
  )}
  {item.quote && <blockquote>{item.quote}</blockquote>}
  <figcaption><strong>{item.title}</strong>{item.person && <span>{item.person}</span>}</figcaption>
</figure>
<style>
  .quote-card { display: grid; gap: 1rem; align-content: space-between; padding: 1.5rem; border-radius: var(--radius); background: var(--cream); color: var(--ink); }
  .shot { display: block; border-radius: var(--radius-sm); overflow: hidden; background: var(--white); }
  .shot :global(img) { width: 100%; max-height: 28rem; object-fit: contain; }
  blockquote { margin: 0; font-size: var(--step-1); font-weight: 500; line-height: 1.45; }
  blockquote::before { content: '“'; display: block; font-size: 3rem; line-height: 0.8; font-weight: 800; color: var(--purple); }
  figcaption { display: grid; gap: 0.15rem; font-size: var(--step--1); }
  figcaption span { color: var(--ink-soft); }
</style>
```

In `src/components/VideoCard.astro`:
- Change the Props to `interface Props { item: { title: string; video: string; poster: string; isSample?: boolean } }`.
- Add `import SampleBadge from './SampleBadge.astro';`.
- Change the caption to `<figcaption>{item.isSample && <SampleBadge />} {item.title}</figcaption>`.

In `src/pages/blog/index.astro`:
- Add `import SampleBadge from '../../components/SampleBadge.astro';`.
- After `<p class="eyebrow">{p.category}</p>`, add `{p.isSample && <SampleBadge />}`.

In `src/pages/blog/[slug].astro`:
- Add the same import.
- After the `<p class="meta">…</p>` line, add `{post.isSample && <SampleBadge />}`.

- [ ] **Step 7: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)" && npm run test:e2e -- tests/e2e/layout.spec.ts tests/e2e/home.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS. This includes the existing 'Alumni shows the alumni videos …' test (3 videos and the mailto).

- [ ] **Step 8: Commit**

```bash
git add src tests
git commit -m "Show alumni stories, faculty and job details, screenshots and sample labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Results board filter, Ask topic chips and clearer chip labels

**Files:**
- Modify: `src/scripts/filters.ts`, `src/scripts/faq-search.ts`, `src/components/FilterChips.astro`, `src/components/ResultCard.astro`, `src/pages/results.astro`, `src/pages/ask.astro`, `src/pages/faculty.astro`, `tests/pages.test.mjs`, `tests/e2e/filters.spec.ts`, `tests/e2e/ask.spec.ts`

**Interfaces:**
- Produces: `FilterChips` gains `allLabel?: string` (default `'All'`) and `owner?: 'filters' | 'faq'`. `'faq'` renders `data-faq-chips` instead of `data-filter-for`.
- Produces: `initFilters()` combines several bars on one list (every bar must match), and hides `[data-filter-group]` containers that have no visible item.
- Produces: `ResultCard` gains `level?: 3 | 4` and `tags?: string`.
- Produces: `initFaqSearch()` combines topic chips with the search box. With zero FAQs it does nothing, so the search box and chips stay hidden.

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('Results headings nest: years are h3 and result headlines are h4, with board filters', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/results');
  const years = [...page.matchAll(/<h3[^>]*class="year-title"/g)].length;
  assert.ok(years >= 5);
  assert.equal([...page.matchAll(/<h3[\s>]/g)].length, years);
  assert.ok([...page.matchAll(/<h4[^>]*class="headline"/g)].length >= 60);
  assert.match(page, /aria-label="Filter by board"/);
  assert.match(page, /data-filter-tags="2026 state"/);
});
```

Append to `tests/e2e/filters.spec.ts`:

```ts
test('choosing a board on Results narrows every year to that board', async ({ page }) => {
  await page.goto('/results');
  await page.getByRole('button', { name: 'CBSE', exact: true }).click();
  const visible = await page.locator('[data-filter-tags]').evaluateAll(els => els.filter(e => !(e as HTMLElement).hidden).map(e => (e as HTMLElement).dataset.filterTags ?? ''));
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.every(tags => tags.split(' ').includes('cbse'))).toBe(true);
  await page.getByRole('button', { name: 'All boards' }).click();
  await page.getByRole('button', { name: '2023' }).click();
  await expect(page.locator('section[data-year]:visible')).toHaveCount(1);
});
```

Append to `tests/e2e/ask.spec.ts`:

```ts
test('topic chips and the search box narrow the questions together', async ({ page }) => {
  await page.goto('/ask');
  const items = page.locator('[data-faq]');
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  expect(await items.filter({ visible: true }).count()).toBeGreaterThan(0);
  await expect(page.locator('.group h3').filter({ visible: true })).toHaveText(['Parents']);
  await page.getByLabel('Search questions').fill('zzzz');
  await expect(items.filter({ visible: true })).toHaveCount(0);
  await page.getByLabel('Search questions').fill('');
  await page.getByRole('button', { name: 'All topics' }).click();
  await expect(items.filter({ visible: true })).toHaveCount(await items.count());
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"; npm run test:e2e -- tests/e2e/filters.spec.ts tests/e2e/ask.spec.ts --reporter=line 2>&1 | tail -3`
Expected: FAIL. There are no h4 headlines, no board chips and no topic chips.

- [ ] **Step 3: `FilterChips.astro`**

Replace its frontmatter and root element:

```astro
---
interface Props { label: string; target: string; options: { value: string; label: string }[]; allLabel?: string; owner?: 'filters' | 'faq' }
const { label, target, options, allLabel = 'All', owner = 'filters' } = Astro.props;
// Ask Smartup's chips are driven by its search script; every other bar by filters.ts.
const hook = owner === 'faq' ? { 'data-faq-chips': '' } : { 'data-filter-for': target };
---
<div class="chips" role="group" aria-label={label} {...hook} hidden>
  <button type="button" data-filter="all" aria-pressed="true">{allLabel}</button>
  {options.map(o => <button type="button" data-filter={o.value} aria-pressed="false">{o.label}</button>)}
</div>
```

(Keep the existing `<style>` block.) In `src/pages/faculty.astro`, pass `allLabel="Everyone"` to its `FilterChips`.

- [ ] **Step 4: Replace `src/scripts/filters.ts`**

```ts
/**
 * Chip bars filter a list by data-filter-tags. Several bars on one list combine: an item must match every bar.
 * Containers marked data-filter-group hide when none of their items are visible.
 * Without this script every item stays visible and the bars stay hidden.
 */
export function initFilters() {
  const lists = new Map<HTMLElement, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>('[data-filter-for]').forEach(bar => {
    const list = document.getElementById(bar.dataset.filterFor ?? '');
    if (list) lists.set(list, [...(lists.get(list) ?? []), bar]);
  });
  lists.forEach((bars, list) => {
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-filter-tags]'));
    const groups = Array.from(list.querySelectorAll<HTMLElement>('[data-filter-group]'));
    const apply = () => {
      const chosen = bars.map(bar => bar.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.dataset.filter ?? 'all').filter(value => value !== 'all');
      items.forEach(item => {
        const tags = (item.dataset.filterTags ?? '').split(' ');
        item.hidden = !chosen.every(value => tags.includes(value));
      });
      groups.forEach(group => { group.hidden = !group.querySelector('[data-filter-tags]:not([hidden])'); });
    };
    bars.forEach(bar => {
      bar.hidden = false;
      const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
      buttons.forEach(button => button.addEventListener('click', () => {
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        apply();
      }));
    });
  });
}
```

- [ ] **Step 5: `ResultCard.astro` gains a heading level and filter tags**

1. Change the Props and destructuring:
```astro
interface Props { result: { year: string; exam: string; headline: string; detail: string; poster: string; posterAlt: string; kind?: string }; level?: 3 | 4; tags?: string }
const { result, level = 3, tags } = Astro.props;
const Heading = level === 4 ? 'h4' : 'h3';
```
2. Root element: `<article class:list={['result', { summary }]} data-reveal-item data-filter-tags={tags}>`.
3. Headline: replace `<h3>{result.headline}</h3>` with `<Heading class="headline">{result.headline}</Heading>`.
4. In the styles, change `h3 {` to `.headline {` and `.summary h3` to `.summary .headline`, then add `.result[hidden] { display: none; }`.

- [ ] **Step 6: `results.astro` adds board chips**

1. In the frontmatter add:
```ts
const boards = [{ value: 'state', label: 'State Board' }, { value: 'cbse', label: 'CBSE' }].filter(b => results.some(r => r.board.toLowerCase() === b.value));
```
2. Replace the single `FilterChips` line with:
```astro
          <FilterChips label="Filter by year" target="results-years" options={years.map(y => ({ value: y, label: y }))} allLabel="All years" />
          {boards.length > 1 && <FilterChips label="Filter by board" target="results-years" options={boards} allLabel="All boards" />}
```
3. On each year `<section class="year" …>`, replace `data-filter-tags={group.year}` with `data-filter-group`.
4. Render both card lists with `<ResultCard result={r} level={4} tags={`${r.year} ${r.board.toLowerCase()}`} />`.

- [ ] **Step 7: Ask topic chips**

In `src/pages/ask.astro`:
- Add `import FilterChips from '../components/FilterChips.astro';` and the helper `const topic = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');`.
- Directly after the sr-only `<h2 id="faq-title">`, add:
```astro
      {categories.length > 1 && <FilterChips label="Filter by topic" target="faq-list" owner="faq" allLabel="All topics" options={categories.map(c => ({ value: topic(c), label: c }))} />}
```
- Change the FAQ item to `<div class="faq" data-faq data-category={topic(category)}>`.

Replace `src/scripts/faq-search.ts`:

```ts
/** Ask Smartup: topic chips and the search box together narrow the FAQ list. */
export function initFaqSearch() {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-faq]'));
  // With no questions there is nothing to search, so the box and chips stay hidden.
  if (items.length === 0) return;
  const input = document.getElementById('faq-search') as HTMLInputElement | null;
  const chips = document.querySelector<HTMLElement>('[data-faq-chips]');
  const none = document.getElementById('faq-none');
  const buttons = Array.from(chips?.querySelectorAll<HTMLButtonElement>('button[data-filter]') ?? []);
  let category = 'all';
  const apply = () => {
    const terms = (input?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach(item => {
      const text = item.textContent?.toLowerCase() ?? '';
      const match = (category === 'all' || item.dataset.category === category) && terms.every(t => text.includes(t));
      item.hidden = !match;
      if (match) shown++;
    });
    document.querySelectorAll<HTMLElement>('[data-faq-group]').forEach(group => { group.hidden = !group.querySelector('[data-faq]:not([hidden])'); });
    if (none) none.hidden = shown > 0;
  };
  input?.closest('form')?.removeAttribute('hidden');
  input?.addEventListener('input', apply);
  if (chips) chips.hidden = false;
  buttons.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter ?? 'all';
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    apply();
  }));
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)" && npm run test:e2e -- tests/e2e/filters.spec.ts tests/e2e/ask.spec.ts tests/e2e/layout.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS. The faculty filter tests still find the "Everyone" chip, and the Results year test still shows one year.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Filter results by board, add Ask topic chips and nest result headings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Privacy page

**Files:**
- Create: `src/pages/privacy.astro`
- Modify: `server.mjs`, `src/components/Footer.astro`, `tests/routing.test.mjs`, `tests/pages.test.mjs`, `tests/e2e/pages.ts`

**Interfaces:**
- Produces: `GET /privacy` (Astro), and a 301 from `/privacy.html` to `/privacy`.

- [ ] **Step 1: Write the failing tests**

In `tests/routing.test.mjs`, remove `'/privacy.html', ` from the list in 'Quest and v1 shared files are still served from dist', and append:

```js
test('the old privacy address redirects to the new privacy page', async () => {
  const r = await fetch(base + '/privacy.html', { redirect: 'manual' });
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/privacy');
});
```

Append to `tests/pages.test.mjs`:

```js
test('the privacy page explains form data, cookies and YouTube, and the footer links to it', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/privacy');
  for (const text of ['When you fill in a form', 'Smartup Quest', 'youtube-nocookie\\.com', 'i\\.ytimg\\.com', 'Continue on WhatsApp', 'does not use advertising or analytics cookies']) assert.match(page, new RegExp(text));
  assert.match(await site.html('/'), /href="\/privacy"/);
});
```

In `tests/e2e/pages.ts` add `'/privacy'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. `/privacy` returns 404 and `/privacy.html` returns 200.

- [ ] **Step 3: Create `src/pages/privacy.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import { formatPhone } from '../../server/content-store.mjs';
import { getStore } from '../lib/store';
const settings = getStore(Astro.locals).settings();
---
<Base title="Privacy" description="How the Smartup website handles the details you share: enquiry forms, Smartup Quest, cookies and video." page="privacy">
  <section class="section">
    <div class="container privacy">
      <p class="eyebrow">Website information</p>
      <h1>Privacy</h1>
      <p class="updated">Last updated 13 October 2026</p>

      <h2>What this website does</h2>
      <p>This website tells you about Smartup programmes, results and centres. It does not create student accounts or take payments.</p>

      <h2>When you fill in a form</h2>
      <p>The forms on this website save what you type so our team can reply:</p>
      <ul>
        <li><strong>Free demo class:</strong> the student's name, a mobile number, class, board, online or centre, preferred centre and preferred time.</li>
        <li><strong>Job application:</strong> your name, mobile number, email, the role, your experience, your message and any CV link you share.</li>
        <li><strong>Ask Smartup:</strong> your name, mobile number, email (if you give one) and your question.</li>
      </ul>
      <p>Only the Smartup team can see these details, through a password-protected admin area. We use them only to reply to you and arrange what you asked for. We do not sell them or use them for advertising. We keep them while we need them for your enquiry, and delete them when you ask.</p>
      <p>A student under 18 should ask a parent or guardian before sending a form.</p>
      <p>After you send a form you can choose <strong>Continue on WhatsApp</strong>. This opens WhatsApp with a message you can edit before sending; WhatsApp's own privacy policy then applies.</p>
      <p>If our answer to your question could help others, we may add the question and answer to our public FAQ, without your name or contact details.</p>

      <h2>Smartup Quest</h2>
      <p>When a student begins a Smartup Quest challenge, we save the student's name, phone number, class, chosen subject, answers, progress and result. The team can use these records to discuss learning support. Students should involve a parent or guardian before sharing details. Challenge results are indicative and do not replace a teacher's assessment.</p>
      <p>An essential cookie in this browser lets you reopen saved results and continue unfinished challenges for up to one year. There is one attempt per phone number for each subject.</p>

      <h2>Cookies</h2>
      <p>This website does not use advertising or analytics cookies. It uses only essential cookies: one for Smartup Quest progress, and one that keeps Smartup staff signed in to the admin area.</p>

      <h2>Videos and other services</h2>
      <p>When a page shows a YouTube video, its preview picture loads from YouTube's image server (i.ytimg.com). The YouTube player itself loads from youtube-nocookie.com only when you tap play, and Google's privacy policy then applies.</p>
      <p>Map, social media and app store links open those services, which have their own privacy policies. Fonts and photos are hosted with this website. Our hosting provider may process technical request details to serve and protect the website.</p>

      <h2>Your choices</h2>
      <p>To see, correct or delete the details you have shared with us, contact Smartup at <a href={`mailto:${settings.email}`}>{settings.email}</a>{settings.phone && <> or <a href={`tel:${settings.phone}`}>{formatPhone(settings.phone)}</a></>}.</p>
    </div>
  </section>
</Base>
<style>
  .privacy { display: grid; gap: 1rem; max-width: 44rem; }
  h1 { font-size: var(--step-4); font-weight: 800; }
  h2 { font-size: var(--step-2); font-weight: 700; margin-top: 1.5rem; }
  .updated { color: var(--ink-soft); font-size: var(--step--1); }
  ul { padding-left: 1.25rem; display: grid; gap: 0.5rem; }
  a { color: var(--purple); font-weight: 600; }
</style>
```

- [ ] **Step 4: Redirect the old address and update the footer**

In `server.mjs`:
- Change `const legacyFiles = new Set(['/assessment', '/privacy.html', '/robots.txt']);` to `const legacyFiles = new Set(['/assessment', '/robots.txt']);`.
- After the `/media/` block, add:

```js
      if (pathname === '/privacy.html') { res.writeHead(301, { Location: '/privacy', 'Cache-Control': 'public, max-age=86400' }); return res.end(); }
```

In `src/components/Footer.astro`, change `href="/privacy.html"` to `href="/privacy"`.

- [ ] **Step 5: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)" && npm run test:e2e -- tests/e2e/layout.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server.mjs src tests
git commit -m "Add the privacy page covering forms, Quest, cookies and YouTube

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Search engines and social previews

**Files:**
- Create: `src/lib/site.ts`, `src/lib/structured-data.ts`, `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`, `scripts/make-og-image.mjs`, `public/brand/og.jpg`, `tests/seo.test.mjs`
- Modify: `src/layouts/Base.astro`, `src/pages/index.astro`, `server.mjs`, `tests/routing.test.mjs`

**Interfaces:**
- Produces: `siteOrigin(url: URL): string` (`SITE_URL` env var, or else the request origin) and `hiddenFromSearch(): boolean` (`NOINDEX=1`).
- Produces: `organisationJsonLd(settings, centres, origin): string`. Every `<` in its output is escaped.
- Produces: Base gains `structuredData?: string`. Every page gets a canonical link, `og:url`, `og:image` and `twitter:card`.
- Produces: `/sitemap.xml` and `/robots.txt` (Astro endpoints).

- [ ] **Step 1: Write the failing tests**

In `tests/routing.test.mjs`, remove `'/robots.txt'` from the 'Quest and v1 shared files …' list.

Create `tests/seo.test.mjs`:

```js
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
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. There is no canonical link, `/sitemap.xml` returns 404, and `/robots.txt` is the old file.

- [ ] **Step 3: Create the helpers**

`src/lib/site.ts`:

```ts
/** The public origin for absolute links (canonical, Open Graph, sitemap). Set SITE_URL when behind a proxy. */
export const siteOrigin = (url: URL) => (process.env.SITE_URL || url.origin).replace(/\/+$/, '');

/** Preview deployments set NOINDEX=1 so search engines leave them alone. */
export const hiddenFromSearch = () => process.env.NOINDEX === '1';
```

`src/lib/structured-data.ts`:

```ts
type Settings = { legalName?: string; email: string; phone: string | null; social: { url: string }[]; registeredOffice?: { address: string } };
type Centre = { name: string; phone: string; mapUrl: string };

/** EducationalOrganization data for search engines. "<" is escaped so no text can close the script tag. */
export function organisationJsonLd(settings: Settings, centres: Centre[], origin: string) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Smartup',
    legalName: settings.legalName || undefined,
    url: `${origin}/`,
    logo: `${origin}/brand/logo.svg`,
    email: settings.email,
    telephone: settings.phone ?? undefined,
    address: settings.registeredOffice ? { '@type': 'PostalAddress', streetAddress: settings.registeredOffice.address, addressLocality: 'Kochi', addressRegion: 'Kerala', addressCountry: 'IN' } : undefined,
    sameAs: settings.social.map(s => s.url),
    department: centres.map(c => ({ '@type': 'EducationalOrganization', name: `Smartup ${c.name}`, telephone: c.phone, hasMap: c.mapUrl })),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

`src/pages/sitemap.xml.ts`:

```ts
import type { APIRoute } from 'astro';
import { navGroups } from '../lib/nav';
import { getStore } from '../lib/store';
import { siteOrigin } from '../lib/site';

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: APIRoute = ({ locals, url }) => {
  const origin = siteOrigin(url);
  const pages = ['/', ...navGroups.flatMap(group => group.links.map(link => link.href)), '/privacy'];
  const posts = getStore(locals).posts().map(post => `/blog/${post.slug}`);
  const urls = [...new Set([...pages, ...posts])].map(path => `  <url><loc>${escapeXml(origin + path)}</loc></url>`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
```

`src/pages/robots.txt.ts`:

```ts
import type { APIRoute } from 'astro';
import { siteOrigin, hiddenFromSearch } from '../lib/site';

export const GET: APIRoute = ({ url }) => {
  const body = hiddenFromSearch()
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteOrigin(url)}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
```

In `server.mjs`, change `const legacyFiles = new Set(['/assessment', '/robots.txt']);` to `const legacyFiles = new Set(['/assessment']);`.

- [ ] **Step 4: Head tags in `src/layouts/Base.astro`**

1. Add `import { siteOrigin, hiddenFromSearch } from '../lib/site';`.
2. Change the Props to `interface Props { title?: string; description: string; page: string; noindex?: boolean; structuredData?: string }` and the destructuring to `const { title, description, page, noindex = false, structuredData } = Astro.props;`.
3. Add:
```ts
const origin = siteOrigin(Astro.url);
const canonical = `${origin}${Astro.url.pathname}`;
```
4. Replace the block from `<meta property="og:type" …>` through the Task 6 robots line with:

```astro
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Smartup" />
    <meta property="og:url" content={canonical} />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={`${origin}/brand/og.jpg`} />
    <meta name="twitter:card" content="summary_large_image" />
    {(noindex || hiddenFromSearch()) && <meta name="robots" content="noindex, nofollow" />}
    {structuredData && <script type="application/ld+json" is:inline set:html={structuredData} />}
```

In `src/pages/index.astro`:
- Add `import { organisationJsonLd } from '../lib/structured-data';` and `import { siteOrigin } from '../lib/site';`.
- Change `<Base description={description} page="home">` to `<Base description={description} page="home" structuredData={organisationJsonLd(settings, centres, siteOrigin(Astro.url))}>`.

- [ ] **Step 5: Make the social preview image**

Create `scripts/make-og-image.mjs`:

```js
import sharp from 'sharp';

// One-off: the 1200×630 social preview, a Talent Eve photo with the logo on a white panel.
const photo = 'public/seed/img/life-talent-eve-stage-1600.webp';
const logo = await sharp('public/brand/logo.svg', { density: 400 }).resize({ width: 420 }).png().toBuffer();
const panel = await sharp({ create: { width: 500, height: 150, channels: 4, background: '#ffffff' } }).composite([{ input: logo, gravity: 'centre' }]).png().toBuffer();
await sharp(photo).resize(1200, 630, { fit: 'cover', position: 'attention' }).composite([{ input: panel, left: 48, top: 432 }]).jpeg({ quality: 82, mozjpeg: true }).toFile('public/brand/og.jpg');
console.log('public/brand/og.jpg written');
```

Run: `node scripts/make-og-image.mjs && ls -l public/brand/og.jpg`
Expected: the file exists and is under 200 KB. Open it with the Read tool and check that the logo is sharp and the photo shows people, not a blank stage. If not, use `timeline-2026-talent-eve-1600.webp` instead and re-run.

- [ ] **Step 6: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src scripts/make-og-image.mjs public/brand/og.jpg server.mjs tests
git commit -m "Add canonical links, social previews, sitemap, robots and structured data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Small polish deferred from Phase 2

**Files:**
- Modify: `src/pages/ask.astro`, `src/pages/testimonials.astro`, `src/pages/videos.astro`, `src/pages/contact.astro`, `src/pages/courses.astro`, `src/pages/404.astro`, `tests/pages.test.mjs`, `tests/routing.test.mjs`, `tests/e2e/ask.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/pages.test.mjs`:

```js
test('pages without content say so instead of showing empty sections', async t => {
  const site = await start(content => content.db.exec('UPDATE testimonials SET published = 0; UPDATE videos SET published = 0; UPDATE centres SET published = 0;'));
  t.after(site.close);
  assert.match(await site.html('/testimonials'), /Student and parent stories will appear here soon/);
  assert.match(await site.html('/videos'), /New videos are on their way/);
  const contact = await site.html('/contact');
  assert.doesNotMatch(contact, /id="centres-title"/);
  assert.doesNotMatch(contact, /0 centres/);
  assert.doesNotMatch(await site.html('/courses'), /0 centres/);
  assert.doesNotMatch(await site.html('/demo'), /id="near-title"/);
});
```

Run `grep -rn "isn't here yet" tests` and, in every match (at least 'an unknown blog post returns the branded 404' in `tests/routing.test.mjs`), change `/This page isn't here yet/` to `/We couldn't find that page/`.

Append to `tests/e2e/ask.spec.ts`:

```ts
test('each question shows a plus sign inside the page edge that turns into a minus when open', async ({ page }) => {
  await page.goto('/ask');
  const summary = page.locator('[data-faq] summary').first();
  expect(await summary.evaluate(s => getComputedStyle(s, '::before').content)).toBe('"+"');
  await summary.click();
  expect(await summary.evaluate(s => getComputedStyle(s, '::before').content)).toBe('"−"');
  expect((await summary.boundingBox())!.x).toBeGreaterThanOrEqual(12);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL. The new pages test and the 404 copy test fail.

- [ ] **Step 3: Make the changes**

1. `src/pages/ask.astro`: replace
`  summary { min-height: 44px; padding: 1rem 0; font-weight: 600; cursor: pointer; list-style-position: outside; }`
with
```css
  summary { display: flex; gap: 0.75rem; min-height: 44px; padding: 1rem 0; font-weight: 600; cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: '+'; flex: none; width: 1rem; font-weight: 800; color: var(--purple); }
  details[open] summary::before { content: '−'; }
```
and change `details p { padding-bottom: 1rem; …}` so its padding is `padding: 0 0 1rem 1.75rem;`.
2. `src/pages/testimonials.astro`: just before `</Base>`, add
```astro
  {videos.length === 0 && parentClips.length === 0 && written.length === 0 && (
    <section class="section"><div class="container"><p class="empty">Student and parent stories will appear here soon.</p></div></section>
  )}
```
and the style `.empty { font-size: var(--step-1); }`.
3. `src/pages/videos.astro`: just before `</Base>`, add
```astro
  {groups.length === 0 && (
    <section class="section"><div class="container"><p class="empty">New videos are on their way. Meanwhile, visit our YouTube channels above.</p></div></section>
  )}
```
and the style `.empty { font-size: var(--step-1); }`.
4. `src/pages/contact.astro`:
   - Change the PageHero `intro` to ``intro={centres.length ? `${centres.length} centres across Kochi, all open ${settings.hours}.` : 'Call or email us, and our team will help.'}``.
   - Wrap the whole "Our centres" `<section>` in `{centres.length > 0 && ( … )}`.
5. `src/pages/courses.astro`:
   - Change the Base `description` to ``description={`Smartup programmes for CBSE and Kerala State Board: Pro, Trio, Power and the State Board programme, online${centres.length ? ` and at ${centres.length} centres in Kochi` : ''}.`}``.
   - Change the "where" SectionHead `title` to ``title={centres.length ? `Learn from home, or at ${centres.length} centres` : 'Learn from home'}`` and its `intro` to ``intro={centres.length ? `Every centre is open ${settings.hours}.` : undefined}``.
6. `src/pages/404.astro`:
   - Change the `description` to `"This page of the Smartup website could not be found."`.
   - Change the `<h1>` to `We couldn't find that page`.
   - Change the paragraph to `The link may be old or mistyped. Start with our story, or call us and we'll help.`

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)" && npm run test:e2e -- tests/e2e/ask.spec.ts tests/e2e/layout.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "Polish: FAQ plus signs, empty-page messages, live centre counts and clearer 404 text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Admin screens: sign-in, content sections and settings

**Files:**
- Create: `src/layouts/Admin.astro`, `src/pages/admin/index.astro`, `src/styles/admin.css`, `src/scripts/admin/dom.ts`, `src/scripts/admin/api.ts`, `src/scripts/admin/fields.ts`, `src/scripts/admin/media.ts`, `src/scripts/admin/content-view.ts`, `src/scripts/admin/settings-view.ts`, `src/scripts/admin/app.ts`, `tests/e2e/admin.spec.ts`
- Modify: `tests/e2e/pages.ts`

**Interfaces:**
- Consumes: the admin API from Tasks 3 and 8–10, and `renderMarkdown` (Task 1).
- Produces, in `dom.ts`: `h(tag, attrs, ...children)` (strings become text nodes, never markup), `toast(message)` and `formatPhone(e164)`.
- Produces, in `api.ts`: `api<T>(path, {method?, body?, raw?})` and `ApiError {status, message, fields}`. A 401 dispatches `admin:signed-out`.
- Produces, in `fields.ts`: the types `Field`, `Section`, `Schema` and `Control {element, read(), showError(m?), focus()}`, and `renderField(field, value): Control` for every schema type.
- Produces, in `media.ts`: `MediaItem`, `uploadMedia(file, alt)` and `pickMedia(): Promise<string | null>`.
- Produces: `contentView(main, key, schema)` and `settingsView(main, schema)`.
- Produces, in `app.ts`: sign-in, a hash router (`#/content/:key`, `#/settings`) and the nav.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/admin.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

const PASSWORD = 'e2e-only-password-0000';

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Admin password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#login-error')).toHaveText('The password is incorrect.');
});

test.describe('signed in', () => {
  // One sign-in per browser project keeps the run under the login limit (10 per 15 minutes).
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  const unique = (label: string) => `${label} ${test.info().project.name} ${Date.now()}`;

  test.beforeAll(async ({ browser }, testInfo) => {
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use;
    const context = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL: 'http://127.0.0.1:4173' });
    page = await context.newPage();
    await page.goto('/admin');
    await page.getByLabel('Admin password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
  });

  test.afterAll(async () => { await page.context().close(); });

  // The row's main button; its Move up/down buttons also mention the title, so match by class.
  const openRow = (text: string) => page.locator('.row-main', { hasText: text }).click();
  async function deleteOpenItem() {
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('#admin-toast')).toContainText('Deleted');
  }

  test('adding an FAQ shows it on the Ask page, and deleting it removes it', async () => {
    const question = unique('E2E: is there a weekend batch?');
    await page.goto('/admin#/content/faqs');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Topic').fill('E2E');
    await page.getByLabel('Question', { exact: true }).fill(question);
    await page.getByLabel('Answer', { exact: true }).fill('Yes, on Saturdays.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const ask = await page.context().newPage();
    await ask.goto('/ask');
    await expect(ask.getByText(question)).toBeVisible();
    await ask.close();
    await openRow(question);
    await deleteOpenItem();
    const after = await page.context().newPage();
    await after.goto('/ask');
    await expect(after.getByText(question)).toHaveCount(0);
    await after.close();
  });

  test('a new job opening appears on the Careers page', async () => {
    const title = unique('E2E Geography teacher');
    await page.goto('/admin#/content/jobs');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Role', { exact: true }).fill(title);
    await page.getByLabel('Type').selectOption('Part time');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const careers = await page.context().newPage();
    await careers.goto('/careers');
    await expect(careers.getByRole('heading', { name: title })).toBeVisible();
    await careers.close();
    await openRow(title);
    await deleteOpenItem();
  });

  test('the admin fits a 360px phone without sideways scrolling', async () => {
    const original = page.viewportSize();
    await page.setViewportSize({ width: 360, height: 740 });
    try {
      const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      await page.goto('/admin#/content/faculty');
      await expect(page.locator('#admin-main h1')).toHaveText('Faculty');
      await fits();
      await page.locator('.row-main').first().click();
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
      await fits();
      await page.goto('/admin#/settings');
      await expect(page.locator('#admin-main h1')).toHaveText('Settings');
      await fits();
    } finally {
      if (original) await page.setViewportSize(original);
    }
  });
});
```

(`sharp` is imported now for Task 17's upload test.) In `tests/e2e/pages.ts` add `'/admin'`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm run test:e2e -- tests/e2e/admin.spec.ts --reporter=line 2>&1 | tail -3`
Expected: FAIL. `/admin` returns 404.

- [ ] **Step 3: Layout, page and styles**

`src/layouts/Admin.astro`:

```astro
---
import '../styles/admin.css';
interface Props { title: string }
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{title}</title>
    <link rel="icon" href="/brand/owl.svg" type="image/svg+xml" />
  </head>
  <body class="admin"><slot /></body>
</html>
```

`src/pages/admin/index.astro`:

```astro
---
import Admin from '../../layouts/Admin.astro';
---
<Admin title="Smartup website admin">
  <header class="bar">
    <a href="/" class="brand"><img src="/brand/logo.svg" alt="Smartup" width="120" height="27" /></a>
    <span>Website admin</span>
    <button id="logout" type="button" class="link" hidden>Sign out</button>
  </header>
  <section id="login" class="login" hidden>
    <h1>Sign in</h1>
    <form id="login-form">
      <label for="password">Admin password</label>
      <input id="password" type="password" autocomplete="current-password" required />
      <p id="login-error" class="error" role="alert"></p>
      <button class="primary" type="submit">Sign in</button>
    </form>
  </section>
  <div id="workspace" class="workspace" hidden>
    <nav id="admin-nav" aria-label="Admin sections"></nav>
    <main id="admin-main" tabindex="-1"></main>
  </div>
  <p id="admin-toast" class="toast" role="status" aria-live="polite"></p>
  <noscript><p class="login">The admin panel needs JavaScript.</p></noscript>
  <script>import '../../scripts/admin/app';</script>
</Admin>
```

`src/styles/admin.css`:

```css
:root { --purple: #5f2ea8; --purple-dark: #392064; --ink: #1e1e1e; --muted: #5b5566; --line: #d9d2e3; --bg: #f7f5fa; --danger: #b3261e; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
* { box-sizing: border-box; }
body.admin { margin: 0; background: var(--bg); color: var(--ink); font-size: 16px; line-height: 1.5; }
[hidden] { display: none !important; }
.bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: #fff; border-bottom: 1px solid var(--line); }
.bar img { display: block; }
.bar span { font-weight: 600; color: var(--muted); }
.bar #logout { margin-left: auto; }
h1 { font-size: 1.5rem; margin: 0; }
h2 { font-size: 1.1rem; margin: 0; }
button, .button { min-height: 44px; padding: 0.5rem 1rem; border: 1px solid var(--line); border-radius: 8px; background: #fff; font: inherit; color: inherit; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; }
button.primary { background: var(--purple); border-color: var(--purple); color: #fff; font-weight: 600; }
button.danger { color: var(--danger); border-color: var(--danger); }
button.link { border: 0; background: none; color: var(--purple); padding-inline: 0.25rem; }
button:disabled { opacity: 0.45; cursor: default; }
:focus-visible { outline: 3px solid #9560d7; outline-offset: 2px; }
input, select, textarea { width: 100%; min-height: 44px; padding: 0.5rem 0.75rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; background: #fff; color: inherit; }
textarea { min-height: 7rem; resize: vertical; }
input[type='checkbox'] { width: 1.4rem; min-height: 1.4rem; height: 1.4rem; flex: none; }
input[readonly] { background: var(--bg); color: var(--muted); }
.login { max-width: 24rem; margin: 3rem auto; padding: 1.5rem; background: #fff; border: 1px solid var(--line); border-radius: 12px; display: grid; gap: 1rem; }
.login form { display: grid; gap: 0.75rem; }
.workspace { display: grid; gap: 1rem; padding: 1rem; max-width: 80rem; margin: 0 auto; }
.nav-menu > summary { min-height: 44px; display: flex; align-items: center; font-weight: 600; cursor: pointer; }
#admin-nav ul { list-style: none; padding: 0; margin: 0.25rem 0 1rem; display: grid; gap: 0.1rem; }
#admin-nav a { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; min-height: 44px; padding: 0.4rem 0.75rem; border-radius: 8px; color: var(--ink); text-decoration: none; }
#admin-nav a[aria-current='page'] { background: var(--purple); color: #fff; }
#admin-nav h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-top: 0.75rem; }
.count { min-width: 1.6rem; padding: 0 0.4rem; border-radius: 999px; background: #e8def5; color: var(--purple-dark); font-size: 0.85rem; font-weight: 700; text-align: center; }
#admin-main { min-width: 0; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 1rem; outline: none; }
.view-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
.rows { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.row-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem; border: 1px solid var(--line); border-radius: 8px; }
.row-main { flex: 1; min-width: 0; border: 0; flex-direction: column; align-items: flex-start; gap: 0; text-align: left; }
.row-main strong, .row-main .sub { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { color: var(--muted); font-size: 0.9rem; }
.badge { padding: 0.1rem 0.5rem; border-radius: 999px; background: #eee; font-size: 0.8rem; color: var(--muted); white-space: nowrap; }
.badge.new { background: #e8def5; color: var(--purple-dark); }
.move { display: flex; gap: 0.25rem; }
.move button { min-width: 44px; justify-content: center; padding: 0.25rem; }
.editor { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.3rem; min-width: 0; }
.field > label, fieldset > legend { font-weight: 600; }
.field-checkbox { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.optional, .hint { color: var(--muted); font-weight: 400; font-size: 0.9rem; margin: 0; }
.error { color: var(--danger); font-weight: 600; margin: 0; }
fieldset { border: 1px solid var(--line); border-radius: 8px; padding: 0.75rem; display: grid; gap: 0.75rem; margin: 0; min-width: 0; }
.list { display: grid; gap: 0.75rem; }
.list-item { display: grid; gap: 0.5rem; padding: 0.5rem; border-radius: 8px; background: var(--bg); }
.row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.row > input { flex: 1 1 12rem; width: auto; }
.image-field { display: grid; gap: 0.5rem; }
.thumb { width: 8rem; height: 6rem; object-fit: cover; border-radius: 6px; background: #eee; }
.image-field code { font-size: 0.85rem; color: var(--muted); overflow-wrap: anywhere; }
.markdown { display: grid; gap: 0.25rem; }
.preview { padding: 0.75rem 1rem; border: 1px dashed var(--line); border-radius: 8px; max-height: 24rem; overflow: auto; }
.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.status { color: var(--danger); font-weight: 600; margin: 0; }
.toast { position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); max-width: calc(100% - 2rem); margin: 0; padding: 0.75rem 1rem; border-radius: 8px; background: var(--ink); color: #fff; }
.toast:empty { display: none; }
.media-grid { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr)); }
.media-grid li { display: grid; gap: 0.4rem; align-content: start; }
.media-grid img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; background: #eee; }
.media-grid code { font-size: 0.8rem; overflow-wrap: anywhere; }
button.pick { padding: 0; border: 2px solid transparent; display: block; width: 100%; }
dialog { width: min(48rem, calc(100% - 2rem)); border: 1px solid var(--line); border-radius: 12px; padding: 1rem; }
dialog::backdrop { background: rgb(0 0 0 / 0.4); }
.filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
.filters button[aria-pressed='true'] { background: var(--purple); border-color: var(--purple); color: #fff; }
.entries { display: grid; gap: 0.5rem; }
.entry { border: 1px solid var(--line); border-radius: 8px; }
.entry > summary { display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; align-items: center; min-height: 44px; padding: 0.5rem 0.75rem; cursor: pointer; overflow-wrap: anywhere; }
.entry-body { display: grid; gap: 0.75rem; padding: 0 0.75rem 0.75rem; }
.entry dl { display: grid; grid-template-columns: minmax(0, max-content) minmax(0, 1fr); gap: 0.25rem 1rem; margin: 0; }
.entry dt { color: var(--muted); }
.entry dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (min-width: 900px) {
  .workspace { grid-template-columns: 16rem minmax(0, 1fr); align-items: start; padding: 1.5rem; }
  #admin-nav { position: sticky; top: 1rem; }
  #admin-main { padding: 1.5rem; }
}
```

- [ ] **Step 4: DOM, API and media helpers**

`src/scripts/admin/dom.ts`:

```ts
type Child = Node | string | number | null | undefined | false;

/** Builds an element. Strings become text nodes, so visitor text can never become markup. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value as EventListener);
    else if (key === 'class') el.className = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(typeof child === 'number' ? String(child) : child);
  return el;
}

/** A short message at the bottom of the screen, read out by screen readers. */
export function toast(message: string) {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = message;
  window.clearTimeout(Number(el.dataset.timer));
  el.dataset.timer = String(window.setTimeout(() => { el.textContent = ''; }, 4000));
}

/** +919895085731 → +91 98950 85731, as on the public site. */
export const formatPhone = (e164: string) => (/^\+91\d{10}$/.test(e164) ? `+91 ${e164.slice(3, 8)} ${e164.slice(8)}` : e164);
```

`src/scripts/admin/api.ts`:

```ts
export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

type Options = { method?: string; body?: unknown; raw?: Blob };

/** Calls the staff API. A 401 on anything but sign-in means the session has ended. */
export async function api<T = Record<string, any>>(path: string, { method = 'GET', body, raw }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Smartup-Request': '1' };
  let payload: BodyInit | undefined;
  if (raw) { payload = raw; headers['Content-Type'] = raw.type; }
  else if (method !== 'GET') { payload = JSON.stringify(body ?? {}); headers['Content-Type'] = 'application/json'; }
  const response = await fetch(`/api/admin/${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== 'login') window.dispatchEvent(new CustomEvent('admin:signed-out'));
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Something went wrong. Please try again.', data.fields);
  return data as T;
}
```

`src/scripts/admin/media.ts`:

```ts
import { api } from './api';
import { h } from './dom';

export type MediaItem = { id: number; base: string; alt: string; width: number; height: number; createdAt: string };

export const uploadMedia = (file: File, alt: string) => api<MediaItem>(`media?alt=${encodeURIComponent(alt.trim())}`, { method: 'POST', raw: file });

/** Opens a dialog of uploaded photos; resolves with the chosen photo's path, or null. */
export async function pickMedia(): Promise<string | null> {
  const { items } = await api<{ items: MediaItem[] }>('media');
  return new Promise(resolve => {
    const dialog = h('dialog', { 'aria-label': 'Choose a photo' });
    const close = (value: string | null) => { dialog.close(); dialog.remove(); resolve(value); };
    dialog.append(
      h('div', { class: 'view-head' }, h('h2', {}, 'Choose a photo'), h('button', { type: 'button', onclick: () => close(null) }, 'Cancel')),
      items.length === 0
        ? h('p', {}, 'No photos uploaded yet. Upload one with the form instead.')
        : h('ul', { class: 'media-grid' }, ...items.map(item => h('li', {},
          h('button', { type: 'button', class: 'pick', 'aria-label': `Choose: ${item.alt}`, onclick: () => close(item.base) }, h('img', { src: `${item.base}-480.webp`, alt: '' })),
          h('span', { class: 'sub' }, item.alt)))));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(null); });
    document.body.append(dialog);
    dialog.showModal();
  });
}
```

- [ ] **Step 5: Field controls**

`src/scripts/admin/fields.ts`:

```ts
import { h } from './dom';
import { renderMarkdown } from '../../lib/markdown.mjs';
import { uploadMedia, pickMedia } from './media';

export type Option = { value: string; label: string };
export type Field = {
  name: string; label: string; type: string; required?: boolean; max?: number; min?: number; options?: Option[];
  hint?: string; default?: unknown; fields?: Field[]; item?: Field[]; of?: string; prefix?: string; nullable?: boolean;
};
export type Section = { label: string; title: string; subtitle: string; sortable: boolean; fields: Field[] };
export type Schema = { sections: Record<string, Section>; settings: Field[]; inboxes: Record<string, { label: string; fields: { name: string; label: string }[] }> };
export type Control = { element: HTMLElement; read(): unknown; showError(message?: string): void; focus(): void };
type Group = Control & { legend: HTMLLegendElement };

let counter = 0;
const nextId = () => `field-${++counter}`;
const INPUT_TYPES: Record<string, string> = { url: 'url', email: 'email', phone: 'tel', date: 'date', int: 'number' };

/** Draws the control for one schema field and reads its value back in the shape the API expects. */
export function renderField(field: Field, value: unknown): Control {
  if (field.type === 'group') return groupField(field, value);
  if (field.type === 'list') return listField(field, value);
  const id = nextId();
  const error = h('p', { class: 'error', id: `${id}-error`, hidden: true });
  const hint = field.hint ? h('p', { class: 'hint', id: `${id}-hint` }, field.hint) : null;
  const describedBy = `${hint ? `${id}-hint ` : ''}${id}-error`;
  const showError = (message?: string) => { error.textContent = message ?? ''; error.hidden = !message; };
  const label = h('label', { for: id }, field.label, field.required || field.type === 'checkbox' ? null : h('span', { class: 'optional' }, ' (optional)'));

  if (field.type === 'checkbox') {
    const input = h('input', { type: 'checkbox', id, checked: Boolean(value ?? field.default), 'aria-describedby': describedBy });
    return { element: h('div', { class: 'field field-checkbox' }, input, label, hint, error), read: () => input.checked, showError, focus: () => input.focus() };
  }
  if (field.type === 'image') return imageField(id, label, hint, error, showError, String(value ?? ''));

  const text = value === null || value === undefined
    ? (typeof field.default === 'string' ? field.default : '')
    : Array.isArray(value) ? value.join('\n') : String(value);
  let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  let preview: HTMLElement | null = null;
  if (field.type === 'select') {
    control = h('select', { id, 'aria-describedby': describedBy },
      !field.required || !text ? h('option', { value: '' }, field.required ? 'Choose…' : '—') : null,
      ...(field.options ?? []).map(o => h('option', { value: o.value, selected: o.value === text }, o.label)));
  } else if (field.type === 'textarea' || field.type === 'markdown' || field.type === 'lines') {
    control = h('textarea', { id, rows: field.type === 'markdown' ? 18 : 5, maxlength: field.type === 'lines' ? null : field.max, 'aria-describedby': describedBy }, text);
    if (field.type === 'markdown') {
      const output = h('div', { class: 'preview', 'aria-live': 'polite' });
      // renderMarkdown escapes the source before adding its own tags, so its output is safe to insert.
      const update = () => { output.innerHTML = renderMarkdown(control.value); };
      control.addEventListener('input', update);
      update();
      preview = h('div', { class: 'markdown' }, h('p', { class: 'hint' }, 'Preview'), output);
    }
  } else {
    control = h('input', {
      id, type: INPUT_TYPES[field.type] ?? 'text', value: text, 'aria-describedby': describedBy,
      maxlength: field.type === 'int' ? null : field.max,
      min: field.type === 'int' ? field.min : null,
      max: field.type === 'int' ? field.max : null,
      readonly: field.type === 'path',
    });
  }
  const read = () => (field.type === 'lines' ? control.value.split('\n').map(line => line.trim()).filter(Boolean) : control.value);
  return { element: h('div', { class: `field field-${field.type}` }, label, hint, control, preview, error), read, showError, focus: () => control.focus() };
}

function groupField(field: Field, value: unknown): Group {
  const current = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const controls = (field.fields ?? []).map(sub => [sub, renderField(sub, current[sub.name])] as const);
  const error = h('p', { class: 'error', hidden: true });
  const legend = h('legend', {}, field.label);
  return {
    element: h('fieldset', { class: 'field' }, legend, field.hint ? h('p', { class: 'hint' }, field.hint) : null, ...controls.map(([, c]) => c.element), error),
    read: () => Object.fromEntries(controls.map(([sub, c]) => [sub.name, c.read()])),
    showError: message => { error.textContent = message ?? ''; error.hidden = !message; },
    focus: () => controls[0]?.[1].focus(),
    legend,
  };
}

function listField(field: Field, value: unknown): Control {
  type Entry = { group: Group; element: HTMLElement; up: HTMLButtonElement; down: HTMLButtonElement };
  const error = h('p', { class: 'error', hidden: true });
  const container = h('div', { class: 'list' });
  const addButton = h('button', { type: 'button' }, '+ Add');
  let entries: Entry[] = [];
  // Entries keep their DOM nodes when moved, so nothing typed is lost.
  const draw = () => {
    entries.forEach((entry, index) => {
      entry.group.legend.textContent = `${field.label}: ${index + 1}`;
      entry.up.disabled = index === 0;
      entry.down.disabled = index === entries.length - 1;
    });
    container.replaceChildren(...entries.map(entry => entry.element));
    addButton.disabled = entries.length >= (field.max ?? 20);
  };
  const move = (entry: Entry, delta: number) => {
    const from = entries.indexOf(entry);
    const to = from + delta;
    if (to < 0 || to >= entries.length) return;
    [entries[from], entries[to]] = [entries[to], entries[from]];
    draw();
  };
  const add = (data: unknown) => {
    const group = groupField({ name: field.name, label: field.label, type: 'group', fields: field.item }, data);
    const up = h('button', { type: 'button', 'aria-label': 'Move up' }, '↑');
    const down = h('button', { type: 'button', 'aria-label': 'Move down' }, '↓');
    const remove = h('button', { type: 'button', class: 'link' }, 'Remove');
    const entry: Entry = { group, up, down, element: h('div', { class: 'list-item' }, group.element, h('div', { class: 'actions' }, up, down, remove)) };
    up.addEventListener('click', () => move(entry, -1));
    down.addEventListener('click', () => move(entry, 1));
    remove.addEventListener('click', () => { entries = entries.filter(other => other !== entry); draw(); });
    entries.push(entry);
    return entry;
  };
  (Array.isArray(value) ? value : []).forEach(add);
  addButton.addEventListener('click', () => { const entry = add({}); draw(); entry.group.focus(); });
  draw();
  return {
    element: h('fieldset', { class: 'field' }, h('legend', {}, field.label), field.hint ? h('p', { class: 'hint' }, field.hint) : null, container, addButton, error),
    read: () => entries.map(entry => entry.group.read()),
    showError: message => { error.textContent = message ?? ''; error.hidden = !message; },
    focus: () => (entries[0] ? entries[0].group.focus() : addButton.focus()),
  };
}

function imageField(id: string, label: HTMLElement, hint: HTMLElement | null, error: HTMLElement, showError: (message?: string) => void, value: string): Control {
  let current = value;
  const thumb = h('img', { class: 'thumb', alt: '' });
  const path = h('code', {});
  const file = h('input', { type: 'file', id, accept: 'image/jpeg,image/png,image/webp' });
  const alt = h('input', { type: 'text', maxlength: 200, 'aria-label': 'Describe the new photo', placeholder: 'Describe the new photo' });
  const upload = h('button', { type: 'button' }, 'Upload');
  const choose = h('button', { type: 'button' }, 'Choose from library');
  const clear = h('button', { type: 'button', class: 'link' }, 'Remove image');
  const draw = () => {
    thumb.hidden = !current;
    if (current) thumb.src = `${current}-480.webp`;
    path.textContent = current || 'No image chosen';
    clear.hidden = !current;
  };
  upload.addEventListener('click', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return showError('Choose a photo file first.');
    if (!alt.value.trim()) return showError('Describe the new photo before uploading.');
    upload.disabled = true;
    try {
      current = (await uploadMedia(chosen, alt.value)).base;
      file.value = '';
      alt.value = '';
      showError();
      draw();
    } catch (failure) {
      showError(failure instanceof Error ? failure.message : 'The upload failed.');
    } finally {
      upload.disabled = false;
    }
  });
  choose.addEventListener('click', async () => {
    const base = await pickMedia();
    if (base) { current = base; draw(); }
  });
  clear.addEventListener('click', () => { current = ''; draw(); });
  draw();
  return {
    element: h('div', { class: 'field field-image' }, label, hint, h('div', { class: 'image-field' }, thumb, path, h('div', { class: 'row' }, file, alt, upload), h('div', { class: 'row' }, choose, clear)), error),
    read: () => current,
    showError,
    focus: () => file.focus(),
  };
}
```

- [ ] **Step 6: Content and settings views**

`src/scripts/admin/content-view.ts`:

```ts
import { api, ApiError } from './api';
import { h, toast } from './dom';
import { renderField, type Control, type Field, type Schema } from './fields';

type Row = Record<string, unknown> & { id: number };

/** A section's list (open, reorder) and its add/edit form. */
export async function contentView(main: HTMLElement, key: string, schema: Schema) {
  const section = schema.sections[key];
  let items = (await api<{ items: Row[] }>(`content/${key}`)).items;
  const titleOf = (item: Row) => String(item[section.title] ?? '') || '(untitled)';

  const list = () => {
    const rows = items.map((item, index) => h('li', { class: 'row-item' },
      h('button', { type: 'button', class: 'row-main', onclick: () => edit(item) },
        h('strong', {}, titleOf(item)),
        h('span', { class: 'sub' }, String(item[section.subtitle] ?? ''))),
      item.published === false ? h('span', { class: 'badge' }, 'Hidden') : null,
      item.is_sample === true ? h('span', { class: 'badge' }, 'Sample') : null,
      section.sortable ? h('span', { class: 'move' },
        h('button', { type: 'button', 'aria-label': `Move ${titleOf(item)} up`, disabled: index === 0, onclick: () => move(index, -1) }, '↑'),
        h('button', { type: 'button', 'aria-label': `Move ${titleOf(item)} down`, disabled: index === items.length - 1, onclick: () => move(index, 1) }, '↓')) : null));
    main.replaceChildren(
      h('div', { class: 'view-head' }, h('h1', {}, section.label), h('button', { type: 'button', class: 'primary', onclick: () => edit(null) }, 'Add new')),
      items.length ? h('ul', { class: 'rows' }, ...rows) : h('p', {}, 'Nothing here yet. Use “Add new”.'));
  };

  const move = async (index: number, delta: number) => {
    const next = [...items];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    await api(`content/${key}/order`, { method: 'PUT', body: { ids: next.map(item => item.id) } });
    items = next;
    list();
    main.querySelectorAll<HTMLButtonElement>('.row-main')[index + delta]?.focus();
    toast('Order saved.');
  };

  const edit = (item: Row | null) => {
    const controls: [Field, Control][] = section.fields.map(field => [field, renderField(field, item ? item[field.name] : undefined)]);
    const status = h('p', { class: 'status', role: 'alert' });
    const save = async (event: Event) => {
      event.preventDefault();
      status.textContent = '';
      controls.forEach(([, control]) => control.showError());
      const body = Object.fromEntries(controls.map(([field, control]) => [field.name, control.read()]));
      try {
        if (item) await api(`content/${key}/${item.id}`, { method: 'PUT', body });
        else await api(`content/${key}`, { method: 'POST', body });
        items = (await api<{ items: Row[] }>(`content/${key}`)).items;
        list();
        toast('Saved. The website shows the change now.');
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        status.textContent = failure.message;
        const failed = controls.filter(([field]) => failure.fields[field.name]);
        failed.forEach(([field, control]) => control.showError(failure.fields[field.name]));
        failed[0]?.[1].focus();
      }
    };
    const remove = async () => {
      if (!item || !confirm('Delete this item? This cannot be undone.')) return;
      await api(`content/${key}/${item.id}`, { method: 'DELETE' });
      items = items.filter(other => other.id !== item.id);
      list();
      toast('Deleted.');
    };
    main.replaceChildren(h('form', { class: 'editor', novalidate: true, onsubmit: save },
      h('div', { class: 'view-head' }, h('h1', {}, item ? `Edit: ${titleOf(item)}` : `Add to ${section.label}`), h('button', { type: 'button', class: 'link', onclick: list }, '← Back to the list')),
      ...controls.map(([, control]) => control.element),
      status,
      h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, 'Save'), item ? h('button', { type: 'button', class: 'danger', onclick: remove }, 'Delete') : null)));
    controls[0]?.[1].focus();
  };

  list();
}
```

`src/scripts/admin/settings-view.ts`:

```ts
import { api, ApiError } from './api';
import { h, toast } from './dom';
import { renderField, type Control, type Field, type Schema } from './fields';

export async function settingsView(main: HTMLElement, schema: Schema) {
  const { settings } = await api<{ settings: Record<string, unknown> }>('settings');
  const controls: [Field, Control][] = schema.settings.map(field => [field, renderField(field, settings[field.name])]);
  const status = h('p', { class: 'status', role: 'alert' });
  const save = async (event: Event) => {
    event.preventDefault();
    status.textContent = '';
    controls.forEach(([, control]) => control.showError());
    try {
      await api('settings', { method: 'PUT', body: Object.fromEntries(controls.map(([field, control]) => [field.name, control.read()])) });
      toast('Settings saved. The website shows the change now.');
    } catch (failure) {
      if (!(failure instanceof ApiError)) throw failure;
      status.textContent = failure.message;
      const failed = controls.filter(([field]) => failure.fields[field.name]);
      failed.forEach(([field, control]) => control.showError(failure.fields[field.name]));
      failed[0]?.[1].focus();
    }
  };
  main.replaceChildren(h('form', { class: 'editor', novalidate: true, onsubmit: save },
    h('div', { class: 'view-head' }, h('h1', {}, 'Settings')),
    h('p', { class: 'hint' }, 'Phone numbers, links and homepage text used across the website.'),
    ...controls.map(([, control]) => control.element),
    status,
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, 'Save settings'))));
}
```

- [ ] **Step 7: The app shell**

`src/scripts/admin/app.ts`:

```ts
import { api, ApiError } from './api';
import { h } from './dom';
import type { Schema } from './fields';
import { contentView } from './content-view';
import { settingsView } from './settings-view';

const DEFAULT = '#/content/timeline';
const login = document.getElementById('login') as HTMLElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const password = document.getElementById('password') as HTMLInputElement;
const loginError = document.getElementById('login-error') as HTMLElement;
const workspace = document.getElementById('workspace') as HTMLElement;
const nav = document.getElementById('admin-nav') as HTMLElement;
const main = document.getElementById('admin-main') as HTMLElement;
const logout = document.getElementById('logout') as HTMLButtonElement;
let schema: Schema | null = null;

function showLogin() {
  schema = null;
  workspace.hidden = true;
  logout.hidden = true;
  login.hidden = false;
  password.focus();
}

async function showWorkspace() {
  schema = await api<Schema>('schema');
  login.hidden = true;
  workspace.hidden = false;
  logout.hidden = false;
  await route();
}

function renderNav() {
  if (!schema) return;
  const current = location.hash || DEFAULT;
  const groups = [
    { title: 'Website content', links: Object.entries(schema.sections).map(([key, section]) => ({ href: `#/content/${key}`, label: section.label })) },
    { title: 'Site', links: [{ href: '#/settings', label: 'Settings' }] },
  ];
  nav.replaceChildren(h('details', { class: 'nav-menu', open: window.matchMedia('(min-width: 900px)').matches },
    h('summary', {}, 'Menu'),
    ...groups.map(group => h('section', {}, h('h2', {}, group.title), h('ul', {}, ...group.links.map(link =>
      h('li', {}, h('a', { href: link.href, 'aria-current': link.href === current ? 'page' : null }, link.label))))))));
}

async function route() {
  if (!schema) return;
  const [area, key] = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (area === 'content' && Object.hasOwn(schema.sections, key)) await contentView(main, key, schema);
    else if (area === 'settings') await settingsView(main, schema);
    else { location.replace(DEFAULT); return; }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    main.replaceChildren(h('p', { class: 'error' }, error instanceof Error ? error.message : 'Something went wrong.'));
  }
  renderNav();
  main.focus();
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    await api('login', { method: 'POST', body: { password: password.value } });
    password.value = '';
    await showWorkspace();
  } catch (error) {
    loginError.textContent = error instanceof Error ? error.message : 'Sign-in failed.';
  }
});
logout.addEventListener('click', async () => {
  await api('logout', { method: 'POST' }).catch(() => {});
  showLogin();
});
window.addEventListener('admin:signed-out', showLogin);
window.addEventListener('hashchange', () => { void route(); });

api('session').then(showWorkspace, error => {
  if (error instanceof ApiError && error.status === 401) showLogin();
  else loginError.textContent = 'The admin panel could not load. Refresh the page.';
});
```

- [ ] **Step 8: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)" && npm run test:e2e -- tests/e2e/admin.spec.ts tests/e2e/layout.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS on both projects. The marketing-page JS budget test in `tests/e2e/motion.spec.ts` is unaffected, because the admin bundle only loads on `/admin`.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "Add the admin panel: sign-in, every content section, photos and settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Admin inboxes and media library screens

**Files:**
- Create: `src/scripts/admin/inbox-view.ts`, `src/scripts/admin/media-view.ts`
- Modify: `src/scripts/admin/app.ts`, `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `api`, `ApiError`, `h`, `toast`, `formatPhone`, `Schema`, `uploadMedia` and `MediaItem` (Task 16), plus the inbox and media endpoints (Tasks 9–10).
- Produces: `inboxView(main, kind, schema, onChange)` and `mediaView(main)`. Routes `#/inbox/:kind` and `#/media` open them. The nav shows a count of new entries, and the default screen is `#/inbox/demo`.

- [ ] **Step 1: Write the failing tests**

Add these tests inside the `test.describe('signed in', …)` block of `tests/e2e/admin.spec.ts`, after the 360px test:

```ts
  test('a photo uploaded with an alumni story shows on the Alumni page, then both are removed', async () => {
    const name = unique('E2E Alumna');
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#5f2ea8' } }).png().toBuffer();
    await page.goto('/admin#/content/alumni');
    await page.getByRole('button', { name: 'Add new' }).click();
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel(/^Photo/).setInputFiles({ name: 'alumna.png', mimeType: 'image/png', buffer: png });
    await page.getByLabel('Describe the new photo').fill(`Portrait for ${name}`);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.locator('.field-image code')).toHaveText(/^\/media\/u-/);
    await page.getByLabel(/^Describe the photo/).fill(`Portrait for ${name}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const alumni = await page.context().newPage();
    await alumni.goto('/alumni');
    await expect(alumni.getByRole('heading', { name })).toBeVisible();
    const src = await alumni.locator(`img[alt="Portrait for ${name}"]`).getAttribute('src');
    expect((await alumni.request.get(src!)).status()).toBe(200);
    await alumni.close();
    await openRow(name);
    await deleteOpenItem();
    await page.goto('/admin#/media');
    const tile = page.locator('.media-grid li', { hasText: `Portrait for ${name}` });
    page.once('dialog', dialog => dialog.accept());
    await tile.getByRole('button', { name: 'Delete' }).click();
    await expect(tile).toHaveCount(0);
  });

  test('a demo booking reaches the inbox, can be marked contacted, exported and deleted', async () => {
    const name = unique('E2E Parent');
    const site = await page.context().newPage();
    await site.goto('/demo');
    await site.getByLabel("Student's name").fill(name);
    await site.getByLabel('Mobile number').fill('98950 85731');
    await site.getByLabel('Class', { exact: true }).selectOption('9');
    await site.getByLabel('Board').selectOption('CBSE');
    await site.getByLabel('Online or at a centre?').selectOption('Online');
    await site.getByRole('button', { name: 'Book my free demo' }).click();
    await expect(site.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
    await site.close();
    await page.goto('/admin#/inbox/demo');
    const entry = page.locator('details.entry', { hasText: name });
    await entry.locator('summary').click();
    await entry.getByLabel('Status').selectOption('contacted');
    await entry.getByLabel('Notes').fill('Called, demo on Monday');
    await entry.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Saved');
    const csv = await page.request.get('/api/admin/inbox/demo/export');
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain(name);
    page.once('dialog', dialog => dialog.accept());
    await entry.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('details.entry', { hasText: name })).toHaveCount(0);
  });

  test('visitor text in the inbox is shown as text, never as markup', async () => {
    const name = '<img src=x onerror="document.title=1">';
    const question = unique('E2E markup check');
    expect((await page.request.post('/api/forms/ask', { data: { name, phone: '9895085731', question } })).status()).toBe(201);
    await page.goto('/admin#/inbox/ask');
    const entry = page.locator('details.entry', { hasText: question });
    await expect(entry.locator('summary')).toContainText(name);
    await expect(page.locator('#admin-main img[src="x"]')).toHaveCount(0);
    expect(await page.title()).not.toBe('1');
    await entry.locator('summary').click();
    page.once('dialog', dialog => dialog.accept());
    await entry.getByRole('button', { name: 'Delete' }).click();
    await expect(entry).toHaveCount(0);
  });

  test('an answered question can be published to the FAQ', async () => {
    const question = unique('E2E: do you run a crash course before exams?');
    expect((await page.request.post('/api/forms/ask', { data: { name: 'E2E Student', phone: '9895085731', question } })).status()).toBe(201);
    await page.goto('/admin#/inbox/ask');
    const entry = page.locator('details.entry', { hasText: question });
    await entry.locator('summary').click();
    await entry.getByLabel('FAQ topic').fill('E2E');
    await entry.getByLabel('Answer', { exact: true }).fill('Yes, every January.');
    await entry.getByRole('button', { name: 'Publish to FAQ' }).click();
    await expect(page.locator('#admin-toast')).toContainText('Published');
    const ask = await page.context().newPage();
    await ask.goto('/ask');
    await expect(ask.getByText(question)).toBeVisible();
    await ask.close();
    await page.goto('/admin#/content/faqs');
    await openRow(question);
    await deleteOpenItem();
  });
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm run test:e2e -- tests/e2e/admin.spec.ts --reporter=line 2>&1 | tail -5`
Expected: FAIL. `#/media` and `#/inbox/…` redirect to the default screen, so the tiles and entries are never found.

- [ ] **Step 3: Create `src/scripts/admin/inbox-view.ts`**

```ts
import { api, ApiError } from './api';
import { h, toast, formatPhone } from './dom';
import type { Schema } from './fields';

type Entry = { id: number; created_at: string; status: string; notes: string; faq_id?: number | null; [field: string]: unknown };
const STATUSES: [string, string][] = [['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']];
const statusLabel = (value: string) => STATUSES.find(([v]) => v === value)?.[1] ?? value;
const labelled = (id: string, label: string, control: HTMLElement) => h('div', { class: 'field' }, h('label', { for: id }, label), control);

// Visitor text is only ever added as text nodes (see h()); links are built only from checked formats.
function valueView(name: string, value: unknown): Node | string {
  const text = String(value ?? '');
  if (!text) return '—';
  if (name === 'phone') return h('a', { href: `tel:${text}` }, formatPhone(text));
  if (name === 'email') return h('a', { href: `mailto:${text}` }, text);
  if (name === 'cv_url' && /^https?:\/\//i.test(text)) return h('a', { href: text, target: '_blank', rel: 'noopener noreferrer' }, text);
  return text;
}

/** One inbox, newest first: filter by status, add notes, delete, export, and publish answers to the FAQ. */
export async function inboxView(main: HTMLElement, kind: string, schema: Schema, onChange: () => void) {
  const inbox = schema.inboxes[kind];
  let entries = (await api<{ items: Entry[] }>(`inbox/${kind}`)).items;
  const topics = kind === 'ask' ? [...new Set((await api<{ items: { category: string }[] }>('content/faqs')).items.map(f => f.category))] : [];
  let filter = 'all';

  const publishForm = (entry: Entry) => {
    if (entry.faq_id) return h('p', { class: 'hint' }, 'Published to the FAQ. Edit it under FAQ.');
    const question = h('textarea', { id: `faq-q-${entry.id}`, rows: 2, maxlength: 200 }, String(entry.question ?? ''));
    const answer = h('textarea', { id: `faq-a-${entry.id}`, rows: 4, maxlength: 2000 }, String(entry.answer ?? ''));
    const topic = h('input', { id: `faq-t-${entry.id}`, list: 'faq-topics', maxlength: 60 });
    const error = h('p', { class: 'error', role: 'alert' });
    const publish = async () => {
      error.textContent = '';
      try {
        await api(`inbox/ask/${entry.id}/publish`, { method: 'POST', body: { category: topic.value, question: question.value, answer: answer.value } });
        entry.status = 'closed';
        entry.faq_id = 1;
        toast('Published to the FAQ.');
        onChange();
        draw();
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        error.textContent = Object.values(failure.fields)[0] ?? failure.message;
      }
    };
    return h('fieldset', {}, h('legend', {}, 'Answer and publish to the FAQ'),
      labelled(question.id, 'FAQ question', question), labelled(answer.id, 'Answer', answer), labelled(topic.id, 'FAQ topic', topic), error,
      h('div', { class: 'actions' }, h('button', { type: 'button', onclick: publish }, 'Publish to FAQ')));
  };

  const entryView = (entry: Entry) => {
    const status = h('select', { id: `status-${kind}-${entry.id}` }, ...STATUSES.map(([value, label]) => h('option', { value, selected: entry.status === value }, label)));
    const notes = h('textarea', { id: `notes-${kind}-${entry.id}`, rows: 3, maxlength: 2000 }, entry.notes);
    const badge = h('span', { class: `badge ${entry.status}` }, statusLabel(entry.status));
    const save = async () => {
      try {
        await api(`inbox/${kind}/${entry.id}`, { method: 'PUT', body: { status: status.value, notes: notes.value } });
      } catch (failure) {
        if (failure instanceof ApiError) return toast(failure.message);
        throw failure;
      }
      entry.status = status.value;
      entry.notes = notes.value;
      badge.textContent = statusLabel(entry.status);
      badge.className = `badge ${entry.status}`;
      toast('Saved.');
      onChange();
    };
    const remove = async () => {
      if (!confirm('Delete this entry for good? Do this when the person asks, or once it is no longer needed.')) return;
      await api(`inbox/${kind}/${entry.id}`, { method: 'DELETE' });
      entries = entries.filter(other => other !== entry);
      toast('Deleted.');
      onChange();
      draw();
    };
    const received = new Date(entry.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return h('details', { class: 'entry' },
      h('summary', {}, h('strong', {}, String(entry.name ?? '')), h('span', { class: 'sub' }, formatPhone(String(entry.phone ?? ''))), h('span', { class: 'sub' }, received), badge),
      h('div', { class: 'entry-body' },
        h('dl', {}, ...inbox.fields.filter(f => f.name !== 'answer').flatMap(f => [h('dt', {}, f.label), h('dd', {}, valueView(f.name, entry[f.name]))])),
        labelled(status.id, 'Status', status),
        labelled(notes.id, 'Notes', notes),
        h('div', { class: 'actions' }, h('button', { type: 'button', class: 'primary', onclick: save }, 'Save'), h('button', { type: 'button', class: 'danger', onclick: remove }, 'Delete')),
        kind === 'ask' ? publishForm(entry) : null));
  };

  const draw = () => {
    const shown = entries.filter(entry => filter === 'all' || entry.status === filter);
    const count = (value: string) => (value === 'all' ? entries.length : entries.filter(e => e.status === value).length);
    main.replaceChildren(
      h('div', { class: 'view-head' }, h('h1', {}, inbox.label), h('a', { class: 'button', href: `/api/admin/inbox/${kind}/export`, download: '' }, 'Download CSV')),
      h('div', { class: 'filters', role: 'group', 'aria-label': 'Show entries' }, ...([['all', 'All'], ...STATUSES] as [string, string][]).map(([value, label]) =>
        h('button', { type: 'button', 'aria-pressed': String(filter === value), onclick: () => { filter = value; draw(); } }, `${label} (${count(value)})`))),
      shown.length ? h('div', { class: 'entries' }, ...shown.map(entryView)) : h('p', {}, 'Nothing here.'),
      topics.length ? h('datalist', { id: 'faq-topics' }, ...topics.map(topic => h('option', { value: topic }))) : null);
  };
  draw();
}
```

- [ ] **Step 4: Create `src/scripts/admin/media-view.ts`**

```ts
import { api, ApiError } from './api';
import { h, toast } from './dom';
import { uploadMedia, type MediaItem } from './media';

/** Every uploaded photo: upload new ones, delete unused ones. */
export async function mediaView(main: HTMLElement) {
  let items = (await api<{ items: MediaItem[] }>('media')).items;
  const draw = () => {
    const file = h('input', { type: 'file', id: 'media-file', accept: 'image/jpeg,image/png,image/webp' });
    const alt = h('input', { type: 'text', id: 'media-alt', maxlength: 200 });
    const error = h('p', { class: 'error', role: 'alert' });
    const upload = async (event: Event) => {
      event.preventDefault();
      error.textContent = '';
      const chosen = file.files?.[0];
      if (!chosen) { error.textContent = 'Choose a photo first.'; return; }
      try {
        items = [await uploadMedia(chosen, alt.value), ...items];
        toast('Photo uploaded.');
        draw();
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        error.textContent = failure.message;
      }
    };
    const remove = async (item: MediaItem) => {
      if (!confirm('Delete this photo for good?')) return;
      try {
        await api(`media/${item.id}`, { method: 'DELETE' });
        items = items.filter(other => other !== item);
        toast('Photo deleted.');
        draw();
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        toast(failure.message);
      }
    };
    main.replaceChildren(
      h('div', { class: 'view-head' }, h('h1', {}, 'Media library')),
      h('form', { class: 'editor', onsubmit: upload },
        h('div', { class: 'field' }, h('label', { for: 'media-file' }, 'Photo (JPEG, PNG or WebP, up to 10 MB)'), file),
        h('div', { class: 'field' }, h('label', { for: 'media-alt' }, 'Describe the photo'), h('p', { class: 'hint' }, 'For people who cannot see it, e.g. “Students receiving awards at Talent Eve 2026”.'), alt),
        error,
        h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, 'Upload'))),
      items.length
        ? h('ul', { class: 'media-grid' }, ...items.map(item => h('li', {},
          h('img', { src: `${item.base}-480.webp`, alt: item.alt, loading: 'lazy' }),
          h('span', { class: 'sub' }, item.alt),
          h('code', {}, item.base),
          h('button', { type: 'button', class: 'danger', onclick: () => remove(item) }, 'Delete'))))
        : h('p', {}, 'No photos uploaded yet.'));
  };
  draw();
}
```

- [ ] **Step 5: Route the new screens in `src/scripts/admin/app.ts`**

1. Add the imports `import { inboxView } from './inbox-view';` and `import { mediaView } from './media-view';`.
2. Change `const DEFAULT = '#/content/timeline';` to `const DEFAULT = '#/inbox/demo';`.
3. Replace `renderNav` with:

```ts
async function renderNav() {
  if (!schema) return;
  const counts = await api<{ counts: Record<string, number> }>('inbox').then(r => r.counts, () => ({} as Record<string, number>));
  const current = location.hash || DEFAULT;
  const groups = [
    { title: 'Inbox', links: Object.entries(schema.inboxes).map(([key, inbox]) => ({ href: `#/inbox/${key}`, label: inbox.label, count: counts[key] ?? 0 })) },
    { title: 'Website content', links: Object.entries(schema.sections).map(([key, section]) => ({ href: `#/content/${key}`, label: section.label, count: 0 })) },
    { title: 'Site', links: [{ href: '#/settings', label: 'Settings', count: 0 }, { href: '#/media', label: 'Media library', count: 0 }] },
  ];
  nav.replaceChildren(h('details', { class: 'nav-menu', open: window.matchMedia('(min-width: 900px)').matches },
    h('summary', {}, 'Menu'),
    ...groups.map(group => h('section', {}, h('h2', {}, group.title), h('ul', {}, ...group.links.map(link =>
      h('li', {}, h('a', { href: link.href, 'aria-current': link.href === current ? 'page' : null }, link.label,
        link.count ? h('span', { class: 'count', 'aria-label': `${link.count} new` }, String(link.count)) : null))))))));
}
```

4. In `route()`, put the inbox and media branches first:

```ts
    if (area === 'inbox' && Object.hasOwn(schema.inboxes, key)) await inboxView(main, key, schema, () => { void renderNav(); });
    else if (area === 'content' && Object.hasOwn(schema.sections, key)) await contentView(main, key, schema);
    else if (area === 'settings') await settingsView(main, schema);
    else if (area === 'media') await mediaView(main);
    else { location.replace(DEFAULT); return; }
```

and change the `renderNav();` call after the `try` to `await renderNav();`.

- [ ] **Step 6: Run the tests**

Run: `npm run test:e2e -- tests/e2e/admin.spec.ts tests/e2e/layout.spec.ts --reporter=line 2>&1 | tail -3`
Expected: PASS on both projects.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "Add admin inboxes with CSV export and publish-to-FAQ, and the media library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Verification, staff guide and docs

**Files:**
- Create: `docs/admin-guide.md`
- Modify: `package.json` (`check` script), `README.md`, `DESIGN.md`

- [ ] **Step 1: Check every server file**

Run:
```bash
npm pkg set scripts.check='node --check server.mjs && for f in server/*.mjs sites/worker.mjs scripts/build-sites.mjs dist/app.js dist/assessment/engine.js dist/assessment/assessment.js dist/assessment/admin/admin.js; do node --check "$f" || exit 1; done'
npm run check
```
Expected: exits 0.

- [ ] **Step 2: Run everything from clean**

```bash
rm -rf build tmp/e2e-data
npm run check && npm test && npm run test:e2e
```
Expected: all PASS on both projects, including the 360px overflow check on every page in `tests/e2e/pages.ts`.

- [ ] **Step 3: Mobile Lighthouse**

```bash
npm run build && rm -rf tmp/lh-data && (PORT=3000 DATA_DIR=tmp/lh-data node server.mjs & echo $! > tmp/server.pid); sleep 3
for p in "" story results demo ask; do npx --yes lighthouse "http://localhost:3000/$p" --only-categories=performance,accessibility --output=json --output-path="tmp/lh-${p:-home}.json" --chrome-flags="--headless=new" --quiet; done
kill "$(cat tmp/server.pid)"
node -e "for (const p of ['home','story','results','demo','ask']) { const r = JSON.parse(require('fs').readFileSync('tmp/lh-'+p+'.json')); console.log(p, 'performance', Math.round(r.categories.performance.score*100), 'accessibility', Math.round(r.categories.accessibility.score*100), 'LCP', r.audits['largest-contentful-paint'].displayValue); }"
```
Expected: performance ≥ 90 and accessibility ≥ 95 on each page. If a page falls short, fix the audits Lighthouse names and ledger what changed. Afterwards, delete `tmp/lh-*`.

- [ ] **Step 4: Write `docs/admin-guide.md`**

This guide is for Smartup staff: plain words, no code.

```markdown
# Smartup website admin: a short guide

Open **/admin** on the website and sign in with the admin password. (Ask your developer for it; never send it by email or WhatsApp.)

## Enquiries (Inbox)
- **Demo bookings**, **Job applications** and **Questions** arrive here from the website forms. The number next to each shows how many are new.
- Open an entry to see the details. Tap the phone number to call.
- Set the status to **Contacted** or **Closed** and add notes, then press **Save**.
- **Download CSV** gives you a spreadsheet of every entry.
- Delete an entry when the person asks you to, or once it is no longer needed.
- For a question, you can write an answer and press **Publish to FAQ**. The question and answer then appear on the Ask Smartup page, without the person's name.

## Website content
- Each section in the menu (Timeline, Founders, Faculty, Results, Blog, FAQ, Jobs, Centres and the rest) lists its items. Open one to edit it, or press **Add new**.
- Use the **↑ ↓** buttons to change the order the website shows.
- Untick **Show on the website** to hide an item without deleting it.
- **Sample — to be replaced** puts a visible label on the item. Use it for anything that is not yet real or approved.
- Changes show on the website as soon as you save.

## Photos
- In a photo field, choose a file, describe what the photo shows, and press **Upload**, or pick one you uploaded before.
- Photos can be JPEG, PNG or WebP, up to 10 MB. The website makes smaller copies for phones automatically.
- **Media library** lists every uploaded photo. A photo still in use cannot be deleted; remove it from the item first.

## Settings
- Phone numbers, email, centre hours, social media links, app links and the homepage headline.
- **WhatsApp number**: leave it empty to hide every WhatsApp button; the website shows the phone number instead.

## Blog posts
- Write in the Article box. A preview appears below it.
- Use `##` at the start of a line for a heading, `-` for a list, `**bold**` and `*italic*`, and `[link text](https://…)` for a link.
- The **Web address** becomes the post's link, for example `board-exam-tips` gives `/blog/board-exam-tips`.
```

- [ ] **Step 5: Update `README.md` and `DESIGN.md`**

In `README.md`, add a section after "Preview":

```markdown
## Admin
Open `/admin` and sign in with `ADMIN_PASSWORD` (locally it is in `.env`, created by `npm run setup`). Staff edit every content section, the site settings and photos, and handle demo bookings, job applications and questions, with CSV export. Uploaded photos are stored in `DATA_DIR/uploads`, which must be on the persistent volume. Staff guide: [docs/admin-guide.md](docs/admin-guide.md).
```

In `DESIGN.md`, append this to the v2 section:

"Phase 3 adds the admin panel at `/admin`: a plain, system-font interface, generated from one schema so every section edits the same way. It also turns the Demo, Careers and Ask pages into forms that work without JavaScript, adds the privacy page, sitemap and structured data, and sets NOINDEX for preview deployments."

Add the Lighthouse scores from Step 3 to that sentence.

- [ ] **Step 6: Commit**

```bash
git add package.json docs/admin-guide.md README.md DESIGN.md
git commit -m "Add the staff admin guide and document Phase 3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Hand off**

Report in plain language:
- what staff can now do;
- the Lighthouse scores;
- what the client still needs to approve: the privacy text, the three starter blog posts (marked Sample), the FAQ answers, faculty roles and photos, the result transcriptions, and the class range;
- that Phase 4 (the preview deploy) is next.

Do not deploy.
