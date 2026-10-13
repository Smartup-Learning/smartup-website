# Smartup v2 — Phase 4: Preview Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the finished v2 website on its own Railway link so the client can review every page and the admin panel, without touching the current site.

**Architecture:**
- **Image.** A two-stage Docker image. A Debian build stage installs every dependency and runs `astro build`. An Alpine runtime stage holds only production dependencies, the server, the legacy Quest files (`dist/`) and the built site (`build/`).
- **Service.** A new Railway service, `smartup-v2-preview`, in the existing Smartup project. It gets its own `/data` volume (database and uploaded photos), its own admin password and a generated `railway.app` address.
- **Search engines.** `NOINDEX=1` keeps the preview out of search results.

**Tech Stack:** Docker (node:24-slim build, node:24-alpine runtime), Railway CLI 5.66, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-08-smartup-v2-website-design.md`, Deployment section. The spec says "same service". The user decided on 13 Oct 2026 to use **a new separate link**, so the current site and Smartup Quest stay exactly as they are.

## Global Constraints

- Never change the existing `smartup-web` service (`2da448a9-e82a-42e7-a377-39d39a4bdf3d`), its volume or its variables.
- Never print, commit or document the admin password. It lives only in Railway and in the git-ignored `.env.railway-preview` (covered by the `.env.*` rule).
- Deploy only from a clean, committed tree, through a release directory under `tmp/`.
- Run one replica only, because the database is SQLite.
- If the Railway CLI cannot reach the Smartup project, stop and ask the user. (On 13 Oct the CLI was signed in to a different account, "Kaicho".) Also stop and ask before any command whose target is unclear.
- Commit only on `v2-website`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A redeploy.** The database and uploaded photos must survive, because both live on the `/data` volume.
2. **Search engines.** The preview must be hidden: `robots.txt` disallows everything and pages carry `noindex`.
3. **Admin over HTTPS behind Railway's proxy.** Secure cookies must work, and canonical links must use the https address from `SITE_URL`.
4. **Photo upload in production.** It needs sharp's Linux (musl) binary inside the Alpine image.
5. **The old site.** `https://smartup-web-production.up.railway.app` must still answer, unchanged.

---

### Task 1: Production Docker image

**Files:**
- Modify: `Dockerfile`, `.dockerignore`, `tests/repo.test.mjs`

- [ ] **Step 1: Write the failing test**

In `tests/repo.test.mjs`, add `import { readFileSync } from 'node:fs';` and append:

```js
test('the production image builds the Astro site and ships only runtime dependencies', () => {
  const docker = readFileSync('Dockerfile', 'utf8');
  assert.match(docker, /^FROM node:24-slim AS build$/m);
  assert.match(docker, /^RUN npx astro build$/m);
  assert.match(docker, /^FROM node:24-alpine$/m);
  assert.match(docker, /npm ci --omit=dev/);
  assert.match(docker, /^COPY --from=build \/app\/build \.\/build$/m);
  const { dependencies } = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const name of ['astro', '@astrojs/node', 'compression', 'sharp']) assert.ok(dependencies[name], `${name} is a runtime dependency`);
  const ignore = readFileSync('.dockerignore', 'utf8').split('\n');
  for (const entry of ['content-source', 'build', 'tests']) assert.ok(ignore.includes(entry), `.dockerignore lists ${entry}`);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: FAIL, because the current Dockerfile is single-stage.

- [ ] **Step 3: Replace `Dockerfile`**

```dockerfile
# Build stage: Debian, so every dev dependency (including miniflare's workerd) installs.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY astro.config.mjs ./
COPY src ./src
COPY public ./public
COPY server ./server
COPY data-seed ./data-seed
RUN npx astro build

# Runtime: production dependencies, the server, Quest's files and the built site.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.mjs ./
COPY server ./server
COPY data-seed ./data-seed
COPY dist ./dist
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["node", "server.mjs"]
```

- [ ] **Step 4: Add the new local-only folders to `.dockerignore`**

Append these lines:

```
content-source
build
tests
test-results
playwright-report
.astro
.superpowers
```

- [ ] **Step 5: Run the tests**

Run: `npm test 2>&1 | grep -E "^✖|ℹ (pass|fail)"`
Expected: PASS.

- [ ] **Step 6: Build and smoke-test the image locally**

Run `docker info >/dev/null 2>&1 && echo running`. If Docker is not running, start it with `open -a Docker` and wait for `docker info` to succeed, for up to 3 minutes. If it still will not start, ledger `Ruling: local image check skipped (Docker unavailable); the Railway build log is the check` and go to Step 7.

```bash
docker build -t smartup-v2-preview .
node -e "process.stdout.write(require('crypto').randomBytes(24).toString('base64url'))" > tmp/check-password && chmod 600 tmp/check-password
docker run -d --rm --name smartup-v2-check -p 3100:3000 -e ADMIN_PASSWORD="$(cat tmp/check-password)" -e NOINDEX=1 smartup-v2-preview
```

Then wait until `curl -fsS http://localhost:3100/health` prints `ok`, and run:

