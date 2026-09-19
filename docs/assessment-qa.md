# Smartup Quest verification — 19 September 2026

## Automated checks

- Node 24: `npm test` — **54 passed, zero failed**.
- `npm run check` — server, engine, student and admin JavaScript syntax passed.
- `npm run build` — Three.js scene bundle built successfully (about 596 KB before transfer compression).
- Impeccable detector on both new HTML surfaces — zero findings. Independent finishing review also checked desktop and mobile renders; the Foundation label width was corrected afterward.
- `git diff --check` — clean.

Engine/API coverage includes all 24 subject/grade combinations, global lives, cumulative correct answers, Foundation/Class 5/Class 7 failure scoring, enrolled-grade completion, nine-question worst-case buckets, invalid and duplicate inputs, no answer-key leakage, per-run tokens, consent, protected administration, session expiry/logout, saved records surviving database reopen, atomic question-bank validation, conflicting bank revisions, unchanged active-run snapshots, concurrent delayed request bodies, UTF-8 chunk boundaries, pagination beyond 1,000 records, and explicit proxy trust behavior. The shipped 280-question bank passes the same schema checks and complete-run exercise.

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
