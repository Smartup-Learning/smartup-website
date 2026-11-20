# Migration Plan: Convert Smartup Website to Cloudflare (Option B)

> **Status:** Completed & Verified  
> **Goal:** Transform the Node.js/SQLite/Railway architecture into a native Cloudflare stack (Astro + Cloudflare Workers adapter + Cloudflare D1 + Cloudflare R2).

---

## Architecture Comparison

| Component | Current (Railway / Node.js 24) | Target (Cloudflare Option B) | Status |
| :--- | :--- | :--- | :--- |
| **Runtime** | Long-running Node 24 process (`server.mjs`) | Cloudflare Worker / V8 Edge Isolate | Completed |
| **Astro Adapter** | `@astrojs/node` (middleware mode) | `@astrojs/cloudflare` (SSR mode) | Completed |
| **Database** | `node:sqlite` (`data/smartup.sqlite`) | **Cloudflare D1** (`env.DB`) | Completed |
| **File Storage** | Local disk volume (`/data/uploads`) | **Cloudflare R2** (`env.MEDIA`) | Completed |
| **Image Processing** | `sharp` (native C++ binary) | Cloudflare R2 + Pure TS Header Parser | Completed |
| **Routing** | Node HTTP server mounts `/api`, `/media`, Astro | Astro SSR + Astro API endpoints (`/api/[...path]`) | Completed |
| **Dev Environment** | Local SQLite file via `openContentStore()` | Miniflare local D1 & R2 via Astro `platformProxy` | Completed |

---

## Action Items Checklist

### Phase 1: Adapter & Dependencies
- [x] Upgrade `astro` to `^7.4.0` in `package.json` to satisfy peer dependencies.
- [x] Install `@astrojs/cloudflare` and `wrangler`.
- [x] Update `astro.config.mjs` to use `cloudflare()` with `platformProxy: { enabled: true }`.
- [x] Create `wrangler.json` configuring Worker name, D1 binding (`DB`), R2 binding (`MEDIA`), and Node.js compatibility flags.

### Phase 2: D1 Database Migration
- [x] Consolidate full database schema into D1 SQL migrations (`migrations/0001_initial_schema.sql`).
- [x] Implement `src/lib/d1-store.ts` for D1 database integration with in-memory edge caching and automatic seeding fallback.
- [x] Implement Astro middleware (`src/middleware.ts`) to inject `locals.store` and `locals.origin`.

### Phase 3: Media Storage & Uploads (R2)
- [x] Implement pure-TS image dimensions parser (`src/lib/image-size.ts`) removing `sharp` dependency in V8 isolates.
- [x] Implement image serving route (`src/pages/media/[...file].ts`) reading from R2 bucket (`env.MEDIA`) with immutable cache headers.

### Phase 4: API & Routing Unification
- [x] Implement `/api/[...path].ts` handling Smartup Quest, Public Forms (Demo, Careers, Ask), and Admin CRUD/Media endpoints.
- [x] Add `/health` endpoint (`src/pages/health.ts`) returning 200 OK.
- [x] Move Quest assets to `public/assessment/` so Cloudflare Workers Assets serves them directly at edge.

### Phase 5: Verification & Testing
- [x] Verified full build with `npm run build` (`build:assets` + `astro build`).
- [x] Verified unit tests (`tests/d1-store.test.mjs`, `tests/content-store.test.mjs`, `tests/admin-schema.test.mjs`, `tests/markdown.test.mjs`, `tests/text.test.mjs`).
- [x] Confirmed zero impact on protected Frappe backend systems.
