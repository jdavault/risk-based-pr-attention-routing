# Session Log

## 2026-10-06 — Lean workflow acceptance and demo closeout

### What was built

- Simplified the router to the lean, application-independent package contract
  in `packages/pr-attention-router` with host-owned `rules.json` and
  `rubric.md`.
- Restored the explicit six-stage GitHub Actions graph without adding router
  machinery: evidence, Codex classification, finalization, parallel email and
  Slack notification, and persistent comment publication.
- Added a demo-ready acceptance report with the deterministic and AI rationale
  for LOW, MEDIUM, and HIGH probes plus smtp4dev and Slack screenshots.

### Verified behavior

- PR #17 finished LOW from a component-local `TierCard.tsx` comment.
- PR #18 finished MEDIUM from the shared dashboard `App.tsx` path.
- PR #19 finished HIGH from the workflow path.
- All six workflow stages passed for all three probes, including email, Slack,
  and PR comment publication.
- PR #20, the acceptance report, received the expected operational-guidance
  MEDIUM floor and was squash-merged.
- The sandbox workflow was compared with committed P3 workflow `e9fb221`;
  only the host validation name and runbook path differ.

### Technical decisions

- Keep detailed rationale in the persistent PR comment and keep email and
  Slack deliberately thin and change-only.
- Preserve the proven `issues: write` plus `pull-requests: write` pair for PR
  comment publication: `issues: write` alone produced a live 403, and adding
  `pull-requests: write` fixed it. The inverse combination was not tested.
- Keep plain unauthenticated SMTP in runner-native Python for the POC. Move to
  an approved Node/Nodemailer adapter only when richer mail requirements exist.
- Keep deterministic rules as a defensible subset of the semantic rubric.

### Issues, debt, and parked work

- PRs #17, #18, and #19 are disposable acceptance probes and remain open;
  close them without merging after owner confirmation.
- An upstream JavaScript action still produces a Node 20 deprecation warning
  while GitHub forces it to Node 24.
- `openai/codex-action@v1.8` currently receives `OPENAI_API_KEY` with
  `safety-strategy: read-only`; its official guidance says GitHub-hosted
  passwordless sudo can expose the key. Test `drop-sudo` or
  `unprivileged-user` before broader adoption.
- Demo screenshots expose personal sandbox identities and the ngrok test host;
  redact them before broader distribution.
- SmartBites mobile is the intended next portability exercise, but ADR-0001's
  repository boundary must be amended or superseded with owner approval before
  installation or live execution there.

### Repository state at closeout

- Stable baseline on `main`: `fc2a2e8` before this handoff.
- PRs #15, #16, and #20 are squash-merged.
- Email, Slack, and application workflows remain enabled for the POC.
- Full next-session context is in [`handoff.md`](handoff.md).

## 2026-10-04 — Application-independent router extraction

- Branch: `refactor/extract-pr-attention-router`; PR #11.
- Extracted reusable routing into `packages/pr-attention-router` with no
  React, Vite, DOM, or host-path knowledge.
- Moved repository policy, conformance cases, and Codex context to
  `config/pr-attention-router`.
- Renamed the optional UI client to `apps/par-dashboard`; it imports only
  public package types and the comment renderer.
- Aligned the attention workflow with P3's stronger trust model: immutable
  trusted checkout, separate read-only PR checkout, Node 24 native TypeScript,
  package-owned helpers/prompt/schema, and dependency installation only in the
  email job.
- Split hosted validation into authorization/whitespace, isolated router, and
  dashboard jobs.
- V1 policy remains 3 HIGH rules, 5 MEDIUM rules, and 12 conformance cases;
  no target exception is required.
- Local verification: 64 package tests, 12/12 policy cases, workflow contract,
  dashboard lint/typecheck/4 tests/build, YAML parse, and `git diff --check`.
- `PAR_APP_WORKFLOWS_ENABLED` was enabled for PR #11; email and Slack remain
  disabled for the first hosted validation.
- The rewritten `workflow_run` orchestration must be acceptance-tested after
  merge because GitHub loads it from the default branch.

## 2026-10-04 — Hosted PR Attention Router POC

### What was built

- Completed the Vite and TypeScript attention-router POC with deterministic
  `LOW`, `MEDIUM`, and `HIGH` classification, Codex judgment, deterministic
  floor enforcement, a persistent PR comment, SMTP email, and Slack bot
  notifications.
- Moved application workflows to GitHub-hosted `ubuntu-24.04` runners. The
  then-retained local smoke workflow was removed during package extraction.
