# Install the PR Attention Router

## Purpose

This guide explains how to add the PR Attention Router to an existing
frontend or backend repository. The router classifies the human attention a
pull request requires as `LOW`, `MEDIUM`, or `HIGH`, publishes a persistent PR
comment, and can send change-only email and Slack notifications.

The router classifies and notifies only. It does not approve, merge, deploy,
release, or modify pull-request source. Read
[ADR-0001](../adr/ADR-0001-route-attention-before-automation.md) before
changing that authority boundary.

## Architecture boundary

The host application and the attention router have different responsibilities:

```text
Host repository
  |
  +-- application source (React, NestJS, or another stack)
  +-- application validation workflow
  |     |
  |     +-- reports PASSED or FAILED
  |
  +-- PR Attention Router
        +-- deterministic policy
        +-- bounded evidence collector
        +-- Codex classification prompt and schema
        +-- deterministic-floor enforcement
        +-- persistent PR comment
        +-- optional email and Slack adapters

Optional POC dashboard
  +-- visualizes sample classifications
  +-- is not required in an adopting repository
```

The router consumes the result of application validation, but it does not need
to know whether the host is React, NestJS, or another implementation. The host
owns its build and test commands. The router owns evidence collection,
classification, floor enforcement, and notification behavior.

## Current POC layout versus intended layout

### Current POC

The Vite dashboard is a reference UI and test harness. GitHub Actions never
starts it. However, the router CLI, policy modules, tests, and notification
adapters currently live under `apps/attention-router`, so the workflow runs:

```bash
npm ci --prefix apps/attention-router
```

and invokes TypeScript entry points from
`apps/attention-router/scripts`. An installation that preserves the current
paths must therefore copy the package metadata and router runtime from that
directory even though it does not need the Vite components.

The lowest-risk POC installation is to copy `apps/attention-router` unchanged
and leave its UI unused. A hand-trimmed copy can contain only the runtime below,
but that smaller layout is not yet the supported package boundary and must be
validated independently. Because the current `package.json` and lockfile also
describe the dashboard, `npm ci` installs React and Vite dependencies that the
workflow does not use. This accidental dependency is the primary reason for
the future package extraction.

The current runtime is:

```text
apps/attention-router/
  package.json
  package-lock.json
  scripts/
    collectPullRequestEvidence.ts
    normalizeClassification.ts
    sendAttentionEmail.ts          # optional email adapter
    sendAttentionSlack.ts          # optional Slack adapter
  src/domain/
    attention.ts
  src/router/
    enforceClassification.ts
    evaluateDeterministicFloor.ts
    parseGitDiff.ts
    renderClassification.ts
  src/notifications/               # optional delivery adapters
    emailNotification.ts
    slackNotification.ts
    smtpEmailTransport.ts
```

Keep the corresponding router and notification unit tests when copying this
code. The files under `src/components`, `src/data`, `public`, `App.tsx`, and
the Vite entry point are dashboard code and are not required by an adopting
application.

### Future state: `packages/pr-attention-router`

The intended reusable boundary is a standalone package:

```text
packages/pr-attention-router/
  package.json
  src/
    domain/
    policy/
    evidence/
    classification/
    notifications/
  bin/
    collect-evidence
    normalize-classification
    send-email
    send-slack
  test/
```

In that state:

- workflows install and invoke `packages/pr-attention-router`;
- the package has no React, Vite, DOM, or host-application dependency;
- repository-specific path rules live in a small configuration module rather
  than in the reusable package core;
- the dashboard consumes the package as a client and remains optional;
- One SEO and One Market can use the same package with different validation
  commands and deterministic path configuration;
- the package can begin as a copied workspace package and later move to an
  approved internal registry or reusable-workflow repository.

Do not publish or centralize the package until the POC rubric and trust
boundary have been validated in isolated repositories.

## Prerequisites

- GitHub Actions is enabled for the adopting repository.
- Trusted workflow code is present on the default branch before testing a PR.
- The selected runner supports the Node 24-based official actions used by the
  workflows. `actions/github-script@v8` requires Actions Runner `v2.327.1` or
  newer; GitHub-hosted `ubuntu-24.04` satisfies this requirement.
