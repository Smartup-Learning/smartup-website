# Smartup website and learning challenge

A responsive marketing website for classes 8–12, with Smartup Quest: a gamified diagnostic page for Classes 5–10. The student app and LMS remain separate. See [the assessment editing and deployment guide](docs/assessment.md) for questions, admin access and saved results.

## Preview
Requires Node.js 24 (`nvm use 24`). Run `npm ci`, `npm run setup`, then `npm run build && npm start`; open http://localhost:3000. The v2 marketing site (Astro, `src/`) is served alongside Smartup Quest at `/assessment/` and its editor at `/assessment/admin/`.

- `npm run dev` — Astro dev server with live reload (content comes from `data/smartup.sqlite`).
- `npm test` — unit and server tests (builds first). `npm run test:e2e` — Playwright on phone and desktop.
- `npm run media` — re-fetch and re-encode photos and videos listed in `data-seed/media-sources.json` into `public/seed/`.
- `npm run fonts` — re-create the Latin-subset Rubik fonts in `public/fonts/` (needs `pip install fonttools brotli`).
- `npm run content:reset` — local only: clear content tables so `data-seed/content.json` is re-seeded on next start.

After pulling Phase 2, run `npm run content:reset` once so local content picks up the new seed.

## Admin
Open `/admin` and sign in with `ADMIN_PASSWORD` (locally it is in `.env`, created by `npm run setup`). Staff edit every content section, the site settings and photos, and handle demo bookings, job applications and questions, with CSV export. Uploaded photos are stored in `DATA_DIR/uploads`, which must be on the persistent volume. Staff guide: [docs/admin-guide.md](docs/admin-guide.md).

## Railway
Live at [smartup-web-production.up.railway.app](https://smartup-web-production.up.railway.app), including the assessment and private admin workspace. See the [Railway deployment runbook](docs/railway.md) for the deployed version, project IDs, update command, secrets, persistent `/data` volume and backup status. Keep one replica for the SQLite database. The `.openai` folder configures the separate Sites review and does not affect Railway.

## Content and assets
- Website: `dist/index.html`; styling: `dist/styles.css`; interactions: `dist/app.js`.
- Phone and email links appear directly in HTML. Centre records and class-selector descriptions are in app.js.
- Local Rubik WOFF2 fonts are served without third-party font requests.
- Owl and logo are extracted from the supplied June 2026 brand PDF. Their vector shapes and original colours are preserved. The marketing hero keeps the consultant-approved text treatment. The new learning challenge extrudes the native owl paths into its 3D progression scene, with reduced-motion support and a WebGL fallback.
- Four teacher portraits, the Talent Eve hero photo and result announcements come from the client Drive folder. Result links expose the original posters; every statistic identifies its cohort.
- Video placeholders use the official Smartup YouTube channel. Change `data-video`, `data-title`, poster, accessible name and direct link together when replacing a video. Frameless cards support portrait and landscape media at a common height. YouTube’s native controls handle play/pause; no custom close button or hero video toolbar is shown. All five rails use the shared `.carousel-track` and `data-carousel` pattern in HTML; controls are progressively enabled in app.js.
- Three photo testimonials combine user-authorised sample copy with fictional AI portraits, visibly marked as placeholders. Replace both copy and attribution with approved material before removing those labels.
- App Store and Google Play links appear once in the top ribbon, with Apple and Android icons. These open the existing student app; no LMS is built into this site.

## Before public launch
- Confirm the enquiry preference. Source provides +91 8891910919 as the main phone but leaves WhatsApp blank, so this version uses phone/email.
- Confirm final centre list: source supplies Edappally's map without a phone and Pathadipalam's phone without a map. The site uses the main team for Edappally and phone directions for Pathadipalam.
- Client legal document contains a placeholder effective date and app/account-specific terms. It is not presented as a final marketing-site policy. `/privacy.html` describes this site's actual behaviour; obtain client sign-off before public launch.
- Fees are intentionally handled by the academic team rather than publishing the private pricing workbook. This site does not take payments. The opt-in diagnostic stores student details, progress and results for the Smartup team.
- When the LMS destination is ready, add its verified URL as a separate navigation link. Do not add student credentials to this marketing site.
- Replace approved placeholder video selections and sample testimonial copy, and confirm captions/transcripts for the chosen videos. The page uses click-to-load YouTube embeds and discloses third-party thumbnails/player behaviour in its privacy notice.
- Set a canonical URL and update the absolute social image URL when the final Railway/custom domain is assigned.

## Verification
Responsive and interaction checks cover class switching, centre fallback behaviour, valid phone/maps destinations, mobile navigation, FAQ disclosure, video loading and switching, local assets, no horizontal overflow, and desktop/mobile review. See docs/qa.md and docs/audit-2026-09-11.md for evidence and limits.

## Carousel revision
The visible copy was reduced from 1,205 to 745 words (about 38%). Duplicate hero downloads and the bottom app promotion were removed. Life @ Smartup was subsequently restored between Team and Centres at the user’s request. Video stories, photo testimonials, press, learning formats and teachers now use the same manual carousel pattern. Arrow keys, Home/End and pointer controls are supported; the carousel does not auto-advance. See docs/carousel-revision.md for asset provenance and checks.
