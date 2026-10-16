# Railway deployment

The marketing website and Smartup Quest are deployed together at **https://smartup-web-production.up.railway.app**. Administration is at [/assessment/admin/](https://smartup-web-production.up.railway.app/assessment/admin/); the student challenge is at [/assessment/](https://smartup-web-production.up.railway.app/assessment/).

## Deployment record

| Item | Value |
| --- | --- |
| Deployed | 22 September 2026 |
| Workspace | tja1989's Projects |
| Project | `2e278d8d-41ba-4dd4-a21e-5cd3a47ab81d` |
| Environment | `production` — `189f0696-d13d-4d82-a448-468c54de72d4` |
| Service | `smartup-web` — `2da448a9-e82a-42e7-a377-39d39a4bdf3d` |
| Deployment | `a30bc1b2-68ac-4427-bb58-a1d5ecf05989` |
| Source commit | `fb71bed6204d0cdb1f063657d9a44cbcc9a153eb` |
| Volume | `6039a06e-3007-4bc5-83ea-23a452fe8f26`, mounted at `/data` |
| Volume instance | `156fe3d8-37fc-46e9-a50d-719a096320a9` |
| Region | `us-west2` |
| Replicas | `1` |
| Delivery | Manual CLI upload of a clean committed release; no GitHub autodeploy configured |

The initial deployment reached `SUCCESS`. A synthetic assessment, an actual service restart, saved-result recovery and browser access/privacy checks passed. The database survived the restart. The homepage, diagnostic welcome and details screen rendered correctly in the browser with no console errors. The synthetic run was subsequently deleted and its absence confirmed in administration. This does not constitute a backup-restore test.

## Runtime and secrets

The Dockerfile runs the marketing files and assessment API in one Node 24 process, listening on `0.0.0.0:3000`. Production variables are:

| Variable | Setting |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATA_DIR` | `/data` |
| `PORT` | `3000` |
| `TRUST_PROXY_HOPS` | `0` |
| `ADMIN_PASSWORD` | Unique private secret, at least 16 characters |

The admin secret is stored in Railway variables and the local, ignored `.env.railway` file. Never commit that file or put the password in documentation, deployment messages or browser assets. The production server refuses to start without a valid admin password.

`TRUST_PROXY_HOPS=0` deliberately ignores forwarded IP headers until the ingress chain is verified. Visitors sharing the same proxy may share start/login rate limits. Change the hop count only after verifying the chain and ensuring direct untrusted traffic cannot reach the service.

The persisted service settings use the Dockerfile builder, `/health` health check, and `ON_FAILURE` restart policy with three retries. These are configured directly on the service as well as recorded in `railway.json`. Railway CLI 5.49.6 reported config-as-code deprecation with a 1 December 2026 deadline; future deployments should verify the persisted service settings rather than rely solely on the JSON file.

## Deploy an update

> **For the live v1 site only.** These steps deploy the pre-v2 release (`main`, commit `fb71bed`) to `smartup-web`. On branch `v2-website` the Dockerfile builds the Astro site and needs more files, so this file list fails there. To deploy v2, use the "v2 client preview" section below, and never point v2 at `smartup-web` until the client approves the switch.

Use Node 24 or newer. Run `npm run check`, `npm test` and `npm run build`, review the changes, and commit the intended runtime files before staging. The Dockerfile copies the committed `dist` assets; it does not run an asset build or install npm dependencies during deployment.

From the repository root, create a new, empty release directory under ignored `tmp/` and extract only the runtime files:

```sh
release_dir="tmp/railway-release-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
mkdir -p "$release_dir"
git archive HEAD Dockerfile railway.json .dockerignore package.json server.mjs server data-seed dist | tar -x -C "$release_dir"
cd "$release_dir"
railway up \
  --project 2e278d8d-41ba-4dd4-a21e-5cd3a47ab81d \
  --environment 189f0696-d13d-4d82-a448-468c54de72d4 \
  --service 2da448a9-e82a-42e7-a377-39d39a4bdf3d \
  --detach --json \
  --message 'Smartup client preview with learning assessment'