- Node.js 22 and npm are available for the current TypeScript router package.
- The runner can reach GitHub, npm, and the configured classification and
  notification services.
- A repository owner has approved the identity, fork, secret, and notification
  policies described below.

## Installation inventory

The following files are part of the router installation today.

| Area | Files | Required |
| --- | --- | --- |
| Validation adapter | `.github/workflows/validate.yml` or an existing required-check workflow named in the attention trigger | Yes |
| Router orchestration | `.github/workflows/pr-attention-review.yml` | Yes |
| Classification contract | `.github/attention-router/classification-prompt.md`, `.github/attention-router/classification.schema.json` | Yes |
| Trusted GitHub helpers | `.github/scripts/read-pr-material-context.js`, `.github/scripts/publish-attention.comment.js` | Yes |
| PR context field | The `Material context:` entry from `.github/pull_request_template.md` | Yes |
| Router runtime | The non-UI files listed in the current POC layout above | Yes |
| Runtime lockfile | `apps/attention-router/package.json` and `package-lock.json` until extraction | Yes |
| Email adapter | Email script, email modules, `nodemailer`, and SMTP configuration | Optional |
| Slack adapter | Slack script/module and Slack bot configuration | Optional |
| Dashboard | Vite configuration, React components, sample data, CSS, and public assets | No |
| Local runner smoke test | `.github/workflows/runner-smoke-test.yml` | No; diagnostic only |

The workflow checks trusted router code out from `main` and checks the PR into
`.par/target` for read-only inspection. Preserve this separation. Do not run
router implementation code taken from the untrusted PR checkout.

## Host validation contract

The current attention workflow listens for completion of a workflow whose
exact name is `Validate repository`:

```yaml
on:
  workflow_run:
    workflows: [Validate repository]
    types: [completed]
```

An adopting repository may reuse an existing validation workflow instead.
Set `workflows: [...]` to that workflow's exact top-level `name`; do not add a
second build pipeline merely to preserve the POC name. When several workflows
must pass, prefer a single trusted validation workflow or aggregator whose
conclusion represents the required validation contract.

The validation workflow must:

1. run for pull requests targeting `main`;
2. finish with `success` or `failure` rather than hiding failures;
3. validate the PR head SHA that the attention workflow later inspects;
4. use explicit least-privilege permissions;
5. avoid exposing secrets to untrusted pull-request code.

A passing result supplies `PASSED`; a failing result supplies `FAILED` and
establishes at least a deterministic `MEDIUM` floor. The attention workflow
must therefore run after both successful and failed validation.

### React frontend example

Replace paths and commands with the frontend repository's actual contract:

```yaml
- name: Install dependencies
  run: npm ci

- name: Lint
  run: npm run lint

- name: Type-check
  run: npm run typecheck

- name: Test
  run: npm test -- --run

- name: Build
  run: npm run build
```

Frontend deterministic policy should identify paths with broad page or user
impact, including shared routing, authentication, analytics, metadata,
indexability, shared API clients, build configuration, and design-system
contracts.

### NestJS backend example

Replace commands with the backend repository's actual scripts and test
strategy:

```yaml
- name: Install dependencies
  run: npm ci

- name: Lint
  run: npm run lint

- name: Type-check and build
  run: npm run build

- name: Unit tests
  run: npm test -- --runInBand

- name: Integration tests
  run: npm run test:e2e
```

Backend deterministic policy should identify authorization, persistence,
schema and migration, public API, event contract, queue, shared domain,
production configuration, and destructive-operation paths. A database or API
contract change will often justify a `HIGH` floor even when its diff is small.

The examples are adapters, not mandatory command names. The installation is
correct when the host repository's existing required checks are represented
without weakening them.

## Repository-specific policy

Review `evaluateDeterministicFloor.ts` before enabling the workflow. Its path
rules are repository policy, not universal framework defaults.

At minimum, define and test:

- paths that always establish `HIGH`;
- paths that establish at least `MEDIUM`;
- the maximum scope that may remain `LOW`;
- behavior when validation fails;
- behavior when `Material context` is `MISSING` or `CONFLICTING`;
- reviewer type for each tier;
- operational runbook treatment.

