# Session Log

## 2026-10-04 — Hosted PR Attention Router POC

### What was built

- Completed the Vite and TypeScript attention-router POC with deterministic
  `LOW`, `MEDIUM`, and `HIGH` classification, Codex judgment, deterministic
  floor enforcement, a persistent PR comment, SMTP email, and Slack bot
  notifications.
- Moved application workflows to GitHub-hosted `ubuntu-24.04` runners while
  retaining the local runner smoke test.
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
- The current POC colocates router runtime and UI under
  `apps/attention-router`; the intended future boundary is
  `packages/pr-attention-router` with repository-specific policy configuration.
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
- The router runtime is not yet extracted from the Vite package, so a current
  copy-in installation carries unnecessary React/Vite dependencies.
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
