# P3 PR Attention Router Backport Design

**Status:** Draft for owner review  
**Date:** 2026-10-04  
**Source implementation:** `/Users/davauj2/code/p3-solutions-group/p3sg-website`  
**Target repository:** `/Users/davauj2/code/sandbox/risk-based-pr-attention-routing`

## Purpose

Backport the reusable lessons from the first real PR Attention Router host into
the reference proof of concept. The result should make future frontend,
backend, and monorepo installations smaller, safer, and easier to validate
without coupling the router runtime to the optional Vite dashboard.

The design preserves the authority boundary in
[ADR-0001](../../adr/ADR-0001-route-attention-before-automation.md): the router
classifies required human attention and publishes notifications only. It may
not approve, merge, deploy, release, or modify pull-request source.

## Goals

- Make the persistent PR comment the single detailed classification record.
- Reduce email and Slack notifications to a stable three-line summary.
- Close known dependency, workflow-pinning, identity, and prompt-instruction
  trust gaps.
- Separate the reusable router runtime from the React/Vite dashboard.
- Move repository-specific deterministic policy into validated data.
- Make the workflow trust contract executable and portable between hosts.
- Preserve the POC as a working reference installation with LOW, MEDIUM, and
  HIGH end-to-end probes.

## Non-goals

- Publishing a package to npm or a private registry.
- Creating the final `packages/pr-attention-router` public API.
- Supporting fork PRs, bot-authored PRs, or autonomous approval.
- Copying P3 website-specific Stripe, Netlify, SEO, or operator-console policy.
- Changing application behavior or removing the dashboard.

## Chosen delivery approach

Use two pull requests.

1. **Security and lean notifications:** improve the existing layout first so
   urgent controls can be reviewed independently.
2. **Reusable package boundary:** move the non-UI runtime into
   `tools/pr-attention-router`, introduce host policy data and contract CLIs,
   and leave `apps/attention-router` as an optional dashboard.

A single migration would avoid short-lived file churn but would combine SMTP,
workflow trust, prompt isolation, package movement, policy behavior, and test
harness changes in one review. Publishing `packages/pr-attention-router` now
would define a public interface before the mobile and backend installations
have validated it.

## PR 1: Security and lean notifications

### Notification contract

The persistent PR comment remains the only detailed rendering of summary,
rationale, blast radius, review focus, and missing evidence. Email and Slack
render exactly:

```text
[HIGH] PR #42: test(harness): attention router HIGH probe
Reviewer: Tech Lead or relevant SME · Floor: HIGH
https://github.com/<owner>/<repo>/pull/42
```

`renderNotificationSummary(classification, pullRequest)` owns this format.
The email subject is its first line. The body is the full three-line summary.
Slack receives the same three lines. PR-title mentions are neutralized before
rendering, and normalized classification output no longer carries a duplicate
`notificationText` field.

Files changed:

- `apps/attention-router/src/router/renderClassification.ts`
- `apps/attention-router/src/notifications/emailNotification.ts`
- `apps/attention-router/src/notifications/slackNotification.ts`
- `apps/attention-router/scripts/normalizeClassification.ts`
- notification rendering, email, and Slack tests

### SMTP dependency

Upgrade `nodemailer` from 6.10.1 to the reviewed 10.x release while retaining
the existing `createTransport` and `sendMail` adapter boundary. Regenerate the
lockfile and verify the exact subject and body passed to the fake transport.

Files changed:

- `apps/attention-router/package.json`
- `apps/attention-router/package-lock.json`
- SMTP and email notification tests

### Trusted revision

Every trusted checkout uses:

```yaml
ref: ${{ github.workflow_sha }}
```

`github.workflow_sha` identifies the commit containing the executing workflow.
It expresses the invariant more directly than `main` or `github.sha`: every job
in one run uses the same trusted router and policy revision, independent of the
default branch name or later branch movement.

The PR checkout remains separate at `.par/target`, with
`persist-credentials: false`, and no shell command executes with that directory
as its working directory.

### Contributor policy

Replace the personal login allowlist with the reference POC policy:

- the PR head repository must equal the workflow repository;
- the PR author must have GitHub user type `User`;
- `repos.getCollaboratorPermissionLevel` must report `admin`, `maintain`, or
  `write`;
- the PR head SHA must still equal the SHA validated by the triggering run.

Fork and bot-authored PRs remain out of scope and fail closed. This is a
deliberate POC policy, not a universal default for adopting repositories.

### Validation conclusions

Treat `success` as `PASSED`. Treat `failure` and `timed_out` as `FAILED`, and
continue classification so the deterministic floor is at least MEDIUM.
Superseded or manually cancelled runs are not added in this phase because the
head-SHA race and duplicate-run behavior need separate evidence.

### Dependency installation

All retained `npm ci` commands use `--ignore-scripts`. PR 1 keeps installs that
the current `tsx` runtime requires. PR 2 removes those installs after native
TypeScript CLIs replace `tsx`; only the email job then installs production
runtime dependencies.

