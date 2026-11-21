# Overnight development progress

This log records work performed in this session, not a claim of production readiness. All times UTC. No live paid provider calls, public deployments, real applications or emails are authorized.

## 2026-11-21 — Architecture and CV parsing checkpoint

- Inspected authentication, profile, CV ingestion, AI gateway and job search. Existing release gate remains NO-GO; external provider credentials and authenticated staging verification remain unavailable.
- Corrected DOCX extraction to identify WordprocessingML by namespace URI rather than assuming the `w:` prefix. Handles transitional and strict Word namespaces, tabs and explicit line breaks; unrelated namespaces are ignored.
- Enforced the extracted-text size bound for all appended content, including tabs and paragraph separators, not only XML text nodes. DTD rejection remains in place.
- Added synthetic DOCX tests for both standard namespaces, arbitrary prefixes, line breaks, unrelated namespaces, DTD rejection and separator-only size overflow.
- Verification: `npx vitest run tests/cv.test.ts` passed 10/10; `npm run typecheck` passed; `npm run lint` passed. The PDF extraction fixture emitted a PDF.js standard-font warning; its test passed. No live user document or AI call was used.
- Remaining: authenticated staging and storage tests, parser process isolation/malware scanning and OCR are not implemented. Continue with AI gateway and foundational reliability.

## 2026-11-21 — AI gateway reliability checkpoint

- Fixed task-provider overrides so `AI_DEFAULT_MODEL` cannot accidentally be sent to a different provider. The default Groq fallback and readiness view now agree, and blank credentials/models are treated as absent.
- Reject provider output unless its completion status confirms a finished text response. Token-limit truncation, content filtering, tool-use/unknown and absent finish statuses cannot silently be stored as a complete CV, cover letter or analysis. Errors do not include provider content.
- Updated setup documentation and added mocked tests across Groq, OpenAI, Anthropic and Gemini for completed and incomplete responses and model selection. No provider was contacted; deployed model compatibility still needs live staging verification.
- Verification: `npx vitest run tests/ai.test.ts tests/ai-usage.test.ts tests/readiness.test.ts` passed 25/25; `npm run typecheck` and `npm run lint` passed.
- Remaining: provider credentials, live provider protocol validation, reliable cost accounting and all external end-to-end tests are still required. Continue with profile/recommendation foundations.

## 2026-11-21 — Profile onboarding checkpoint

- Replaced the dashboard's static next-steps panel with optional guidance based on the signed-in user's actual profile, career-entry, original-CV and application records. Query errors and missing counts are explicitly shown as unavailable, never as empty or complete.
- Added a direct link to the existing original-document section and corrected the dashboard profile status to recognize other saved background fields even without a name. Recent application query failures no longer appear as an empty fresh start.
- Added unit tests for empty, partially complete, failed/unknown, whitespace-only and invalid-count cases. No sample candidate records or jobs are inserted.
- Verification: `npx vitest run tests/onboarding.test.ts tests/profile-form.test.ts tests/career-entry.test.ts` passed 13/13; `npm run typecheck` and `npm run lint` passed. Real authenticated Supabase/browser testing remains blocked by the previously observed sandbox connection limits.

## 2026-11-21 — Career-entry conflict handling checkpoint

- Added optimistic concurrency to the existing career-entry edit and delete actions: updates/deletes are scoped to the authenticated owner, entry ID and loaded `updated_at`, and application updates use a new timestamp greater than the prior version.
- The edit form now retains controlled input values after validation, database errors or a conflict. On conflict it asks the user to copy their edits and reload, rather than overwriting a newer entry. Invalid IDs are not used in redirect paths.
- Verification: mocked action tests cover ownership/version filters, stale writes and deletes, missing versions, creation and invalid IDs. `npx vitest run tests/career-entry-actions.test.ts tests/career-entry.test.ts` passed 8/8 after the controlled-form change; `npm run typecheck` and `npm run lint` passed.
- Limitation: the current database permits authenticated direct updates of `updated_at`; these guards protect the app's own write paths, not arbitrary direct clients that deliberately preserve/forge versions. Database-enforced versions, authenticated browser behavior and live concurrent access need isolated staging verification; no live migration was applied in this checkpoint.

## 2026-11-21 — Ingestion reliability and regression checkpoint

