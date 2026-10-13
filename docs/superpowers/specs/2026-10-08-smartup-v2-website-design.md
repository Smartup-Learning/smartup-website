# Smartup website v2 — design spec

Date: 8 October 2026 (updated 13 October 2026 with client feedback)
Status: approved by the user, 13 October 2026

## In one paragraph

We are replacing the v1 one-page site with a premium, mobile-first, multi-page website that tells the Smartup story from 2014 to today as an animated timeline, and speaks to both parents (proof, trust) and students (energy, belonging). It covers all 17 items in the client's "Website Improvement Suggestions" PDF. Smartup staff keep it fresh through a password-protected admin panel. It is built with Astro and Motion, runs on the existing Node server and SQLite database, keeps the Smartup Quest quiz, and deploys to Railway as before.

## Decisions already made

| Topic | Decision |
|---|---|
| Relationship to v1 | v2 replaces v1 in the same repo (`Smartup classses`). Quest, admin login, SQLite and Railway are kept. |
| Scope | All 17 client items in one release. |
| Devices | Mobile-first. Most visitors are on phones; desktop is the enhanced layout. |
| Look | Hybrid: purple hero with yellow marker words, calm cream story sections. |
| Build tool | Astro (SSR via `@astrojs/node`, middleware mode) + Motion (vanilla `motion` package). |
| Content updates | Smartup staff via an admin panel (no code). |
| Ask Smartup | Searchable FAQ + "ask a question" form answered by the team. No AI chat in v2. |
| Forms | Saved to admin panel with CSV export, plus a "Continue on WhatsApp" option. |
| Homepage priority | Trust-building, in the client's order (client, 12 Oct). |
| Language | English only. No Malayalam anywhere (client, 12 Oct). |
| Admin owner | Joel Parangamoottil, Digital Marketing Head, manages the admin panel and enquiries. |

## Sources

- Client suggestions: `Raw_Materials/Website Improvement Suggestions  final.pdf` (17 items).
- Brand: `Brand Guidelines/Smartup Logo & Brand Colors-jun 26.pdf`, `Brand Guidelines/Smartup Collateral-3.pdf`.
- Client Drive folder: https://drive.google.com/drive/folders/1yW-xbIAYGBcehu_fytaEB0SuZ6BMXLi4 (≈2,000 files: founder photos, 40 faculty photos, results by year 2022–26, Talent Eve and Shoot the Drugs event photos, testimonial videos, course PDFs, company DOCX files).
- Client feedback doc, 12 Oct 2026: Google Doc "SMARTUP WEBSITE" (`17LcRGSYYIr5y5LqlwTBIwW2-6h9jqGv-a7S_gVQ5VqI`) — vision, homepage order, student and centre numbers, founders, job openings, social links.
- Client timeline photos: Drive folder "TIME LINE FOLDERS" (`1UY8r8UzgBIa320uwhmUDCg6hG1h6_0Lu`) — 24 event photos in year folders 2014–2021, 2023, 2025, 2026. List it via `https://drive.google.com/embeddedfolderview?id=<folder id>`.
- Centre list: old Drive `Centers _ Offline Presence/Smartup Web - Centers_Offline Presence.docx` (map links, phones, timings).
- v1 research notes: `tmp/research-content/content-findings.md` (verified facts and their sources).
- Visual references from the user: UI UX Pro Max (uupm.cc) hero and Motion (motion.dev) hero.

## Brand rules (from the brand book — must not be broken)

- Colours: purple `#5f2ea8` (main), `#56269b`, dark purple `#392064`, light purple `#9560d7`, cream `#f4eee4`, ink `#1e1e1e`, white `#ffffff`.
- Yellow `#ede60f` is an accent only: marker highlights on a few words, small badges, at most one yellow call-to-action per screen. Never large yellow areas.
- Typeface: Rubik only (self-hosted WOFF2 from v1, weights 400–800).
- Logo and owl: use the supplied files unchanged. Never invert colours to make a white version; use the supplied negative version.
- Owl animation follows the brand animation guide: look left/right/down, smile, natural double blink, 360° head roll.
- Voice: confident and youthful ("Set your bar high enough", "Smart is the new cool", "Start building from the base", "Make parents proud"). Sticker-style energy is allowed in student-facing spots, kept out of parent-trust spots.