### Recipient confidentiality

GitHub displays ordinary step environment variables in logs and masks secret
values only. The existing documentation promise that recipient values never
appear is therefore incorrect.

Move these from repository variables to repository secrets:

- `PAR_EMAIL_FROM`
- `PAR_EMAIL_TO_TEAM`
- `PAR_EMAIL_TO_LEAD`

Keep `SMTP_HOST` and `SMTP_PORT` as variables. Update the workflow references,
runbook, installation guide, and acceptance criteria. Email must remain disabled
until the replacement secrets exist.

### Codex instruction isolation

The P3 wording that treats PR titles, bodies, diffs, and repository instruction
files as evidence is retained, but it is not considered a complete control.
Codex automatically discovers `AGENTS.md` between the repository root and its
working directory. Running directly in the untrusted PR checkout therefore
creates an instruction channel before the trusted prompt is evaluated.

Use two directories:

```text
.par/
  analysis/    # trusted Codex working directory, evidence, and prompt
  target/      # untrusted PR checkout, read-only inspection target
```

Codex runs with `safety-strategy: read-only` from `.par/analysis`. The trusted
prompt directs it to inspect only the diff in `../target`. Because its working
directory is not inside the PR checkout, PR-authored `AGENTS.md` files are not
on the working-directory instruction path. The PR contents remain untrusted
evidence.

This change requires a hosted Actions probe because the Codex action must be
shown to read the sibling checkout while remaining read-only.

## PR 2: Reusable router boundary

### Layout

Create:

```text
tools/pr-attention-router/
  cli/
    checkPolicy.ts
    checkWorkflow.ts
    collectPullRequestEvidence.ts
    normalizeClassification.ts
    sendAttentionEmail.ts
    sendAttentionSlack.ts
  lib/
    attention.ts
    checkWorkflowContract.ts
    classification-prompt.md
    classification.schema.json
    commentState.ts
    deterministicPolicy.ts
    emailNotification.ts
    enforceClassification.ts
    evaluateDeterministicFloor.ts
    loadPolicy.ts
    parseGitDiff.ts
    policyCases.ts
    publishAttentionComment.cjs
    readPrMaterialContext.cjs
    renderClassification.ts
    slackNotification.ts
    smtpEmailTransport.ts
  config/
    host-context.md
    policy-cases.json
    policy.json
  test/
  package.json
  package-lock.json
  tsconfig.json
  README.md
```

The package uses native TypeScript on Node 24, `node:test`, and `tsc`. It has no
React, Vite, jsdom, ESLint, Vitest, or `tsx` dependency. GitHub-script helpers
use `.cjs` so they continue to load when a host root declares
`"type": "module"`.

`apps/attention-router` remains the optional Vite dashboard. Workflow jobs do
not install, build, import, or execute it. Router-specific scripts, logic,
notifications, and tests move out; dashboard UI, sample data, CSS, and UI tests
remain.

### Host policy schema

`config/policy.json` is repository-owned data with schema version 1. It defines:

- named MEDIUM and HIGH path rules;
- one or more Unicode regular-expression sources per rule;
- rationale for each rule;
- production, non-production, and test file patterns;
- production-file and changed-line thresholds.

The loader rejects malformed JSON, unsupported versions, LOW path rules,
invalid or empty regex patterns, empty required strings, non-positive
thresholds, and duplicate rule IDs.

The reference POC policy encodes only this repository's rules:

- **HIGH:** workflows; router implementation and policy; classification prompt
  and schema; persistent-comment publisher; credential, security,
  authorization, persistence, database, and migration paths.
- **MEDIUM:** operational runbooks and ADRs; shared services and routing;
  dependency, build, and TypeScript configuration; large changes.
- **LOW eligibility:** localized presentation changes with passing validation,
  sufficient material context, and no higher signal.

P3 website rules do not enter the reference policy.

### Policy conformance cases

`config/policy-cases.json` supplies changed paths, expected floor, expected rule
IDs, and forbidden `notRules`. `checkPolicy.ts` evaluates every case under
otherwise clean evidence.

Cases cover:

- every MEDIUM and HIGH rule;
- workflow paths matching HIGH without also matching generic GitHub config;
- old and new names for renamed files;
- deleted test files establishing MEDIUM;
- LOW-eligible localized files;
- threshold boundaries.

### Deterministic engine

The engine receives a parsed policy rather than importing host path constants.
It evaluates every signal instead of returning on the first HIGH match. A HIGH
assessment must still report failed validation, missing or conflicting context,
deleted tests, and other reviewer-relevant evidence.

`DeterministicAssessment` adds `matchedRuleIds` for audit and conformance tests.
Rationale remains deduplicated when several patterns or evidence paths match.

### Stack-neutral prompt