- Added deterministic `MEDIUM` handling for operational runbooks and ensured
  failed validation still produces a classification.
- Added structured PR material context:
  `Material context: SUFFICIENT | CONFLICTING`; missing or conflicting context
  cannot result in a final `LOW` classification.
- Fixed persistent PR comment publication by granting the publish job explicit
  `issues: write` and `pull-requests: write` permissions.
- Upgraded repository-controlled JavaScript actions to Node 24 runtimes:
  `actions/checkout@v7`, `actions/setup-node@v7`, and
  `actions/github-script@v8`.
- Added smtp4dev/ngrok and POC pause/resume procedures to the notification and
  local-runner runbooks.
- Reconciled the README and added the dashboard screenshot.
- Added the frontend/backend installation guide at
  `docs/setup/pr-attention-router-installation.md`.

### Verified behavior

- Hosted validation passes on `ubuntu-24.04`.
- Codex classification completes through `openai/codex-action@v1.8` using a
  read-only safety strategy.
- A localized UI-copy PR produced `LOW` with the expected rationale.
- Workflow/action changes produced deterministic `HIGH`.
- The installation-guide PR produced deterministic `MEDIUM` because its size
  exceeded the 250-line threshold; Codex retained the floor and added
  operational-risk rationale.
- Email traveled from GitHub Actions through an ngrok TCP endpoint to smtp4dev.
- Slack delivery through a bot token and `chat.postMessage` succeeded.
- The persistent PR comment is created or updated successfully.
- Re-running a PR at the same tier updates the comment while skipping duplicate
  email and Slack delivery.
- Email or Slack job failure cannot prevent the final persistent comment job
  from running when finalization succeeds.

### Technical decisions

- V1 classifies and notifies only; humans retain approval, merge, deployment,
  and release authority.
- Deterministic rules establish a binding minimum; AI may raise but never lower
  the tier.
- Trusted workflow and router code comes from the default branch. PR source is
  checked out separately under `.par/target` for read-only inspection.
- The Vite dashboard is a reference UI and test harness, not a dependency of an
  adopting frontend or backend application.
- At that checkpoint the POC colocated router runtime and UI under the former
  `apps/attention-router`; PR #11 later implemented the intended
  `packages/pr-attention-router` and `config/pr-attention-router` boundary.
- Existing application validation should be reused where possible. Disabling
  the router must not disable an adopting repository's normal required checks.
- Slack uses a bot token, not an incoming webhook. Email currently uses plain,
  unauthenticated SMTP for the POC.

### Issues and debt

- `openai/codex-action@v1.8` internally uses a pinned Node 20-based
  `actions/setup-node`; GitHub forces it to Node 24 and emits an upstream-owned
  warning.
- npm reports the installed ESLint `9.39.5` as deprecated/unsupported in the
  current environment; application checks still pass.
- Resolved in PR #11: the router package is independently installable and the
  renamed `apps/par-dashboard` is an optional client.
- The workflow contains personal-sandbox `jdavault` actor/author allowlists.
  Every adopting repository must replace these with an approved contributor
  and fork policy rather than simply deleting them.
- The SMTP adapter does not yet support authentication or TLS configuration.
- smtp4dev/ngrok is a public test transport. The ngrok TCP hostname and port are
  dynamic unless a reserved address is configured and must never be committed.

### Parked ideas

- Extract `packages/pr-attention-router` after the copy-in contract is validated
  in a frontend and backend repository.
- Evaluate an internal package or reusable workflow only after the rubric and
  trusted-code boundary are stable.
- Add authenticated/TLS SMTP as a separate adapter when required by a target
  environment.
- Revisit any authority beyond classification and notification only through a
  new ADR.

### Repository state at closeout

- PRs #6 through #9 are squash-merged.
- PR #10 contains the installation guide and this session handoff; it must pass
  validation and be squash-merged before the session is fully closed.
- PR #4 was a disposable LOW-path test and can be closed without merging after
  its result is recorded.
- The intended stopped state is
  `PAR_APP_WORKFLOWS_ENABLED=false`, `PAR_EMAIL_ENABLED=false`, and
  `PAR_SLACK_ENABLED=false`.

### Next work

Use `docs/handoffs/2026-10-04-claude-integration-handoff.md` to install and
compare the router in:

- `/Users/davauj2/code/p3-solutions-group/p3sg-website`
- `/Users/davauj2/code/smartbites-solutions/apps/smartbites-mobile-v2`

The purpose is to learn and validate the portable installation contract before
adapting the approach to work repositories.