## Site map

| # | Page | URL | Client item |
|---|---|---|---|
| 1 | Home | `/` | 1 |
| 2 | Our Story (timeline) | `/story` | 2, timeline |
| 3 | Founders & leadership | `/founders` | 3 |
| 4 | Faculty | `/faculty` | 8 |
| 5 | Life @ Smartup | `/life` | Life at Smartup |
| 6 | Courses (CBSE / State Board, online & offline) | `/courses` | 1 (online & offline) |
| 7 | YouTube classes | `/videos` | 4 |
| 8 | Results & student success | `/results` | 5 |
| 9 | Testimonials | `/testimonials` | 6 |
| 10 | Alumni journeys | `/alumni` | 12 |
| 11 | Blog list + post | `/blog`, `/blog/[slug]` | 9 |
| 12 | Ask Smartup | `/ask` | 10 |
| 13 | Smartup App | `/app` | 11 |
| 14 | Free demo class | `/demo` | 13 |
| 15 | Community (WhatsApp / Telegram) | `/community` | 14 |
| 16 | Careers | `/careers` | 15 |
| 17 | Centres & contact | `/contact` | 16 |
| — | Social icons | footer of every page | 17 |
| — | Smartup Quest (kept) | `/assessment/` | — |
| — | Privacy | `/privacy` | — |
| — | Admin | `/admin` | — |

Navigation groups: **About** (Story, Founders, Faculty, Life), **Learn** (Courses, Videos, Blog, Ask, App), **Proof** (Results, Testimonials, Alumni), **Join** (Demo, Community, Careers, Contact).

## Mobile-first layout

- Base design width 360px; breakpoints at 600, 900 and 1200px. No horizontal scroll at any width.
- Sticky bottom action bar on phones: **Book free demo** (primary) + **WhatsApp** (icon button). On desktop these move into the header.
- Header: logo + menu button on phones; full-screen menu with the four groups. Desktop shows grouped dropdowns.
- Tap targets ≥ 44px. Body text ≥ 16px. Headlines scale with `clamp()`.
- Images: responsive `srcset` (WebP/AVIF), lazy-loaded below the fold, fixed aspect ratios to avoid layout jumps.
- Carousels from v1 (manual, swipeable, keyboard-accessible, never auto-advancing) are reused for results, testimonials, faculty and videos.

## Home page (mobile order)

The client asked for a trust-building homepage in a fixed order (12 Oct): About, Founders, Results, Student & parent feedback, Alumni, Course details, Career opportunities. The earlier parent/student switch, faculty, Life @ Smartup, app and blog teasers are dropped from the homepage; those pages stay in the menu and footer.

1. **Hero (purple).** Headline with a yellow marker word. Default "Make parents **proud**" (brand line, trust-first); "Smart is the new cool" and "Set your bar high enough" are alternatives editable in admin. Description "Tuitions • CBSE & State Board • 8 to +2". Buttons: Book free demo, Our story. The owl blinks and glances toward the buttons.
2. **Proof numbers** (inside the hero foot): 12+ years · 9 centres · 30,000+ students · 107 Full A+ (SSLC 2026). Numbers count up once when scrolled into view. Each figure carries its cohort/source.
3. **About.** Two-sentence story, four timeline chapters with the drawing line, "Read our story" → `/story`.
4. **Founders.** Four portrait cards (photo, name, role, one line) → `/founders`.
5. **Results.** Highlights carousel, attributed by exam and year → `/results`.
6. **Student & parent feedback.** Portrait testimonial videos plus written reviews when supplied; Google Reviews link once available → `/testimonials`.
7. **Alumni.** For now, the client's student testimonial videos (user, 13 Oct); story cards (name, batch, where they are now) are added from admin when stories arrive → `/alumni`.
8. **Course details.** CBSE / State Board tabs, online and offline → `/courses`.
9. **Career opportunities.** Current openings in brief → `/careers`.
10. **Book a free demo** band with nearest-centre link.
11. Footer: centres, phone, email, social icons, quick links, privacy.

