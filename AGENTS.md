# OTONOM repository instructions

This file is the permanent Vibe Coding / agent contract for OTONOM. Read it before changing code.

## 1. Non-negotiable project rules

- Every functional change must increment the patch version before it is committed. Run `npm run version:bump`, then `npm run version:check`.
- The header badge (`apps/web/src/version.ts`), workspace packages and Worker health responses must always report the same version.
- Keep automatic, secret-redacted diagnostic logging intact for every local video production. A completed, failed or recovered interrupted run must remain downloadable as a `.log` file.
- Never report a fix as complete before the relevant regression test, full test/build checks, and the actual deployed/runtime behavior have been verified when deployment is part of the task.
- Preserve working modules. A bug fix in one path must not rewrite unrelated TTS, renderer, music, social publishing, storage, authentication, or UI flows.

## 2. ZERO-GUESS workflow

1. Inspect the existing implementation, logs, failing input, and related tests before editing.
2. Identify the smallest real root cause. Do not patch symptoms repeatedly when architecture or routing is wrong.
3. If one genuinely blocking fact is missing and cannot be derived from code/logs, ask one precise question before coding.
4. Do not invent APIs, file paths, data shapes, configuration values, model behavior, or external service capabilities.
5. Separate verified facts from assumptions. Assumptions must never silently become production logic.
6. Prefer using the working implementation already present elsewhere in the project over recreating it from scratch.

## 3. Change discipline

- Make the smallest coherent change that solves the verified problem.
- KISS first; use YAGNI and DRY deliberately. Apply SOLID only where it improves maintainability rather than adding abstractions for their own sake.
- Do not perform broad refactors during a focused bug fix unless the bug is proven to be architectural and cannot be fixed safely in place.
- Do not rename, move, reformat, or modernize unrelated code during a targeted fix.
- No placeholders, TODOs, fake implementations, stubs, sample-only branches, or disabled production logic.
- No silent fallback that hides a failed stage. When a required stage fails, fail closed with a useful diagnostic.
- Avoid duplicate pipelines for the same responsibility. There must be one clearly selected production path.

## 4. Debugging rules

- Start from evidence: production log -> exact failing stage -> responsible function -> input/output boundary.
- Add observability before adding more heuristics when the failure cannot be explained from current logs.
- Fix upstream corruption at its source instead of compensating for it downstream.
- A rejected/invalid item must not re-enter later through fallback, merge, cache, or default logic.
- AI output must not be allowed to validate itself. Independent evidence must remain independent.
- If a previous fix did not change runtime behavior, check deployment/version/cache/routing before changing the algorithm again.
- Never weaken correctness constraints merely to make a count, quota, test, or UI state turn green.

## 5. Testing contract

For every functional fix or feature:

1. Reproduce the bug with a focused regression test whenever feasible.
2. Make the test fail for the old behavior.
3. Implement the minimum fix.
4. Run the focused test.
5. Run the relevant package tests/typecheck/build.
6. Run the full Vitest suite when shared code is touched.
7. Run browser/E2E checks when browser rendering, media, or user flows are touched.
8. For production bugs, test with the real failing shape/input when it is available, not only synthetic data.
9. Do not say "fixed", "done", or "works" until the checks actually pass.

A passing unit test is not proof of a successful deployment. When the task affects the live app, verify that the live bundle/version contains the tested change.

## 6. Newspaper / factual-content safety

- Never guess unreadable newspaper text.
- Preserve the newspaper's actual printed headline and attached detail; do not paraphrase factual content unless that mode is explicitly requested.
- Numbers, dates, percentages, scores, currencies, names, and quoted claims are high-integrity tokens and must not be silently changed.
- Prefer fail-closed behavior over reading corrupted text aloud.
- Clickbait may reframe emphasis only from verified source wording; it must not invent facts, political labels, accusations, outcomes, or emotions.
- Newspaper reading, clickbait generation, narration preparation, and rendering must remain separate responsibilities so one stage cannot silently corrupt another.

## 7. TTS / media pipeline safety

- If required TTS fails, stop production and produce a diagnostic log. Do not continue with a misleading or incomplete video.
- Text passed to TTS must be normalized for the selected language without changing factual meaning.
- Background music, subtitles, Son Soz/final section, Outro, and final MP4 requirements must not be removed by unrelated fixes.
- Always preserve partial/failure diagnostics and useful artifacts according to the existing production policy.

## 8. Code quality

- Prefer small pure functions for validation, normalization, ranking, geometry, and formatting logic.
- Keep side effects at boundaries: network, storage, DOM/canvas, audio/video, and logging.
- Use explicit names that describe the business rule, not temporary debugging terminology.
- Avoid magic thresholds. If a threshold is necessary, name it, document why it exists, and cover the boundary in tests.
- Delete obsolete temporary scripts/workflows after they have served their one-time purpose.
- Do not leave two competing implementations active after a migration.

## 9. Safety, rollback, and deployment

- Before risky edits, identify the last known-good behavior/commit or the working module being preserved.
- Prefer reversible commits with one logical purpose.
- Never delete working production behavior without a tested replacement.
- Verify version consistency before deployment.
- Verify CI status separately from deployment status.
- Verify the deployed app separately from repository HEAD when caching, queues, Pages, Workers, or CDN behavior can differ.
- If deployment infrastructure is failing, state that explicitly; do not compensate by changing application logic without evidence.

## 10. Communication standard

- Be concise and factual.
- State: root cause, exact change, tests actually run, and current deployment/runtime status.
- Do not claim capabilities, test results, deployments, commits, or runtime outcomes that were not verified.
- When a fix is incomplete, say exactly what remains incomplete.
- Do not repeatedly ask for confirmation when the user's requested action is already clear and safe to perform.

## 11. Definition of done

A task is done only when all applicable items are true:

- Root cause identified from evidence.
- Minimal production change applied.
- No unrelated working behavior changed.
- Regression coverage added or an equivalent reproducible verification performed.
- Relevant tests pass.
- Typecheck/build passes where applicable.
- Version is bumped and consistent for functional changes.
- Diagnostics/logging remain intact.
- Deployment is verified when deployment was required.
- The real user-facing behavior matches the requested outcome.

If any applicable item above is not verified, report the task as in progress rather than complete.