```

This explicit-target upload was verified with `/opt/homebrew/bin/railway` version `5.49.6`, running from the clean release directory. It needs no `--path-as-root`. Scoped OAuth authorization works for these project/environment/service IDs. `railway whoami` and `railway link` query all workspaces and can fail under the same scoped authorization; that failure alone does not mean access to this deployment is unavailable. Do not create a replacement project or service to work around it.

`--detach` returns before health is established. Wait for the new deployment to report `SUCCESS`, check `/health`, and verify the homepage, assessment, mobile layout and admin login over HTTPS. Confirm an existing synthetic assessment still resumes after deployment. Record the new deployment ID and source commit here after successful verification.

## Persistence and backups

SQLite data lives at `/data/smartup.sqlite`, with its WAL sidecars on the same persistent volume. Keep the existing service and volume for updates. Do not detach, delete or recreate the volume during a code redeploy. Keep one replica and one Node process; moving to multiple replicas requires a different database/concurrency design.

**Backup schedule: daily, with six-day retention (`518400` seconds).** The configured `DAILY` schedule was verified through Railway's `volumeInstanceBackupScheduleList` query for the volume instance above on 22 September 2026. The first scheduled backup was not yet due at verification; no restore drill has been performed. Confirm that the first backup completes and test restoring a copy before treating recovery as verified.

Question-bank JSON and student-results CSV exports are useful supplementary copies, but cannot restore browser credentials, active attempts or admin sessions. Use a consistent database/volume backup when a complete restore is required; copying only a live SQLite database file can omit WAL data.

The initial bank seeds an empty database once. Later code deployments preserve live question edits and saved results. Use the [assessment administration guide](assessment.md) to edit/import questions and export results.

## Relationship to the Sites review

The existing `chatgpt.site` review and this Railway service use separate databases. Railway began with the committed draft question bank; Sites review attempts were not automatically migrated. Export/import an approved question bank through administration if it differs from the seed. Retain any required Sites results CSV as a staff archive, or plan a separate full migration.

Student access is restricted to the original browser. A phone number alone cannot retrieve saved results. Clearing cookies or moving between the Sites and Railway domains does not transfer access; the student must contact the team. One attempt per phone number per subject applies within each deployment's database.

## v2 client preview (smartup-v2-preview)

A separate service in the same project runs the v2 website for client review. The `smartup-web` service above, its volume and its variables are untouched.

| Item | Value |
| --- | --- |
| Address | [smartup-v2-preview-production.up.railway.app](https://smartup-v2-preview-production.up.railway.app) (admin at `/admin`) |
| Deployed | 13 October 2026; updated 14–16 October 2026 (audit fixes, admin sections, app screenshots and app promotion) |
| Service | `smartup-v2-preview` — `59675c15-342b-4e37-a977-fbcfd5460dc9` |
| Environment | `production` — `189f0696-d13d-4d82-a448-468c54de72d4` |
| Volume | `smartup-v2-preview-volume` — `f1b80719-549d-491c-b7b0-d48fd5dbbf79`, mounted at `/data` (database and `uploads/`) |
| Deployments | `23bcfd2a-61df-4659-9b56-2eabf49d2273` (first), `e56dd0f4-f6eb-4e35-848e-c465e8035613` (redeploy that proved the volume keeps data), `680abf01-d815-43b6-bfcd-814403843540`, `f67ce07a-34a1-4a5f-9576-f0b9d0ee5a94`, `f966fe7f-c581-4781-b0ad-d2c21247fb68`, `2f3e3de2-c50e-47a3-94fa-222696577640`, `6aab1465-724c-4334-a8e8-5a8538fd6f73`, `44b100aa-d3ba-4968-9109-446255e69d82` (current) |
| Source commit | `017772c` (branch `v2-website`) |
| Variables | `NODE_ENV`, `DATA_DIR`, `PORT`, `TRUST_PROXY_HOPS`, `NOINDEX`, `SITE_URL`, `ADMIN_PASSWORD` |

The admin password is in the git-ignored `.env.railway-preview` and in Railway; share it privately. `NOINDEX=1` keeps the preview out of search engines; remove it only when v2 becomes the main site. `SITE_URL` makes canonical links and the sitemap use the https address.

The image is two-stage (`Dockerfile`): a Debian build stage runs `astro build`; the Alpine runtime installs production dependencies only. Every package the built site imports must be a top-level production dependency; `tests/repo.test.mjs` checks this.

To redeploy after new commits, from the repository root with a clean tree:

```sh
release_dir="tmp/railway-preview-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
mkdir -p "$release_dir"
git archive HEAD Dockerfile .dockerignore railway.json package.json package-lock.json astro.config.mjs server.mjs server data-seed dist src public | tar -x -C "$release_dir"
cd "$release_dir"
railway up --project 2e278d8d-41ba-4dd4-a21e-5cd3a47ab81d --environment 189f0696-d13d-4d82-a448-468c54de72d4 --service 59675c15-342b-4e37-a977-fbcfd5460dc9 --detach --message 'Smartup v2 client preview'
```

Then wait for `/health` to answer `ok` (it only does once the pages can load) and check the pages and admin sign-in over HTTPS.

The upload is about 70 MB (seed photos and videos). If `railway up` fails with "connection reset", run it again from the same release directory. If `railway whoami` shows a different account, run `railway login` (it opens the browser) and sign in as the account that owns the Smartup project.