## Our Story page (the centrepiece)

Flow follows the client PDF: how it started → the journey → 12+ years → milestones → growth in students and branches → academic achievements → vision for the future.

**Timeline behaviour**
- Vertical on all screens. On desktop, chapters alternate left/right of the line; on phones they sit to the right of the line.
- A purple line draws itself as the reader scrolls (`scroll()` progress → `scaleY`).
- The owl rides the line at the reading position, looks toward each chapter as it arrives and double-blinks. At the final "Future" chapter it does the 360° head roll once.
- Each chapter: year, title, 1–3 sentence story, one or more photos, optional stat (e.g. "4 centres"), optional source link.
- A sticky year indicator shows the current chapter on phones.
- Growth chart section: students and centres over the years (simple, accessible bars; data from admin).

**Chapters** (photos from the client's "TIME LINE FOLDERS" unless noted; numbers from the client's 12 Oct table)

| Year | Chapter | Photos | Students · centres |
|---|---|---|---|
| 2014 | Smartup is founded; the first branch opens | BRANCH PHOTOS, INDEPENDENCE DAY BSS | 63 · 1 |
| 2015 | Growing the first classroom | TEACHERS DAY | 130+ · 1 |
| 2016 | Honoured for educational and social contribution in Kochi, award presented by Kerala Assembly Speaker P. Sreeramakrishnan | IMG_6697 (poster; caption read from Malayalam, verify) | 330+ · 2 |
| 2017 | New branch at Chullickal | NEW BRANCH CKL, X MAS | 550+ · 3 |
| 2018 | First Coffee With Chairman (CWC) | CWC EDITION 1 | 1,600+ · 7 |
| 2019 | Shoot the Drugs season 1; online Kalolsavam featured in the press; strong board results | STD SEASON 1, ONLINE KALOLSAVAM, RESULTS, ONAM CELEB, TOUR | 15,000 · 7 |
| 2020 | Results continue (e.g. Abhishek N, 97.1% Plus One) | RESULTS | 25,000+ · 8 |
| 2021 | First interactive panel classes in West Kochi, inaugurated by K. J. Maxy MLA (14 Jun 2021) | FIRST INTERACTIVE PANEL CLASSES IN KOCHI | — |
| 2022 | Shoot the Drugs tournament covered by Kerala Kaumudi (8 Oct 2022) | old Drive / v1 press asset | — |
| 2023 | Independence Day rally | INDEPENDENCE DAY (SPL 2023 left out until its meaning is known) | — |
| 2024 | Board results; Shoot the Drugs 6.0 | old Drive results 2024-25, STD 6.0 | — |
| 2025 | Study tour; Shoot the Drugs champions | TOUR, STD 2025 | — |
| 2026 | 107 Full A+ in SSLC; Talent Eve; CWC edition 18; new office; new brand; Smartup app | TALENT EVE, CWC EDITION 18, NEW OFFICE, CAMP; old Drive results | 30,000+ · 9 |
| Next | Vision for the future (client text below) | — | — |

Numbers note: the client's table had the student and centre columns swapped from 2015 onward; the values above are corrected. Students are shown as given (cumulative reach; 30,000+ matches the "30,000+" figure). The client notes that from 2020 branches were consolidated into 9. The growth chart plots only the years supplied. HEIC photos are converted to WebP.

**Vision for the future** (client text, 12 Oct): "Shaping the Future of Learning — Empowering Every Student. Everywhere." Goal: a trusted, globally recognised K–12 brand connecting students across India and the GCC. Long-term priorities: global education network (GCC + Kerala), personalised and technology-enabled learning (AI), academic excellence in Kerala State and CBSE, scalable online and offline learning, accessible education for every student. Also Vision 2030: 500+ professionals mentored by Smartup on one stage in 2030.

## Other pages (content summary)

