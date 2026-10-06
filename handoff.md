# Session Handoff — 2026-10-06

## Start here

Repository:
`/Users/davauj2/code/sandbox/risk-based-pr-attention-routing`

Read these files before changing the router or its workflow:

1. [`AGENTS.md`](AGENTS.md)
2. [`ADR-0001`](docs/adr/ADR-0001-route-attention-before-automation.md)
3. [`ADR-0002`](docs/adr/ADR-0002-keep-the-router-lean-and-host-defined.md)
4. [`rules.json`](config/pr-attention-router/rules.json)
5. [`rubric.md`](config/pr-attention-router/rubric.md)
6. [`pr-attention-review.yml`](.github/workflows/pr-attention-review.yml)
7. [`pr-attention-notification.md`](docs/runbooks/pr-attention-notification.md)
8. [`acceptance results`](docs/runbooks/2026-10-05-attention-routing-acceptance-results.md)

## Current repository state

- Default branch: `main`.
- Latest completed baseline before this handoff: `fc2a2e8`,
  `docs: add attention routing acceptance results (#20)`.
- The reusable router is isolated in `packages/pr-attention-router`.
- Host-owned path floors and semantic tier definitions are isolated in
  `config/pr-attention-router/rules.json` and `rubric.md`.
- `apps/par-dashboard` is an optional reference client. It contains no routing
  policy or GitHub notification plumbing.
- The dashboard public assets include the acceptance-test smtp4dev and Slack
  screenshots used by the demo report.

Three disposable acceptance pull requests remain open and must not be merged:

- [PR #17 — LOW](https://github.com/jdavault/risk-based-pr-attention-routing/pull/17)
- [PR #18 — MEDIUM](https://github.com/jdavault/risk-based-pr-attention-routing/pull/18)
- [PR #19 — HIGH](https://github.com/jdavault/risk-based-pr-attention-routing/pull/19)

Their results are preserved in the acceptance report, so they can be closed
without merging when the owner is ready.

## Architecture and authority boundary

The system has one simple contract:

> Deterministic rules establish a minimum tier, Codex applies the repository
> rubric and may raise that tier, and the higher tier wins.

- `rules.json` asks **where the change occurred** and guarantees known path
  floors plus the retained failed-validation and 250-line signals.
- `rubric.md` asks **what the change actually does** and defines repository-
  specific LOW, MEDIUM, and HIGH semantics.
- Codex can add caution but cannot lower a deterministic floor.
- The router classifies and notifies only. It never approves, merges, deploys,
  releases, or changes pull-request source.
- The detailed explanation belongs in one persistent PR comment. Email and
  Slack intentionally receive only the tier/title, reviewer/floor, and PR URL.
- Notifications occur only for the first result or a tier change.

## Workflow

The landed GitHub Actions graph is:

```text
Collect trusted evidence
  -> Classify with Codex
  -> Finalize attention result
  -> Notify email + Notify Slack
  -> Publish attention result
```

Important properties:

- `workflow_run` loads the workflow, router, and config from the trusted
  default-branch commit.
- Pull-request source is checked out separately under `.par/target`, and the
  workflow does not install its dependencies or run its package scripts.
  Codex still inspects that untrusted checkout and can run processes; its
  current `read-only` safety strategy prevents source mutation but is not a
  complete credential sandbox.
- Every job receives only the permissions and credentials it needs.
- Notification failures are independently visible but do not block the
  canonical PR comment.
- An `issues: write`-only token produced a live
  `403 Resource not accessible by integration`; restoring
  `pull-requests: write` alongside `issues: write` fixed PR comment
  publication. Keep this proven pair unless a separate least-privilege test
  demonstrates that one permission can be removed.
- Plain unauthenticated SMTP uses Python `smtplib` in the runner so the router
  package remains dependency-free. If authentication, TLS policy, templates,
  attachments, or retries become requirements, replace it with an approved
  Node/Nodemailer adapter.

The sandbox workflow was compared with the committed P3 workflow at
`e9fb221`. Their only differences are the host validation workflow name
(`Validate repository` versus `verify`) and the runbook path. Re-run the diff
whenever either workflow changes; do not rely on an uncommitted P3 checkout as
a durable reference.

## Verified behavior

Hosted Ubuntu validation and the six-stage attention workflow passed for all
three acceptance probes:

| Probe | Deterministic floor | Codex judgment | Final tier |
| --- | --- | --- | --- |
| PR #17, component-local `TierCard.tsx` comment | LOW | LOW | LOW |
| PR #18, shared `App.tsx` shell comment | MEDIUM | MEDIUM | MEDIUM |
| PR #19, workflow comment | HIGH | HIGH | HIGH |

For each probe, evidence collection, Codex classification, finalization,
email, Slack, and persistent comment publication succeeded. See the
[`acceptance report`](docs/runbooks/2026-10-05-attention-routing-acceptance-results.md)
for exact rationale and screenshots.

Local validation commands:

```bash
npm run check
git diff --check
```

## Repository variables and external services

- `PAR_APP_WORKFLOWS_ENABLED`, `PAR_EMAIL_ENABLED`, and `PAR_SLACK_ENABLED`
  were intentionally kept enabled for acceptance testing.
- `OPENAI_API_KEY` and `SLACK_BOT_TOKEN` remain GitHub repository secrets and
  must never be copied into source.
- smtp4dev email delivery uses an ngrok TCP tunnel. The assigned TCP hostname
  and port can change whenever ngrok restarts; refresh the GitHub `SMTP_HOST`
  and `SMTP_PORT` variables before another live email test.
- The smtp4dev browser UI is separate from its SMTP TCP endpoint.

## Known issues and cautions

- **Security follow-up required before broader adoption:** the classify job
  supplies `OPENAI_API_KEY` to `openai/codex-action@v1.8` while using
  `safety-strategy: read-only`. The action's official security guidance says
  read-only access does not protect the key on GitHub-hosted runners with
  passwordless sudo and recommends `drop-sudo` or `unprivileged-user`. Do not
  describe the current checkout as non-executable or fully sandboxed. Review
  and test one of those supported strategies before carrying this workflow
  into another repository.
- GitHub reports that an upstream action still targets the deprecated Node 20
  runtime and is being forced to Node 24. Repository jobs themselves use Node
  24; monitor upstream action releases.
- The demo screenshots intentionally contain a personal email address, Slack
  workspace identities, and the test ngrok hostname. Redact or replace them
  before using the repository or screenshots outside the intended demo.
- The workflow contains personal-sandbox contributor restrictions. Adopting
  repositories must replace them with their approved contributor/fork policy.
- The SMTP adapter is deliberately plain and unauthenticated for this POC.
- A process on port 5157 belongs to the P3 website checkout, not this
  repository, so it was left running during this closeout.

## Recommended next session

1. Confirm the acceptance evidence is sufficient, then close PRs #17–#19
   without merging.
2. Before installing the router elsewhere, reconcile ADR-0001's enumerated
   isolated-repository boundary with the owner. Record an approved amendment
   or new ADR; until then, limit SmartBites work to read-only inspection and
   design.
3. After that approval, use the installation contract to add the lean router
   to the SmartBites mobile repository:
   `/Users/davauj2/code/smartbites-solutions/apps/smartbites-mobile-v2`.
4. Inspect that repository before writing rules or its rubric. Do not copy
   sandbox/P3 rules for capabilities or paths SmartBites does not have.
5. Preserve the split: package code answers how routing works; host rules and
   rubric define where and what risk means for that repository.
6. Run harmless LOW, MEDIUM, and HIGH acceptance PRs before adapting the
   pattern to work repositories.

## Restart prompt

Copy the following into a new conversation:

```text
Continue the PR Attention Router work in:
/Users/davauj2/code/sandbox/risk-based-pr-attention-routing

Start by reading AGENTS.md and handoff.md completely, then verify the current
branch, git status, latest main commit, open pull requests, and hosted workflow
state. Do not use a worktree for single-agent sequential work.

The lean router baseline is complete and validated. The package lives in
packages/pr-attention-router; host rules and tier definitions live in
config/pr-attention-router; apps/par-dashboard is only a reference client.
The explicit workflow stages and LOW/MEDIUM/HIGH acceptance results are
documented in handoff.md.

First, confirm whether I want you to close disposable acceptance PRs #17,
#18, and #19 without merging. Then review ADR-0001's isolated-repository
boundary with me. Do not install or run the router in SmartBites unless I
approve an ADR amendment or new ADR; read-only inspection and design are okay.
The intended next portability target, after that approval, is:
/Users/davauj2/code/smartbites-solutions/apps/smartbites-mobile-v2

Before changing SmartBites, inspect its actual capabilities, paths, validation
workflow, permissions, and secrets. Design repository-specific rules.json and
rubric.md rather than copying P3 or sandbox policy blindly. Preserve the
classification-only authority boundary: deterministic floor, Codex may raise,
the higher tier wins, and humans retain every approval and merge decision.

Also address the known Codex-action security follow-up before broader
adoption: the current `read-only` strategy does not protect OPENAI_API_KEY on
GitHub-hosted runners with passwordless sudo. Evaluate and test the action's
supported `drop-sudo` or `unprivileged-user` strategy.
```