- Moved bounded worker logic into a testable module. It validates claimed task metadata, commits batches of at most 100 under the lease, checks that the database reports the expected write count, and only records success after the final fenced completion. Failure recording remains generic and does not include provider content. The scheduler CLI still handles at most ten claims and exits nonzero when tasks fail.
- Reject unsafe, negative or fractional numeric source IDs instead of silently rounding or importing a misleading ID. No live board was contacted or imported.
- Gemini thought-marked response parts are omitted from user-facing output; this is mocked only and requires provider staging validation.
- Verification: job/worker focused suite passed 23/23; AI focused suite passed 26/26; typecheck and lint passed after each change. Earlier in this checkpoint, the complete suite passed 149/149 in 32 files, audit at moderate threshold reported zero vulnerabilities, and a production build succeeded in an isolated temporary copy using non-secret test configuration so the running development preview was not interrupted. Subsequent changes have focused tests and typecheck/lint; a final complete run/build is still needed.
- Live database: rollback-only synthetic checks against the connected Meridian project verified a version-guarded career-entry update, rejection of stale update/delete predicates, and another user's RLS invisibility; all fixture data rolled back. This does not prove browser concurrency or protect against clients intentionally forging timestamps.
- Local preview smoke: `/`, `/login`, `/signup`, `/forgot` returned HTTP 200 and unauthenticated `/dashboard` and `/account/export` returned 307. External preview routing remains unverified; the earlier proxy reported sandbox not found.
- Remaining: no real jobs, scheduler setup, approved board, stale-listing expiration, real provider credentials or live external integration tests. No migration, real job, public deployment or paid call was made in this checkpoint.

## 2026-11-21 — Manual interview preparation checkpoint

- Added an owner-scoped preparation page linked from each application. It provides fixed prompts and up to 20 actual saved career entries, without inventing candidate facts, making an AI call, sending emails or modifying any database record.
- Notes are editable in browser memory and downloadable as text; the UI warns they are not saved to the account and are lost on navigation/reload unless downloaded. The download warning highlights that the file can contain private information. This is manual preparation, not the still-missing AI interview coaching workflow.
- Added format and mocked owner-scope/page tests. The initial page-test run exposed Vitest's preserved-JSX configuration; configured Vitest's JSX transform and reran successfully. Focused interview suite passed 15/15; typecheck and lint passed. Actual authenticated browser/download testing remains unverified.
- No migration, external provider call, real interview invitation or email was made. Continue with final regression checks and release documentation.

## 2026-11-21 — AI configuration validation checkpoint

- Validate model names against the existing database observation constraint before reserving quota or calling a provider. The readiness page now flags malformed model configuration without exposing its value; provider-specific defaults continue to avoid cross-provider model fallback.
- Verification: AI/readiness focused suite passed 27/27; typecheck and lint passed. No live provider calls were made.

## 2026-11-21 — Final regression checkpoint for this execution

- `npm test`: 165 tests passed in 35 files. Tests include mocked provider traffic and synthetic fixtures; the PDF.js standard-font warning remains.
- `npm run typecheck` and `npm run lint`: passed after the latest code changes. `npm audit --audit-level=moderate`: zero vulnerabilities. `git diff --check`: passed.
- `npm run build`: passed in an isolated temporary copy of the current source with non-secret test configuration. This preserves the running development server's `.next` output; the build is not a deployment.
- Preview inside the sandbox: landing, login, signup and forgot pages returned HTTP 200; unauthenticated dashboard, export and interview-preparation routes returned 307. This is not an authenticated browser or external-preview test.
- Worker missing-configuration check: exited 1 without making a provider call, as expected. Supabase career-entry checks used temporary synthetic records in a rolled-back transaction; no migration or persistent test records were added.
- Remaining high-priority work: database-enforced career-entry versions; authenticated staging/auth/storage E2E; production-safe CV parsing and malware scanning; real model/provider verification; approved board import, scheduler and listing expiry; AI interview coaching; live test-mode Stripe and OAuth; privacy/deletion, monitoring, rate limits, and independent security/accessibility reviews. Account deletion remains disabled and release status remains NO-GO.

### Follow-up regression correction

- Onboarding status now includes all saved profile fields, including location and work preferences, and unknown counts no longer appear as zero in dashboard statistics. Focused onboarding tests passed 7/7; typecheck and lint passed.
- Final rerun after that correction: all 167 tests in 35 files passed, and the production build again succeeded in an isolated copy with non-secret configuration. The PDF fixture warning remains. No tests verify a live provider or an authenticated browser session.