```bash
for p in / /story /demo /admin /assessment/ /privacy; do printf '%s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3100$p")"; done
curl -s http://localhost:3100/robots.txt
```

Expected: every path returns `200`, and `robots.txt` is `User-agent: *` followed by `Disallow: /`.

Check that uploads work inside the image (sharp on Alpine). Create `tmp/check-upload.mjs`:

```js
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const base = process.argv[2];
const password = readFileSync('tmp/check-password', 'utf8');
const headers = { 'X-Smartup-Request': '1' };
const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
if (!login.ok) throw new Error(`login ${login.status}`);
const cookie = login.headers.get('set-cookie').split(';')[0];
const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#5f2ea8' } }).png().toBuffer();
const upload = await fetch(`${base}/api/admin/media?alt=Deploy%20check`, { method: 'POST', headers: { ...headers, Cookie: cookie, 'Content-Type': 'image/png' }, body: png });
const item = await upload.json();
if (upload.status !== 201) throw new Error(`upload ${upload.status} ${item.error}`);
const file = await fetch(`${base}${item.base}-480.webp`);
const removed = await fetch(`${base}/api/admin/media/${item.id}`, { method: 'DELETE', headers: { ...headers, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
console.log('upload', upload.status, 'variant', file.status, file.headers.get('content-type'), 'delete', removed.status);
```

Run: `node tmp/check-upload.mjs http://localhost:3100`
Expected: `upload 201 variant 200 image/webp delete 200`.

Then clean up: `docker stop smartup-v2-check && rm tmp/check-password`.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile .dockerignore tests/repo.test.mjs
git commit -m "Build the Astro site in a two-stage Docker image with runtime-only dependencies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The Railway preview service

**Files:**
- Create: `.env.railway-preview` (git-ignored; never committed)
- Modify: `docs/railway.md`

- [ ] **Step 1: Confirm the CLI can reach the Smartup project**

```bash
mkdir -p tmp/railway-preview-link && cd tmp/railway-preview-link
railway link --project 2e278d8d-41ba-4dd4-a21e-5cd3a47ab81d --environment 189f0696-d13d-4d82-a448-468c54de72d4
railway status
```

Expected: the status names the Smartup project and the `production` environment.

**If this fails** (for example, the project is not found or not authorised), stop here. Ask the user to run `railway login` in their own terminal with the account that owns the Smartup project ("tja1989's Projects"), then retry this step. Do not create a project anywhere else.

- [ ] **Step 2: Create the service and its volume**

Run each `--help` first and adjust flags to what it prints. Stay in the linked folder:

```bash
railway add --service smartup-v2-preview
railway service smartup-v2-preview
railway volume add --mount-path /data
railway volume list
```

Expected: a new service `smartup-v2-preview` with one volume mounted at `/data`. The list still shows the old service's volume attached to `smartup-web`; leave it alone.

- [ ] **Step 3: Set a new admin password and the variables, without printing them**

From the repo root:

```bash
node -e "require('fs').writeFileSync('.env.railway-preview', 'ADMIN_PASSWORD=' + require('crypto').randomBytes(24).toString('base64url') + '\n', { mode: 0o600 })"
git check-ignore -q .env.railway-preview && echo ignored
```

Expected: `ignored`.

Then, from `tmp/railway-preview-link`:

```bash
railway variables --service smartup-v2-preview --skip-deploys \
  --set NODE_ENV=production --set DATA_DIR=/data --set PORT=3000 --set TRUST_PROXY_HOPS=0 --set NOINDEX=1 \
  --set "ADMIN_PASSWORD=$(sed -n 's/^ADMIN_PASSWORD=//p' ../../.env.railway-preview)" > /dev/null && echo set
railway variables --service smartup-v2-preview --kv | cut -d= -f1 | sort
```

