# Smartup Quest — editing and operating guide

The website now includes `/assessment/`, a diagnostic learning challenge for Classes 5–10, and `/assessment/admin/`, a password-protected workspace for questions and student results. The LMS remains separate.

## Open the local review

The current preview runs at `http://localhost:3001/assessment/`. Administration is at `http://localhost:3001/assessment/admin/`.

Use the `ADMIN_PASSWORD` value in the local `.env` file to sign in. This credential is private, ignored by Git, and not embedded in the website. A different production password must be configured when deploying.

To start the website yourself with Node 24 or newer:

```sh
npm ci
npm run setup
npm start
```

`setup` creates a random local admin password only if `.env` does not exist. It preserves existing settings. The normal address is `http://localhost:3000`; use `PORT=3001 npm start` for the current review address. Node 24 is required for built-in SQLite. On this Mac a compatible runtime is also available at `/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.

## Edit questions without coding

1. Open administration and sign in.
2. Choose **Question bank**, then a subject and level.
3. Select a question and edit the prompt, four options, correct answer and explanation. Click **Save question**.
4. Use **Add question** to grow a bucket. Delete removes a question only if the bank remains valid.
5. Use **Export JSON** for a portable copy. **Import JSON** validates the full bank, asks you to confirm replacement, and downloads the previous bank first. Keep that downloaded backup.

Edits are saved immediately in the server database and used by new journeys. Students already playing retain a snapshot of their original questions. A stale editor cannot overwrite changes made in another session; reload if a conflict is reported.

Every subject/level bucket needs at least **9 questions**: a student can answer four incorrectly and five correctly before advancing. The supplied draft has **10 per bucket — 280 in total**. Prompts cannot repeat within a subject; each question needs four distinct choices and one answer index.

The initial bank is `data-seed/questions.json`. It seeds an empty database once. Editing that seed file after launch does **not** overwrite the live bank; use the admin editor or import the updated JSON.

A question looks like:

```json
{
  "id": "math-foundation-example",
  "subject": "mathematics",
  "level": "foundation",
  "topic": "Addition",
  "prompt": "What is 7 + 5?",
  "options": ["12", "11", "10", "13"],
  "answer": 0,
  "explanation": "Adding 5 to 7 gives 12."
}
```

Subjects are `mathematics`, `physics`, `chemistry`, `biology`. Levels are `foundation`, `5`, `6`, `7`, `8`, `9`, `10`. Answer indices 0–3 correspond to A–D. JSON exports wrap the array in a `questions` property; imports accept that wrapper or the array alone.

## Student details and results

The student provides name, a 10-digit phone number, class and subject, and confirms parent/guardian permission before saving. The server stores the profile, consent version, question snapshot, progress and final result. Refreshing the same browser tab returns to the welcome screen with a **Continue my journey** action. The complete answered-question trail is restored from the saved attempt. Starting again retains the previous attempt for the team and gives the new run five lives.

Administration → **Student results** shows all saved journeys, including incomplete attempts. **Export CSV** downloads the loaded records; refresh first to include newly submitted journeys. Records can be deleted individually after confirmation. Exported files contain personal information and should be kept with the Smartup team. No student details or result data are included in the public files or browser URLs.

The CSV includes name, phone, enrolled class, subject, assessed level, correct/answered totals, lives, time and status. Phone numbers are text: import that column as text in spreadsheet software to retain leading zeroes.

## Assessment rules

- Every run starts at Foundation and stops at the enrolled grade.
- Five correct answers in the current bucket unlock the next. They need not be consecutive.
- Five lives belong to the whole run. Each wrong answer costs one; levels never replenish them.
- The streak counts consecutive correct answers in the active bucket and resets at a new level.
- Failure reports the last cleared level. Failure at Foundation reports **Pre-Foundation Intervention Needed**. Failure at Class 5 after clearing Foundation reports **Foundation Level**. Clearing the enrolled grade reports **At Grade Level (Proficient)**.
- Questions shuffle without repeats within a run. A fresh run reshuffles and may include questions seen in earlier runs.

The welcome page explains the rules before onboarding. During play, answered questions remain in a continuous scrollable trail with expandable explanations. The owl is real extruded 3D geometry derived from the supplied brand artwork, with a sculpted body and expressive face. It travels beside the active question and moves to answer feedback to show a happy or gently disappointed reaction. A sticky HUD keeps shared lives, active level and correct-answer progress visible. Students can inspect level nodes but cannot skip levels. Audio starts off, animation can be paused, reduced-motion preferences are respected, and a branded static fallback keeps the challenge usable without WebGL.

These are original **draft** questions. Teacher review and difficulty calibration are still required before presenting this as an approved diagnostic. Science questions in lower classes are organised by domain for this experience, not claimed as a certified standalone subject syllabus. This is an indicative learning snapshot, not a validated placement test.

## Railway deployment after client approval

The checked-in Dockerfile serves both the marketing website and the assessment API from a single Node 24 process. The Three.js companion bundle is already in `dist/assessment/companion.js`; rebuild with `npm run build` after editing `src/assessment/companion.js`. The earlier map renderer is retained separately in `src/assessment/world.js`, but is not loaded by the new journey.

1. Deploy this repository as a Railway service using its Dockerfile.
2. Attach a persistent **volume mounted at `/data`**. Set `DATA_DIR=/data`; the Dockerfile already supplies that default. The SQLite database and its WAL files must survive redeployments. Railway documents persistent mount paths in its [volume guide](https://docs.railway.com/volumes).
3. Set a unique `ADMIN_PASSWORD` of at least 16 characters in Railway variables. Production refuses to start without it. Keep `NODE_ENV=production`, use HTTPS, and let Railway supply `PORT`. The health route is `/health`.
4. Keep **one replica / one Node process** for this SQLite design. Use PostgreSQL and transactional concurrency controls before scaling across replicas.
5. Configure `TRUST_PROXY_HOPS` only after verifying the actual ingress chain and ensuring the server is reachable only through those proxies. It defaults to zero, ignoring forwarded IP headers. With one verified trusted hop, use `1`. The implementation reads from the trusted end of the chain, never blindly from its first address. See Railway's [request-header documentation](https://docs.railway.com/networking/public-networking/specs-and-limits) and MDN's [trust guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For). Without this configuration, visitors behind the same proxy can share request limits.
6. Enable volume backups and test restoring a copy. Bank JSON and result CSV exports are useful additional backups but do not restore active-run access or admin sessions.
7. Verify HTTPS admin login, start/finish a synthetic run, edit/import a question, and redeploy once to confirm persistence before inviting students.

## Existing Sites review link

The `chatgpt.site` review uses the same website and gameplay engine, with `sites/worker.mjs` providing the API and a private D1 database for questions, student details and results. It supports the same question editor at `/assessment/admin/`. The Sites `ADMIN_PASSWORD` is configured as a hosting secret, with a private local copy in the ignored `.env.sites` file. Source files and browser assets never contain it.

`npm run build` generates `dist/client`, `dist/server` and `dist/.openai` for Sites publication, including database migrations. These generated directories are excluded from Git and the Railway image. The Node server blocks them from public requests. The question bank seeds once; publishing new website versions never replaces saved questions or student records. Conditional revisions protect runs and question edits across concurrent requests.

Local preview, Sites and Railway use separate databases. Before moving to Railway, export the approved question bank as JSON and any required student results as CSV from the Sites editor. Import the bank into the Railway editor; retain the results export with the team. Active review journeys and login sessions do not transfer. Railway remains pending client approval.

## Verification

`npm run check` checks source syntax. `npm test` exercises gameplay, all subjects and grade ceilings, storage, authentication, consent, duplicate/concurrent answers, imports, UTF-8 request handling, proxy configuration, pagination and the static server. Browser checks cover onboarding, answers, a level advance with carried lives, results, question editing, and responsive layout. The source review corrected ambiguous evaporation/hormone wording. Final client content approval remains outstanding.
