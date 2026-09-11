# Smartup: warmth and motion audit

11 September 2026. Marketing website for students in classes 8–12 and their parents.

The strongest next step is to make the supplied owl expressive at two deliberate moments: a welcoming double blink in the hero, then a reassuring smile near the final contact invitation. Add gentle feedback when choosing a class. Start with those three touches and reassess before adding more animation.

## Why the page can feel plain

The purple and cream palette, Rubik typography, authentic footage and uncluttered content already form a coherent identity. Desktop and mobile preview inspection confirms a clear hierarchy. Most sections repeat a heading followed by a horizontal rail. This consistency helps navigation, but gives the middle of the page an even rhythm.

The brand’s most distinctive asset is currently a 36px owl with 4px padding. Its face is too small to play much of an emotional role. It moves by only 11.25px on desktop scroll; it does not blink or smile. Existing movement primarily belongs to generic hover states and scrolling.

Page 19 of the client’s **Smartup Logo & Brand Colors-jun 26.pdf** supplies the missing personality directly: straight/left/right/down looks, a three-frame smile, and a fast, noticeable natural double blink. Use that artwork and preserve its proportions. Keep the header wordmark still.

Source: `/Users/USER/Documents/ChatGPT/SMARTUP WEBSITE/Smartup Logo & Brand Colors-jun 26.pdf`, physical page 19, “Animation Guide”.

## Proposed first pass

| Priority | Moment | Proposed behavior | Boundaries |
|---|---|---|---|
| 1 | Hero introduction | Enlarge the decorative owl to about 56–64px. Once the hero settles, play the supplied natural double blink in about 500ms. | Once per visit. No permanent blink loop or mouse tracking. Freeze its small parallax during the expression. |
| 2 | “Let’s find your next step.” | A second small owl passes through the supplied smile frames over 350–450ms when the contact invitation first enters view, then holds its smile. | Only these two owl appearances initially. Keep the phone action prominent. |
| 3 | Class selection | Update the selected class immediately, with a 140–180ms opacity settle on the new programme content and at most 3–4px movement. | Keep the panel’s layout stable, announce the update immediately and never queue animations after repeated selections. |

If those three feel right, refine the existing FAQ plus rotation over 160–180ms and let primary CTA arrows move 2px on hover/focus. Use these as replacements for competing whole-button movement rather than stacking effects.

Motion should convey an attentive teacher’s manner: observant, reassuring, calm. The older students and parents in this audience still need a credible place to compare programmes. Real student and teacher material should remain the main source of human warmth. Keep the approved placeholder disclosures visible until actual testimonials arrive.

## Retain and avoid

Retain manual carousels, click-to-play videos, subtle image zoom, the existing brand colors and compact copy. The mobile menu refinement now uses a less front-loaded 420ms opening, 280ms exit and 320ms icon transition. Closed navigation remains noninteractive, Escape restores focus and reduced motion removes transitions.

Avoid a page-travelling 3D mascot in this first pass, animated exam counters, confetti, auto-advancing cards, animated teacher portraits and repeated text entrances. These would compete with the student stories and programme decisions.

## Technical audit

Independent source assessment: **16/20, Good**. This is an internal qualitative score, not a measured performance score or accessibility certification. Accessibility 3/4; performance architecture 4/4; responsive behavior 3/4; theming 3/4; implementation integrity 3/4.

The Impeccable detector returned no findings for `dist/index.html`; that does not establish that the rendered site has no issues. The source review found no critical defect. Four modest improvements remain:

| Priority | Finding | Recommendation |
|---|---|---|
| Medium | Carousel controls shrink to 36px on narrow screens, the menu is 40×42px, and app links have a 34px minimum height. | Keep mobile hit areas at least 44×44px. Current sizes are not automatically WCAG AA failures; this is a touch-usability improvement. |
| Medium | Some descriptive sentences fall to 12–14px on mobile. | Bring reading copy toward 16px while preserving a deliberate smaller tier for dates, provenance and short labels. Verify enlarged text and 320px layouts. |
| Medium | The mobile menu trigger follows the navigation links in DOM order. Opening it with the keyboard leaves the revealed links behind the trigger in Tab order. | Place the disclosure trigger earlier in the keyboard order or focus the first link on keyboard opening. Preserve existing Escape/close restoration. |
| Low | The owl’s scroll handler keeps writing the same capped transform after the hero is offscreen. | Stop updates when the value is unchanged or the owl is outside the viewport before extending this pattern. |

Existing strengths include visible keyboard focus, labelled controls, polite live regions, native FAQ disclosures, a usable no-JavaScript fallback, explicit image dimensions, lazy below-fold imagery and videos that load only when requested. Sampled solid-color text contrast passes the normal-text AA threshold; image overlays were not comprehensively certified.

## Implementation and verification boundaries

Use the supplied expression frames, CSS and the existing small JavaScript layer. No animation library is necessary. Keep default content visible; use transform/opacity for the bounded interface transitions; stop decorative work when offscreen or the tab is hidden. Reduced-motion visitors should see the final static expression with immediate control updates.

This review combines independent design/source and technical/source assessments with browser inspection of the desktop hero and story sections and mobile navigation at 390px and 320px. Menu opening/closing, repeated activation, Escape and desktop breakpoint recovery were exercised. Source syntax checks and all six existing server tests passed. This was not a full screen-reader, physical-device, 200% text-zoom or measured frame-rate audit.

The expressive owl and programme suggestions above are proposals. The only interface change made during this review is the requested mobile menu timing refinement.
