# Smartup Quest: mobile game journey

User-authorized implementation; design decisions can be made without an approval pause.

1. Preserve the existing scoring, editable bank, consent and saved-results APIs. Add answered-question snapshots to run history, return only previously answered snapshots, and prove future answers remain private and old runs still resume.
2. Replace the student split panel with a game-native welcome screen. Present five shared lives, five correct answers per level, Foundation-to-enrolled-class progression and no timer as concise visual rules. Keep onboarding one action away.
3. Render a continuous vertical question trail with completed questions and explanations retained above the current question. Restore this trail from the server after refresh. Add level gates; keep choices and feedback accessible HTML.
4. Fix a compact lives/level/progress HUD to the top of play. Animate only meaningful changes: lost heart, earned progress, unlocked level. Support reduced motion and optional sound.
5. Build a single Three.js owl companion derived from Smartup's original contours. Reuse it across welcome, onboarding, active question and result. Happy/sad expressions correspond to answers; travel follows the active question. Provide a branded static fallback.
6. Verify desktop and narrow mobile renders, onboarding, answering, level advancement, exhausted lives, resume and keyboard flow. Run existing scoring/API tests and new history regressions, build/check, then independent design review. Preserve the admin interface and visible mobile homepage entry.

Files: dist/assessment/index.html, quest.css, assessment.js; src/assessment/companion.js; dist/assessment/engine.js; server/assessment.mjs; tests/server.test.mjs; DESIGN.md, PRODUCT.md and assessment QA docs.
