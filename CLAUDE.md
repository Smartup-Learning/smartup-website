# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marketing website for Smartup (tuition, classes 8–12, Kochi) plus **Smartup Quest**, a gamified diagnostic quiz at `/assessment/`. One Node 24 process serves everything, with SQLite on a persistent volume, deployed to Railway. No student accounts, payments or LMS — the student app is separate.

Active work is the **v2 site on branch `v2-website`** (unmerged; `main` is the live v1). Spec: `docs/superpowers/specs/2026-10-08-smartup-v2-website-design.md`; phase plans in `docs/superpowers/plans/`. Brand and layout rules: `DESIGN.md`. Audience and content constraints: `PRODUCT.md`.

## Commands

Node 24 is required (built-in `node:sqlite`). The Mac's default `node` is v20 — run `nvm use 24` first.

```sh
npm ci && npm run setup        # setup writes .env with a random ADMIN_PASSWORD (only if .env is missing)
npm run build && npm start     # http://localhost:3000, admin at /admin
npm run dev                    # astro dev with live reload; reads data/smartup.sqlite directly
npm run check                  # node --check on server and Quest JS files
npm test                       # pretest runs astro build + build-sites, then node --test tests/*.test.mjs
npm run test:e2e               # astro build, then Playwright on 'mobile' (Pixel 7) and 'desktop' projects
```

Single tests (build first, because page/server tests load `build/server/entry.mjs`):

```sh
npx astro build
node --test tests/pages.test.mjs
node --test --test-name-pattern="phone" tests/content-store.test.mjs
npx playwright test tests/e2e/home.spec.ts --project=mobile
```

Playwright starts its own server on port 4173 with a fresh `tmp/e2e-data`. `server.mjs` caches the loaded Astro build, so restart any running server after rebuilding.

Other scripts: `npm run media` (re-fetch/re-encode seed media from `data-seed/media-sources.json` into `public/seed/`), `npm run fonts` (Rubik subsets; needs `pip install fonttools brotli`), `npm run content:reset` (local only: clears content tables so the seed re-applies on next start).

## Architecture

**Request routing (`server.mjs`)** — a plain `http` server, in this order:
1. `/api/*` → `server/assessment.mjs` `createAssessmentHandler`, which handles Quest and admin-login routes itself and delegates `/api/forms/*` to `server/forms.mjs` and other `/api/admin/*` to `server/admin-routes.mjs`. Non-form API requests must send header `X-Smartup-Request: 1` (forms are exempt so they work as plain HTML posts).
2. `/health` → 200 only once the Astro build loads (Railway health check).
3. `/media/*` → staff uploads from `DATA_DIR/uploads`.
4. `/assessment*` and `/assets/*` → static files from **`dist/`** (the hand-written v1 site and Quest).
5. Everything else → static files from `build/client`, then Astro SSR (`build/server/entry.mjs`, node adapter in middleware mode). The shared `ContentStore` is passed to pages as `locals.store`.

**Two different output folders — easy to confuse:**
- `build/` — Astro's output (git-ignored). `astro.config.mjs` uses `outDir: ./build`.
- `dist/` — **committed source**, not a build output: the v1 one-pager (`dist/index.html`, `app.js`, `styles.css`) and Quest (`dist/assessment/`). Only `dist/client`, `dist/server` and `dist/.openai` are generated (by `scripts/build-sites.mjs`, for a separate legacy "Sites" review deploy via `sites/worker.mjs` + `.openai/`; that path does not affect Railway). `npm run build:assets` bundles `src/assessment/*.js` into `dist/assessment/`.

**Content (v2 site)** — all page content lives in SQLite, not in the Astro files.
- `server/content-store.mjs` defines the tables. `applySeed()` copies each section from `data-seed/content.json` **once per database** (tracked in `seed_log`); editing the seed later does not change existing databases. Settings keys are added individually, so new keys do reach old databases.
- To change existing data in deployed databases, add a one-time entry to `CORRECTIONS` (recorded as `fix:<name>`). To add a column, append to `ADDED_COLUMNS` (applied by `ALTER TABLE` on start).
- Pages get the store via `getStore(Astro.locals)` (`src/lib/store.ts`); under `astro dev` it opens `DATA_DIR` directly.
- Quest's question bank seeds once from `data-seed/questions.json` in the same way; live edits happen in the Quest admin at `/assessment/admin/`.

**Admin (`/admin`)** — schema-driven. `server/admin-schema.mjs` `SECTIONS` lists every editable section (table, field types, validation). `server/admin-content.mjs` does the generic CRUD and `src/scripts/admin/*` renders the forms from that schema. To make a new content type editable: add its table/seed in `content-store.mjs`, then a `SECTIONS` entry in `admin-schema.mjs`. Inbox (demo bookings, job applications, questions) is `server/inbox.mjs`; uploads are `server/media-library.mjs`. Don't name a new table `questions` — Quest uses it.

**Frontend** — `src/pages/*.astro` (SSR), components in `src/components/`, small vanilla TS behaviours in `src/scripts/` (carousels/`rails`, tabs, filters, lightbox, click-to-load YouTube, Motion animations). Tokens in `src/styles/tokens.css`. Rules that tests and reviews rely on: every page works without JavaScript (JS only enhances), motion respects reduced-motion and never hides content, YouTube loads only on tap from youtube-nocookie.com, and sample/placeholder content shows a visible "sample" label (`is_sample`).

**Tests** — `tests/*.test.mjs` use `node:test`; `tests/helpers/site.mjs` `startSite(t)` boots the full server with an in-memory DB, temp uploads folder and a synthetic admin password, and gives `call()`, `signIn()` and `page()` helpers. `tests/repo.test.mjs` guards the Dockerfile, `.gitignore` and that every package imported by the built site is a top-level **production** dependency — move a package to `dependencies` if the build starts importing it.

## Deployment

See `docs/railway.md`. Deploys are manual `railway up` from a clean `git archive` release folder under `tmp/` (no autodeploy). The v2 preview is its own service, `smartup-v2-preview` (env `NOINDEX=1`, `SITE_URL`); never point v2 at the live `smartup-web` service until the client approves. Keep one replica (SQLite). Secrets live only in the git-ignored `.env`, `.env.railway` and `.env.railway-preview`.

Note: the README's "Content and assets" section describes the v1 `dist/` site, not v2. `tmp/` is ignored scratch space. `AGENTS.md` is an auto-generated memory stub, not project instructions.