- **Founders:** four founders, bios from the client doc (12 Oct); photos from old Drive `Brand & Company Basics/FOUNDERS PHOTO`, matched by the user (13 Oct):

  | Name | Role | Photo |
  |---|---|---|
  | Mohamed Rayees | Chairman and CEO | AJI05659.JPG |
  | Dhanesh Narayanan Achari | Co-Founder and Vice Chairman | DSC07953.JPG |
  | Mohamed Shihas K. Y. | Founder and Director | DSC07902.JPG |
  | Shanu K. Y. | Co-Founder and Director | AJI08065.JPG |

  Mohamed Rayees's card features his initiatives (Coffee With Chairman, Talent Eve, Shoot the Drugs) and Vision 2030. Photos are stage shots from Talent Eve; crop to consistent portrait framing. Talk/class video strip only if videos are supplied.
- **Faculty:** filterable grid (subject). Photo, name, subject, qualification, experience, expertise, short intro. Seeded from the 40 Drive faculty photos (filenames include names and qualifications) and v1's four sourced profiles.
- **Life @ Smartup:** category chips (CWC programmes, award ceremonies / Talent Eve, Onam, Shoot the Drugs, art festivals, workshops, academic activities, celebrations). Photo galleries and click-to-load videos. Tagline: "Not just tuition — the whole student experience."
- **Courses:** v1's CBSE (Pro, Trio, Power) and State Board online programme content, plus an online vs offline comparison.
- **Videos:** YouTube embeds grouped as class videos, exam preparation, webinars, shorts. Click-to-load (no YouTube code until tapped).
- **Results:** filter by year and board. Rank holders, board results, improvement / before-after stories, poster proof viewable. Every figure names its exam and cohort; no extrapolation.
- **Testimonials:** student video testimonials (portrait videos from Drive, transcoded to H.264), parent feedback, written reviews, Google Reviews link, screenshots of genuine feedback.
- **Alumni:** story cards — name, batch, where they are today, achievements, career journey.
- **Blog:** categories — CBSE updates, board exams, exam preparation, study tips, parent guidance, career guidance, education trends, subject tips, scholarships. Post page with reading time, share buttons, related posts, and a demo call-to-action.
- **Ask Smartup:** instant search across published FAQs (client-side filter), category chips, and an "Ask your question" form. Answered questions can be published to the FAQ from the admin.
- **App:** what the Smartup app does, screenshots, App Store / Google Play links (verified links from v1).
- **Demo:** short booking form — student name, phone, class, board, online/centre, preferred centre, preferred time. Confirmation screen with "Continue on WhatsApp".
- **Community:** "Join our community" through the client's official channels (12 Oct): Facebook — Smartup Educations, Smartup CBSE; Instagram — @smartupeducations, @smartup_cbse; YouTube — @smartupeducations, @smartup-cbse. No WhatsApp/Telegram group was supplied; add one later from admin settings if it appears.
- **Careers:** open roles list (from admin) + application form (name, phone, email, role, experience, message, link to CV). No CV file upload in v2. Seed openings (12 Oct): full time — Physics; part time — Chemistry (Eraveli), Biology (Eraveli), Hindi (Moolamkuzhi), Malayalam (Moolamkuzhi), Assistant Maths (Pathadipalam and Vennala); teaching assistants — Maths, Physics, Chemistry; other — academic counsellors (offline), junior staff, mentors.
- **Contact:** branch cards with map link, phone and hours (5–9 pm, all branches); main phone +91 8891910919, info@smartupedu.in. Seed from the old Drive centres docx: Chullickal 79071 26725 · Kadavanthra 92070 76473 · Eraveli 87144 46244 · Thoppumpady 98950 85731 · Palluruthy 81291 79749 · Moolamkuzhi 77364 23463 · Fort Kochi 81295 08689 · Vennala 62821 79991 · Edappally 81378 59426, each with its map link. "Pathadipalam" in the docx is the same centre as Edappally; use the name Edappally (user, 13 Oct). Total: 9 centres.

## Motion plan

Library: `motion` (vanilla JS: `animate`, `scroll`, `inView`, `stagger`), bundled per page by Astro. Rules:

- Content is always visible without JavaScript. JS adds a class that enables start states before animating them in.
- `prefers-reduced-motion: reduce` disables movement; elements appear in final state, counters show final numbers, owl stays still.
- Animate only `transform` and `opacity`. No scroll-jacking, no pinned horizontal scroll sections.
- Durations 200–600ms with gentle ease-out; stagger lists by 60–80ms.
- Owl is an inline SVG built from the supplied owl paths, with grouped eyes/pupils so blink, glance and head-roll can be animated.
- Signature moments: hero owl glance, proof counters, timeline line-draw with travelling owl, page-section reveals, button press feedback. Everything else stays still.

## Architecture

```
Browser ──► server.mjs (Node 24)
              ├─ /api/assessment/*  ──► existing Quest handler (unchanged)
              ├─ /api/admin/*       ──► admin API (login shared with Quest)
              ├─ /api/forms/*       ──► public form API (demo, careers, ask)
              ├─ /media/*           ──► uploaded images from DATA_DIR/uploads
              ├─ static files       ──► dist/client (Astro assets, Quest files)
              └─ everything else    ──► Astro SSR handler (pages)
                                         └─ reads content via server/content-store.mjs
                                                └─ SQLite (DATA_DIR/smartup.sqlite)
```

- **Astro project** lives at the repo root (`astro.config.mjs`, `src/pages`, `src/components`, `src/layouts`, `public/`). Output: `dist/client` (static) and `dist/server` (SSR entry).
- **Quest move:** v1's hand-written `dist/assessment/*` files move to `public/assessment/*`; the esbuild step for `world.js`/`companion.js` outputs there. Quest behaviour and URLs do not change.
- **Pages are server-rendered** on each request from SQLite, so admin edits appear immediately. Pages ship no JS unless they have motion or interaction (small per-page bundles).
- **Content store** (`server/content-store.mjs`): one module owning all content tables and queries, used by both Astro pages and the admin API.
- **Admin auth:** reuses v1's scrypt password check and hashed session tokens. The session cookie path changes from `/api/admin` to `/` so `/admin` pages can check it (still `HttpOnly`, `SameSite=Strict`, `Secure` in production).

## Data model (SQLite)

Content tables (all have `id`, `published`, `sort`, `is_sample`, `updated_at`):

- `timeline_entries` — year_label, title, story, stat_value, stat_label, media_ids, source_url
- `growth_points` — year, students, centres
- `stats` — key, value, label, cohort/source (homepage proof numbers)
- `leaders` — name, role, background, vision, contribution, photo_id, video_ids
- `faculty` — name, subject, qualification, experience_years, expertise, intro, photo_id
- `results` — year, board, exam, student_name, score, highlight_type (rank / full A+ / improvement), story, poster_id, featured
- `testimonials` — kind (video / written / screenshot), person, relation (student / parent), quote, media_id, youtube_id
- `alumni` — name, batch, now_role, story, achievements, photo_id
- `videos` — youtube_id, title, category, subject
- `events` — title, category, date, media_ids, youtube_id (Life @ Smartup)
- `posts` — slug, title, category, excerpt, body_md, cover_id, author, published_at
- `faqs` — question, answer, category
- `jobs` — title, type, location, description
- `centres` — name, address, phone, map_url, hours
- `media` — file name, alt text, width, height, variants
- `settings` — key/value: WhatsApp number, community links, social links, app links, phone, email

Inbox tables: `demo_bookings`, `job_applications`, `questions` — each with created_at, status (new / contacted / closed), notes.

`is_sample = 1` rows render with a visible "Sample — to be replaced" label on the public site, following v1's policy of never presenting placeholders as genuine endorsements.

## Admin panel (`/admin`)

- Login with the existing `ADMIN_PASSWORD`.
- Sections: Timeline, Stats & growth, Founders, Faculty, Results, Testimonials, Alumni, Videos, Life events, Blog, FAQ, Jobs, Centres, Settings, Media library.
- Inboxes: Demo bookings, Job applications, Questions (answer → optionally publish to FAQ). CSV export for each inbox.
- Blog editor: Markdown text area with live preview. Rendered server-side with `marked`; raw HTML is stripped.
- Image upload: JPEG/PNG/WebP up to 10 MB, re-encoded with `sharp` to WebP at 480/960/1600px widths, stored in `DATA_DIR/uploads`, served at `/media/…`. Alt text required.
- Mobile-usable but optimised for desktop. Plain, conventional UI (not the marketing look).