Codex may raise a tier, but `enforceClassification.ts` must never allow it to
lower the deterministic floor.

## PR template

Add an explicit material-context field to the adopting repository's PR
template:

```markdown
## Intent

Describe what changes and why.

## Risk context

Describe probability, impact, detectability, and blast radius.

Material context: <!-- Replace with SUFFICIENT or CONFLICTING -->

## Validation

List the checks performed and any missing evidence.
```

`SUFFICIENT` means the PR contains enough reliable context to assess intent
and risk. `CONFLICTING` means the supplied intent or evidence disagrees with
the change. An absent or unrecognized field is `MISSING`. Missing or
conflicting material context cannot produce a final `LOW` classification.

## Identity and trust policy

The POC workflow currently contains explicit `jdavault` actor and PR-author
checks. These are personal-sandbox controls, not reusable defaults. Before
installing elsewhere, replace them with the approved repository policy, such
as:

- same-repository PRs only during the initial rollout;
- an explicit allowlist of trusted test accounts; or
- an organization-approved contributor and fork policy.

Do not simply delete these checks when moving to a repository that can receive
fork PRs. Decide how untrusted contributions are validated without exposing
write-capable tokens or provider secrets. The `workflow_run` workflow must
continue to execute trusted code from the default branch.

## GitHub Actions permissions

Keep permissions at job scope where practical. The current minimum contract
is:

| Job | Permissions |
| --- | --- |
| Workflow default | `contents: read` |
| Evidence | `contents: read`, `pull-requests: read` |
| Codex classification | `contents: read` |
| Finalize | `contents: read`, `issues: read`, `pull-requests: read` |
| Email | `contents: read` |
| Slack | `contents: read` |
| Publish comment | `contents: read`, `issues: write`, `pull-requests: write` |

Do not enable broad repository write permissions. The only repository write
in V1 is creation or update of the persistent classification comment.

## Secrets and variables

Configure values under **Settings -> Secrets and variables -> Actions**.

### Required secret

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `OPENAI_API_KEY` | Read-only Codex classification through `openai/codex-action` |

Use a scoped POC key and rotate or delete it when the evaluation ends. Never
place it in source, workflow YAML, a PR body, or logs.

### Control variables

| Kind | Name | Initial value | Purpose |
| --- | --- | --- | --- |
| Variable | `PAR_APP_WORKFLOWS_ENABLED` | `false` | Enables the attention workflow and the bundled POC validation workflow |
| Variable | `PAR_EMAIL_ENABLED` | `false` | Enables change-only email delivery |
| Variable | `PAR_SLACK_ENABLED` | `false` | Enables change-only Slack delivery |

Enable the application workflow first with both notification channels off.
This permits classification and persistent-comment testing without sending
messages.

If the adopting repository reuses its existing required-check workflow, do
not place that workflow behind `PAR_APP_WORKFLOWS_ENABLED`; normal application
validation must continue when the router is disabled. Use the variable only
as the attention-workflow gate in that installation.

### Optional email variables

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `SMTP_HOST` | SMTP host reachable from the selected runner |
| Variable | `SMTP_PORT` | SMTP port, currently plain SMTP such as `25` |
| Variable | `PAR_EMAIL_FROM` | Sender address |
| Variable | `PAR_EMAIL_TO_TEAM` | Comma-delimited LOW and MEDIUM recipients |
| Variable | `PAR_EMAIL_TO_LEAD` | Comma-delimited HIGH recipients |

`PAR_EMAIL_FROM` controls the message sender. LOW and MEDIUM select
`PAR_EMAIL_TO_TEAM`; HIGH selects `PAR_EMAIL_TO_LEAD`. It is valid for both
recipient variables to contain the same test address during the POC.

When `SMTP_HOST` points through ngrok to smtp4dev, smtp4dev captures the
message instead of relaying it to the domain in the `To` header. When the same
adapter points to a real work SMTP relay, the selected recipient addresses are
the delivery destinations.

The current POC adapter supports unauthenticated SMTP and does not define SMTP
username, password, or TLS configuration. Treat authenticated or TLS SMTP as
a separate adapter change rather than inventing unused variables. See the
[notification runbook](../runbooks/pr-attention-notification.md).