The reusable prompt describes blast radius across users, pages, services, data,
and operators without mentioning One SEO. At runtime, the workflow combines it
with trusted `config/host-context.md`. Host context describes this POC and its
validation gaps; future hosts supply their own context.

### Executable workflow contract

Replace the current source-text permission test with `checkWorkflow.ts` backed
by `checkWorkflowContract.ts`. The contract requires:

- `workflow_run` as the only trigger;
- exactly `contents: read` at workflow scope;
- explicit permissions on every job;
- exactly one repository-writing job;
- only `issues: write` and `pull-requests: write` in that job;
- no write-capable job containing the PR checkout;
- `persist-credentials: false` on every checkout;
- trusted checkouts pinned to `github.workflow_sha`;
- PR checkout at `.par/target`;
- Codex read-only from `.par/analysis`;
- no shell execution in `.par/target`;
- no `${{ }}` interpolation inside shell script bodies;
- no job- or step-level secrets beside PR source, except the Codex API key
  supplied directly to the read-only Codex action.

The checker must test every claimed invariant. It must not claim that there is
one writer while merely checking for no more than one, and it must inspect job
environment blocks as well as individual steps.

## Data flow after both PRs

1. The host validation workflow completes for a PR SHA.
2. `workflow_run` loads the trusted attention workflow from the default branch.
3. Each job checks trusted router code out at `github.workflow_sha`.
4. Evidence checks the PR out separately at `.par/target`, authorizes its
   repository, human author, permission level, and exact SHA, then evaluates
   the host policy without executing PR code.
5. Classify places trusted evidence and prompt material in `.par/analysis`.
6. Codex performs read-only inspection from `.par/analysis`, treating the PR
   checkout as untrusted evidence and respecting the deterministic minimum.
7. Finalize validates AI output, enforces the floor, and renders the persistent
   comment plus the small notification summary.
8. Email and Slack independently deliver only when the tier changes.
9. Publish records delivery outcomes and creates or updates the detailed PR
   comment even when a notification channel fails.

## Error behavior

- Invalid policy or conformance data fails validation before rollout.
- Unauthorized, fork, bot-authored, or stale-SHA PRs fail before any provider
  secret is used.
- Invalid AI output fails closed; it cannot bypass floor enforcement.
- Email or Slack failure is visible but cannot block persistent comment
  publication.
- Missing notification configuration affects only its isolated delivery job.
- A malformed workflow fails `check:workflow` in normal repository validation.

## Validation strategy

PR 1 runs the existing application checks:

```bash
npm --prefix apps/attention-router run lint
npm --prefix apps/attention-router run test
npm --prefix apps/attention-router run typecheck
npm --prefix apps/attention-router run build
git diff --check
```

PR 2 additionally runs:

```bash
npm --prefix tools/pr-attention-router ci --ignore-scripts
npm --prefix tools/pr-attention-router run check
npm --prefix tools/pr-attention-router run check:policy
npm --prefix tools/pr-attention-router run check:workflow
```

After trusted workflow changes merge, disposable hosted-Ubuntu PRs validate:

- localized LOW;
- policy MEDIUM;
- workflow/policy HIGH;
- failed and timed-out validation;
- missing and conflicting material context;
- deleted tests;
- same-tier notification suppression;
- tier-change notification delivery;
- SMTP and Slack failure isolation;
- persistent comment creation and update;
- Codex sibling-checkout inspection from `.par/analysis`.

## Rollout and rollback

Keep `PAR_APP_WORKFLOWS_ENABLED=false` while each trusted workflow change is
being merged. Enable comment-only classification first, then Slack and email
one channel at a time. Email stays disabled until recipient secrets replace the
existing variables.

Rollback is controlled by setting all enablement variables to `false`. PR 1 can
be reverted independently. PR 2 can restore workflow commands to the app layout
without changing application source because the dashboard and router remain
separate throughout the migration.

## Future package extraction

The `tools/` boundary is the validated copy-in form, not the final distribution
form. After the mobile and backend installations, compare their adapters and
promote only proven common interfaces into `packages/pr-attention-router`.

A workspace package may continue using native TypeScript because Node resolves
the workspace symlink to source outside `node_modules`. A published package must
ship compiled JavaScript. Future candidates include CLI `bin` mappings, a small
`lib/index.ts` public API, exported `.cjs` helpers and prompt/schema assets, and
a reusable `workflow_call` workflow. Private registry credentials must never be
present in a job that also contains the PR checkout.

## Source implementation differences

The P3 implementation is evidence that the architecture works, but this design
intentionally changes four details before backporting:

1. Use `github.workflow_sha`, not `github.sha`, for trusted checkouts.
2. Run Codex from `.par/analysis`, not the untrusted `.par/target` checkout.
3. Strengthen the workflow checker to require exactly one narrowly scoped writer
   and inspect job-level secrets.
4. Supply a reference-POC policy and host context rather than copying P3 rules.