## Forms and spam protection

- Public endpoints: `POST /api/forms/demo`, `/api/forms/careers`, `/api/forms/ask`.
- Server-side validation (lengths, Indian phone format, class 5–12), honeypot field, per-IP rate limit (reusing v1's limiter), JSON body ≤ 20 KB.
- A short data notice above each submit button; privacy page updated to describe what is stored and why.
- After submitting: confirmation screen with a prefilled "Continue on WhatsApp" link (`wa.me/<number>?text=…`). The WhatsApp number comes from `settings`; until the client confirms it, the WhatsApp button is hidden and phone is shown instead.

## Assets and content migration

1. Download the client Drive folder with `gdown` into `content-source/` (git-ignored).
2. Curate: founder photos, faculty photos (names/qualifications from filenames), event photos (Talent Eve, Shoot the Drugs 6.0 / 7.0), results posters, testimonial videos.
3. Convert photos to WebP variants with `sharp`; transcode HEVC/large videos to H.264 MP4 with `ffmpeg`; keep originals out of git.
4. Seed script loads v1 content (centres, courses, four faculty profiles, results, press, video selections) and curated Drive assets into SQLite. Seeding is idempotent.
5. Placeholders for missing client content are seeded with `is_sample = 1`.

## Design helpers

Before building UI, install the two helpers the user suggested, scoped to this project: the Motion AI kit (`npx motion-ai`) and UI UX Pro Max (`uipro init --ai claude`). Their guidance is used during implementation; the brand rules above win on any conflict.

## Quality bars

- **Performance (mobile, 4G mid-range phone):** Lighthouse Performance ≥ 90, LCP < 2.5 s, CLS < 0.1, ≤ 50 KB gzipped JS on marketing pages (Quest excluded).
- **Accessibility:** WCAG 2.2 AA contrast (yellow never used for text on cream/white), visible focus, keyboard-operable tabs/carousels/menu, alt text on every image, captions or transcripts noted for videos. Lighthouse Accessibility ≥ 95.
- **SEO:** unique titles/descriptions per page, Open Graph images, `sitemap.xml`, `robots.txt`, LocalBusiness/EducationalOrganization structured data with centre addresses.
- **No-JS:** all text content, navigation and form fallbacks work without JavaScript.

## Testing

- `node --test`: content store CRUD, admin auth (cookie path change), form validation, rate limit, honeypot, CSV export, Markdown sanitising, image upload limits. Existing Quest tests keep passing.
- Playwright at 375×812 (phone) and 1440×900 (desktop): every page loads, no horizontal overflow, menu and bottom bar work, timeline renders and animates, reduced-motion shows final states, demo form submits and appears in admin, no-JS smoke test.
- Lighthouse mobile run on Home, Story and Results.

## Deployment

- Dockerfile becomes two-stage: build stage runs `npm ci && npm run build`; runtime stage (`node:24-alpine`) copies `dist/`, `server/`, `server.mjs`, seed data and production dependencies.
- Railway: same service, same `/data` volume (now also holding `uploads/`), same `/health` check, one replica (SQLite).
- The separate "Sites" review worker (`sites/`) is not updated for v2 marketing pages.

## Out of scope for v2

Payments, student accounts / LMS, AI chat assistant, email notifications, live Google Reviews feed (link + curated screenshots instead), CV file uploads, any Malayalam content (client decision).

## Needed from the client (tracked as placeholders)

Open (user, 13 Oct: build now, address gaps later):

1. Whether 8891910919 can be the WhatsApp button number. Until confirmed, WhatsApp buttons are hidden and the phone number is shown.
2. Alumni stories — videos used meanwhile.
3. Google Reviews link (client: pending).

Resolved: Edappally and Pathadipalam are one centre, named Edappally.

Decided without asking (change in admin if needed): class range "8 to +2" (v1 wording); brand name written "Smartup" (brand book); YouTube selections taken from the official channels; written reviews optional (testimonial videos used meanwhile).

Before launch: client sign-off on privacy text.