### Optional Slack configuration

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `SLACK_BOT_TOKEN` | Bot OAuth token with `chat:write` |
| Variable | `PAR_SLACK_CHANNEL_ID` | Destination channel ID; the bot must already be a member |

The router uses Slack Web API `chat.postMessage`, not an incoming webhook.

## Installation sequence

1. Create an isolated integration branch in the adopting repository.
2. Copy the required workflow, policy, helper, PR-template, and runtime files.
3. Preserve the current paths initially, or update every workflow command if
   the router runtime is placed elsewhere.
4. Replace hard-coded `main` references if the adopting repository uses a
   different protected default branch.
5. Replace the personal POC identity checks with the approved repository trust
   policy.
6. Adapt `Validate repository` to the host's real required checks, or point
   the attention workflow at the host's existing validation workflow.
7. Review and test the host-specific deterministic path rules.
8. Add `OPENAI_API_KEY`; keep all three enablement variables `false`.
9. Merge the trusted router and workflow files to the default branch. The
   `workflow_run` workflow is loaded from the default branch.
10. Set `PAR_APP_WORKFLOWS_ENABLED=true`, leaving email and Slack disabled.
11. Run the classification test matrix below and verify the persistent comment.
12. Configure and intentionally test one notification channel at a time.
13. Keep the router in classification-only mode while evaluating results.

## Acceptance test matrix

Use harmless, disposable PRs. Record the deterministic floor, final tier,
rationale, requested reviewer, comment behavior, and notification behavior.

| Test | Suggested change | Expected result |
| --- | --- | --- |
| LOW | Localized copy or isolated presentation change with `Material context: SUFFICIENT` and passing validation | Deterministic LOW; Codex may raise but cannot lower |
| MEDIUM | A repository-defined shared module or operational runbook change | Deterministic floor of at least MEDIUM |
| Context escalation | Repeat a LOW candidate with `Material context: CONFLICTING` | Final tier cannot remain LOW |
| Validation escalation | Intentionally fail a harmless validation check | Classification still runs; deterministic floor is at least MEDIUM |
| HIGH | Harmless comment-only change to the attention workflow | Deterministic HIGH and Tech Lead or SME reviewer |
| Same-tier update | Push another commit that remains in the same tier | Persistent comment updates; email and Slack do not resend |
| Tier change | Change the test PR so its final tier changes | Persistent comment updates; enabled channels send once |
| Delivery failure | Disable the test SMTP service or use an invalid Slack destination | Delivery job reports failure; persistent comment still publishes |

For each test, verify that the inspected SHA matches the validated SHA and that
workflow logs contain no credentials, recipient lists, or message bodies.

## Rollout and rollback

Recommended rollout order:

1. comment-only in an isolated repository;
2. email or Slack to a test destination;
3. both notification adapters with a limited contributor policy;
4. installation in isolated One SEO and One Market validation repositories;
5. production-repository consideration only after rubric results are reviewed.

To stop processing immediately, set `PAR_APP_WORKFLOWS_ENABLED=false`. To stop
delivery without disabling classification, set `PAR_EMAIL_ENABLED=false` and
`PAR_SLACK_ENABLED=false`.

To uninstall, disable the variables first, then remove the attention workflow,
policy assets, trusted helper scripts, router runtime, and router-only secrets
and variables. Removing the router does not require changing application
source when the architecture boundary has been preserved.

## Installation validation worksheet

Complete this for each adopting repository.

| Decision | One SEO frontend | One Market backend |
| --- | --- | --- |
| Validation commands | Record actual commands | Record actual commands |
| Same-repository/fork policy | Record approved policy | Record approved policy |
| Deterministic MEDIUM paths | Record reviewed paths | Record reviewed paths |
| Deterministic HIGH paths | Record reviewed paths | Record reviewed paths |
| LOW scope | Record allowed change types | Record allowed change types |
| Required reviewers | Record team mapping | Record team mapping |
| Email destination | Record test/approved target | Record test/approved target |
| Slack destination | Record test/approved channel | Record test/approved channel |
| Rollback owner | Record owner | Record owner |

Differences in this worksheet should normally be repository configuration,
not forks of the core classification and floor-enforcement implementation.
