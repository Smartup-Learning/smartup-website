# Smartup marketing website

A responsive marketing/information website for classes 8–12. The separate student app and LMS are intentionally outside this project.

## Preview
Requires Node.js 22 or newer. Run `npm start`, then open http://localhost:3000. No package installation or build step is needed. `npm run check` checks JavaScript syntax; `npm test` verifies the static server, including HEAD and byte ranges.

## Railway
Deploy this repository to a Railway service. Railway detects the included Dockerfile; the server listens on `0.0.0.0` and the assigned `PORT`. The health check is `/health`. Generate a Railway domain or connect the client's domain after deployment. No secrets, databases or additional services are required. The `.openai` folder is for the private Sites review copy and does not affect Railway.

## Content and assets
- Website: `dist/index.html`; styling: `dist/styles.css`; interactions: `dist/app.js`.
- Phone and email links appear directly in HTML. Centre records and class-selector descriptions are in app.js.
- Local Rubik WOFF2 fonts are served without third-party font requests.
- Owl and logo are extracted from the supplied June 2026 brand PDF. Their vector shapes and original colours are preserved. The small hero owl uses bounded scroll movement; motion is disabled on mobile and for reduced-motion users.
- Aflah K. R. photo, Talent Eve photos and result announcements come from the client Drive folder. Result links expose the original posters; every statistic identifies its cohort.
- Video placeholders use the official Smartup YouTube channel. Change `data-video`, `data-title`, poster, accessible name and direct link together when replacing a video. Frames support both portrait and landscape media at a common height.
- Three text testimonials are user-authorised sample copy, visibly marked as awaiting client approval. Replace both copy and attribution with approved material before removing those labels.
- App Store and Google Play links are repeated in the top bar, hero and app section. These open the existing student app; no LMS is built into this site.

## Before public launch
- Confirm the enquiry preference. Source provides +91 8891910919 as the main phone but leaves WhatsApp blank, so this version uses phone/email.
- Confirm final centre list: source supplies Edappally's map without a phone and Pathadipalam's phone without a map. The site uses the main team for Edappally and phone directions for Pathadipalam.
- Client legal document contains a placeholder effective date and app/account-specific terms. It is not presented as a final marketing-site policy. `/privacy.html` describes this site's actual behaviour; obtain client sign-off before public launch.
- Fees are intentionally handled by the academic team rather than publishing the private pricing workbook. This site does not take payments or submit/store lead data.
- When the LMS destination is ready, add its verified URL as a separate navigation link. Do not add student credentials to this marketing site.
- Replace approved placeholder video selections and sample testimonial copy, and confirm captions/transcripts for the chosen videos. The page uses click-to-load YouTube embeds and discloses third-party thumbnails/player behaviour in its privacy notice.
- Set a canonical URL and update the absolute social image URL when the final Railway/custom domain is assigned.

## Verification
Responsive and interaction checks cover class switching, centre fallback behaviour, valid phone/maps destinations, mobile navigation, FAQ disclosure, video playback/close, local assets, no horizontal overflow, and desktop/mobile review. See docs/qa.md and docs/audit-2026-09-11.md for evidence and limits.
