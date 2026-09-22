# Smartup Quest verification — 19 September 2026

## Automated checks

- Node 24: `npm test` — **54 passed, zero failed**.
- `npm run check` — server, engine, student and admin JavaScript syntax passed.
- `npm run build` — Three.js scene bundle built successfully (about 596 KB before transfer compression).
- Impeccable detector on both new HTML surfaces — zero findings. Independent finishing review also checked desktop and mobile renders; the Foundation label width was corrected afterward.
- `git diff --check` — clean.

Engine/API coverage includes all 24 subject/grade combinations, global lives, cumulative correct answers, Foundation/Class 5/Class 7 failure scoring, enrolled-grade completion, nine-question worst-case buckets, invalid and duplicate inputs, no answer-key leakage, per-run tokens, versioned data notices and legacy permission payloads, protected administration, session expiry/logout, saved records surviving database reopen, atomic question-bank validation, conflicting bank revisions, unchanged active-run snapshots, concurrent delayed request bodies, UTF-8 chunk boundaries, pagination beyond 1,000 records, and explicit proxy trust behavior. The shipped 280-question bank passes the same schema checks and complete-run exercise.

## Browser walkthrough

- Desktop onboarding with synthetic name/phone; start disabled until API ready.
- One wrong Foundation answer removed one life; five subsequent correct answers unlocked Class 5 with four lives remaining.
- Four wrong Class 5 answers ended the run and correctly returned **Foundation Level**, five correct of ten answered, one of four levels cleared. The result showed its saved confirmation.
- Private admin login tested against an isolated in-memory server. Edited a real draft prompt, saved it, and verified the changed question and private result table.
- Reviewed 1440px desktop, 390px mobile and 320px narrow mobile. No final horizontal page overflow. The 320px world margin and Foundation node width were corrected. Checked the existing marketing navigation at 1024px and 820px and followed its new Learning challenge link.
- Blocked the 3D bundle temporarily through development tools: the branded fallback displayed, no canvas was required, and the start button remained enabled. Block removed afterward.
- Emulated reduced motion: WebGL still rendered and form transitions became zero-duration. Normal preferences restored afterward.
- Final preview uses normal viewport settings. Synthetic browser-test record removed from the local database; isolated admin-test server stopped.

## Scope and limits

The original bank was reviewed for factual/key errors; evaporation, human hormones and osmosis wording were clarified. Difficulty still needs teacher calibration. Draft/indicative labels remain.

The local Node/SQLite version is working. Railway infrastructure, TLS/domain setup, persistent-volume redeploy and restore tests have not been performed because the user specified Railway hosting after client confirmation. The old public Sites marketing deployment has not been replaced with API-dependent static files.


# Welcome and continuous journey update — 20 September 2026

- Rebuilt student entry as a game-native welcome with rules, then separate onboarding. Original admin CSS is unchanged; student additions are isolated in `quest.css`.
- Added safe answered-question snapshots to persisted history. Two new regression tests cover resumed explanations without future-answer disclosure and legacy summary-only attempts. Full suite: **56 passed, zero failed**.
- Browser verified at 1440×960, 390×844 and 320×740. No horizontal overflow. Reviewed actual WebGL welcome, question, happy-feedback and sad-feedback renders.
- Synthetic mobile journey: wrong Foundation answer → four lives; five correct answers → Foundation cleared; Class 5 starts at zero bucket progress and still four lives. Six earlier questions remain in the trail.
- Reload verified the welcome resume action restores answered state and the question trail.
- A second synthetic journey ran with the companion bundle blocked and reduced motion enabled. Static owl remained visible; motion duration was zero; five wrong Foundation answers led to the expected Pre-Foundation result and saved confirmation. Temporary emulation/blocking restored afterward.
- Independent source review found and resolved duplicate scroll offsets and a possible restart race during pending requests. Independent rendered review could not access the browser/images in its isolated context; root inspected the actual screenshots.
- One design-detector pass: preserved the intentional rounded dimensional podium rim; removed the redundant response-card accent and progress width animation. Earned progress, heart loss and level unlock use transform/color feedback.
- Preview only. Public marketing link and Railway deployment remain unchanged pending client approval.

# Mobile refinement — 22 September 2026

- Welcome simplified to the owl, short introduction and play action; rules now follow the details form. Subject choices use branded dimensional graph, magnet, atom and DNA icons.
- Removed the guardian checkbox. New runs record the displayed data-notice version rather than asserting guardian permission. Both Node/SQLite and Sites/D1 accept the new notice and preserve legacy client compatibility; unknown notice versions are rejected.
- Automated suite: **59 passed, zero failed**. Source syntax, production build and whitespace checks passed. Independent review identified a disabled-button focus issue; feedback now receives programmatic focus before the next action.
- Mobile browser journey at 390×844: one incorrect Foundation answer, five correct answers, visible Foundation → Class 5 unlock card, four lives carried into Class 5, then exhaustion. Result correctly reports Foundation Level, 5/10 correct and 0/5 lives. The isolated QA database confirms the saved result and v2 notice.
- Verified 320×740 and 1440×960: questions use full width without the owl; feedback includes the expressive owl; no horizontal page overflow. HUD includes subject/current level and the stage count. Earlier questions remain in the trail and saved progress resumes after navigation.
- Confirmed split-heart animation and the −1 life notice. Reduced-motion emulation suppresses the animation while retaining readable feedback; normal emulation restored afterward.
- Added versioned engine imports after the browser exposed a cached-module mismatch. Welcome, onboarding and complete gameplay load with the revised assets.
- One Impeccable detector pass. Retained the established dimensional podium and button edges intentionally. Its inherited progress-width finding is already overridden with `transition:none` in the Quest HUD.
- Test records used a separate `tmp/quest-refinement-qa` database; real student records were not modified. Railway deployment remains the user's next step; the existing Dockerfile and persistent-volume instructions are unchanged.