Expected: `set`, then the variable names only (`ADMIN_PASSWORD DATA_DIR NODE_ENV NOINDEX PORT TRUST_PROXY_HOPS`, plus Railway's own `RAILWAY_*` names).

- [ ] **Step 4: Give it a public address**

```bash
railway domain --service smartup-v2-preview
```

Note the printed `https://…up.railway.app` address. Set it so canonical links and the sitemap use it:

```bash
railway variables --service smartup-v2-preview --skip-deploys --set "SITE_URL=https://<the address from above>" > /dev/null && echo set
```

- [ ] **Step 5: Deploy from a clean release directory**

From the repo root, with a clean working tree (`git status --short` shows nothing except untracked `AGENTS.md`):

```bash
release_dir="tmp/railway-preview-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
mkdir -p "$release_dir"
git archive HEAD Dockerfile .dockerignore railway.json package.json package-lock.json astro.config.mjs server.mjs server data-seed dist src public | tar -x -C "$release_dir"
cd "$release_dir"
railway up --project 2e278d8d-41ba-4dd4-a21e-5cd3a47ab81d --environment 189f0696-d13d-4d82-a448-468c54de72d4 --service smartup-v2-preview --detach --message "Smartup v2 client preview"
```

Then poll `curl -fsS https://<address>/health` until it prints `ok`, for up to 15 minutes. Use a Monitor with an until-loop; the first Docker build is slow. If it does not come up, read `railway logs --service smartup-v2-preview` (build and deploy logs), fix the cause, commit, and redeploy.

- [ ] **Step 6: Verify the live preview**

```bash
A=https://<address>
for p in / /story /founders /faculty /results /life /videos /testimonials /alumni /courses /blog /ask /app /community /demo /careers /contact /privacy /admin /assessment/ /sitemap.xml; do printf '%s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$A$p")"; done
curl -s "$A/robots.txt"
curl -s "$A/" | grep -o '<link rel="canonical" href="[^"]*"'
curl -s "$A/" | grep -c 'name="robots" content="noindex'
```

Expected:
- every path returns `200`;
- `robots.txt` disallows everything;
- the canonical link uses the https address;
- the noindex count is `1`.

Check admin sign-in and photo upload in production. Copy the password for the check script without printing it:

```bash
sed -n 's/^ADMIN_PASSWORD=//p' .env.railway-preview | tr -d '\n' > tmp/check-password && chmod 600 tmp/check-password
node tmp/check-upload.mjs "$A" && rm tmp/check-password
```

Expected: `upload 201 variant 200 image/webp delete 200`.

Check that forms reach the inbox, then remove the test entry:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$A/api/forms/demo" -H 'Content-Type: application/json' -d '{"name":"Deploy check","phone":"9895085731","grade":"9","board":"CBSE","mode":"Online"}'
```

Expected: `201`. Then sign in at `$A/admin`, open Demo bookings, and delete the "Deploy check" entry (use the Browser tools, or a script like `check-upload.mjs` that lists `/api/admin/inbox/demo` and deletes the matching id).

Confirm the old site is untouched: `curl -fsS https://smartup-web-production.up.railway.app/health` prints `ok`.

- [ ] **Step 7: Look at it on a phone**

Take 390px-wide screenshots of the live `/`, `/demo` and `/admin` (signed out) with Playwright, read them, and check that photos load and nothing overflows. Then run Lighthouse mobile on the live home page. Expected: performance ≥ 90 and accessibility ≥ 95. Live numbers can be a little lower than local ones; ledger them either way.

- [ ] **Step 8: Record the deployment in `docs/railway.md`**

Append a section `## v2 client preview (smartup-v2-preview)` with:
- the service name and ID;
- the address;
- the volume ID and mount;
- the variable names (never values), the deployment ID and the source commit;
- this sentence: "The admin password is in the git-ignored `.env.railway-preview` and in Railway; share it privately".
- how to redeploy: the release-directory commands from Step 5;
- this note: "`NOINDEX=1` keeps the preview out of search engines; remove it only when v2 becomes the main site."

```bash
git add docs/railway.md
git commit -m "Record the v2 client preview deployment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hand-off to the client

- [ ] **Step 1: Write the client message**

Give the user a short WhatsApp message to send. Audience: the Smartup owner, who is not technical. It should cover:
- the preview link, and that it is a private preview, not yet public on Google;
- what to look at: every page in the menu, on a phone;
- that the forms work and arrive in the admin panel, so they can try booking a demo;
- the admin address (`<address>/admin`), and that the user will share the password separately;
- the approval list: the privacy text, the three sample blog posts, the FAQ answers, faculty roles and photos, the result transcriptions, and the class range "8 to +2" vs "Grades 1–12";
- the still-open items: the WhatsApp number, alumni stories and the Google Reviews link.

- [ ] **Step 2: Tell the user**

Tell the user, briefly:
- the link;
- that the password is in `.env.railway-preview` (open the file to copy it), and to send it privately, never in the same message as the link;
- that the old site is unchanged.
