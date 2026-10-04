# Application-Independent PR Attention Router Design

**Status:** Revised for owner review, 2026-10-04
**Date:** 2026-10-04
**Reference implementation:** `/Users/davauj2/code/p3-solutions-group/p3sg-website/tools/pr-attention-router`
**Target repository:** `/Users/davauj2/code/sandbox/risk-based-pr-attention-routing`

## Purpose

Separate the PR Attention Router from every application, including this
repository's Vite dashboard. A frontend, backend, or Turborepo host should be
able to add the router package, provide repository policy as data, and wire one
validation workflow without copying a React application.

The change preserves [ADR-0001](../../adr/ADR-0001-route-attention-before-automation.md):
the router classifies required human attention and publishes notifications
only. It may not approve, merge, deploy, release, or modify pull-request
source.

## Goals

- Put host-neutral runtime, CLIs, prompt, schema, helpers, and tests in
  `packages/pr-attention-router`.
- Put this repository's policy, conformance cases, and AI context in the
  root-level `pr-attention-router` adapter directory.
- Make the dashboard an ordinary workspace client of
  `@scope/pr-attention-router`.
- Express every deterministic path rule as validated policy data.
- Execute TypeScript CLIs directly with Node 22.18 or newer.
- Preserve trusted-code and untrusted-PR checkout separation in GitHub Actions.
- Prove the router checks without installing dashboard dependencies.

## Non-goals

- Publishing the package to npm or a private registry.
- Supporting fork or bot-authored pull requests in this POC.
- Adding application-specific rules for paths that do not exist.
- Granting approval, merge, deployment, or release authority.
- Turning deferred ideas into V1 rules.

## Target layout

```text
package.json
package-lock.json
packages/
  pr-attention-router/
    cli/
    lib/
    test/
    package.json
    tsconfig.json
    README.md
pr-attention-router/
  policy.json
  policy-cases.json
  host-context.md
apps/
  attention-router/
    package.json
    src/
.github/
  pull_request_template.md
  workflows/
```

The root `package.json` is private and declares:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

The root lockfile is canonical. A clean router validation job uses an npm
workspace filter, so only the package's runtime dependencies and TypeScript are
installed. A separate dashboard job installs the complete workspace.

## Package boundary

`packages/pr-attention-router` contains no React, Vite, DOM, sample-data, or
host-policy knowledge. Its package name is `@scope/pr-attention-router`, its
module type is `module`, and its engine floor is Node 22.18.

Runtime dependencies are only:

- `nodemailer`
- `yaml`

TypeScript is the only development tool. Strict type-checking of Node built-ins
and Nodemailer additionally requires the declaration-only development packages
`@types/node` and `@types/nodemailer`; the reference P3 package has the same
requirement. Hand-written ambient shims are rejected because they would weaken
the reusable package's type boundary merely to reduce the manifest count.
Package scripts provide:

- `typecheck`
- `test`
- `check`
- `check:policy`
- `check:workflow`

The package exports a small source-level workspace API from `lib/index.ts`:

- `RiskTier`
- `ReviewerType`
- `FinalClassification`
- `renderClassificationComment`
- `renderNotificationSummary`

CLIs run directly through Node's native TypeScript support. Imports include
`.ts` extensions, the TypeScript configuration enables `erasableSyntaxOnly`,
and no build artifact is required for the vendored workspace form. A future
published package must compile JavaScript before distribution.

## Dashboard boundary

`apps/attention-router` declares a workspace dependency on
`@scope/pr-attention-router`. It imports package-owned risk types and rendering
instead of defining or copying router behavior. UI-only types, tier labels,
sample data, React components, CSS, Vitest, and Vite remain in the app.

The dashboard may adapt a synthetic pull request into a
`FinalClassification` to show a persistent-comment preview. That adapter is
presentation code; it cannot evaluate a deterministic floor or enforce a tier.

The app no longer contains:

- router CLIs;
- deterministic rule evaluation;
- classification enforcement;
- diff parsing;
- notification adapters;
- SMTP or Slack transports;
- GitHub-script helpers;
- prompt or output schema.

## Host policy

`pr-attention-router/policy.json` is this repository's adapter. Schema version
1 contains named MEDIUM and HIGH path rules, Unicode regex sources, rationale,
production/non-production/test patterns, and size thresholds.

The loader rejects:

- unsupported versions;
- LOW path rules;
- invalid regular expressions;
- empty pattern arrays;
- empty IDs, rationales, or pattern strings;
- duplicate rule IDs;
- non-positive thresholds.

V1 is intentionally small: no more than eight HIGH and eight MEDIUM rules, and
every path rule must match a path that exists in the repository.

V1 has exactly three HIGH rules:

1. `workflow-automation` matches `^\.github/workflows/`. If CI or attention
   automation breaks unnoticed, unvalidated changes can pass or pull requests
   can be misclassified.
2. `router-package` matches `^packages/pr-attention-router/`. If floor
   enforcement or notification code breaks unnoticed, every classified pull
   request can receive an unsafe result.
3. `router-host-policy` matches `^pr-attention-router/`. If repository policy or
   host context breaks unnoticed, every pull request can receive the wrong
   deterministic floor or AI context.

V1 has exactly five MEDIUM rules:

1. `operational-guidance` matches existing `docs/adr/`, `docs/runbooks/`, and
   `docs/setup/` paths. If operational guidance breaks unnoticed, adopters or
   responders can configure or operate the router incorrectly.
2. `github-configuration` matches non-workflow `.github/` files, including the
   existing PR template. If PR context configuration breaks unnoticed,
   reviewers can lose the intent evidence needed for a safe LOW result.
3. `dashboard-shared-surface` matches the existing dashboard shell, entry
   point, domain/data contracts, and global/app-shell styles. If one of these
   shared surfaces breaks unnoticed, every dashboard tier or queue can display
   incorrect information.
4. `build-and-dependencies` matches the existing root workspace manifests and
   dashboard package, TypeScript, Vite, and ESLint configuration. If build or
   dependency configuration breaks unnoticed, validation or the production
   dashboard can diverge for all consumers.
5. `agent-instructions` matches the existing root `AGENTS.md`. If repository
   instructions break unnoticed, every coding agent can operate under the
   wrong safety or workflow contract.

Localized dashboard component or copy changes remain eligible for LOW when
validation passes, material context is sufficient, and no size or breadth
signal raises the floor.

The engine receives a parsed `DeterministicPolicy`. It evaluates every signal
instead of returning early on HIGH, checks both rename paths, records
`matchedRuleIds`, and establishes MEDIUM for deleted tests, failed or missing
validation, missing/conflicting material context, missing changed-file evidence,
five or more production files, or 250 or more changed lines.

## Policy conformance

`pr-attention-router/policy-cases.json` contains exactly twelve focused cases.
Cases specify paths, optional change status, validation status, material
context, changed-line count, expected floor, expected rule IDs, and forbidden
rule IDs. The twelve cases are:

1. one case for each of the three HIGH rules;
2. one representative MEDIUM operational-runbook case;
3. one LOW localized TierCard case;
4. one anchored lookalike path that must remain LOW;
5. failed validation;
6. missing material context;
7. conflicting material context;
8. a deleted test;
9. five production files;
10. 250 changed lines.

The conformance harness accepts only the optional evidence overrides needed by
those built-in signals. It does not introduce a new runtime signal. Additional
cases are added only after a real misclassification demonstrates the need.

The package tests use a generic fixture policy rather than the host policy.
`check:policy` is the only code that combines the reusable engine with this
repository's adapter.

## GitHub assets

Move both GitHub-script helpers into package `lib/` as `.cjs` files so they can
be loaded with `require()` regardless of a host's root module type. Move the
generic prompt and JSON output schema into package `lib/`.

Remove:

- `.github/scripts/`
- `.github/attention-router/`

At runtime, the workflow writes a trusted prompt by concatenating the package's
generic prompt with `pr-attention-router/host-context.md`. PR title, body, diff,
and repository instruction files are explicitly untrusted evidence, not
instructions.

## Workflow contract

The attention workflow retains `workflow_run` as its only trigger and keeps
top-level `contents: read`. Every job declares explicit least privilege.

Each job checks trusted code out with:

```yaml
ref: ${{ github.sha }}
persist-credentials: false
```

The PR head is checked out separately under `.par/target`. No shell command
executes with the PR checkout as its working directory. Codex is read-only and
works only against that inspection checkout. The deterministic floor remains
binding and AI may only raise it.

The workflow sets:

```yaml
env:
  PAR_ROUTER: packages/pr-attention-router
  PAR_ADAPTER: pr-attention-router
```

It calls all CLIs by path from the trusted checkout. Evidence, classify,
finalize, Slack, and publish install no packages. Only email runs:

```bash
npm ci --omit=dev --ignore-scripts \
  --workspace @scope/pr-attention-router \
  --include-workspace-root=false
```

The email and Slack adapters publish the same three-line summary; the
persistent PR comment remains the detailed record. Notification failures do
not block comment publication.

Replace the Vitest source-text permission test with a package-owned YAML
contract checker. It enforces:

- only `workflow_run` triggers;
- exactly `contents: read` globally;
- explicit job permissions;
- at most one writing job, limited to `issues` and `pull-requests` write;
- no write permissions beside the PR checkout;
- no persisted checkout credentials;
- trusted checkouts at `github.sha`;
- PR checkout under `.par/`;
- read-only Codex inside `.par/target`;
- no `${{ }}` expressions inside `run:` scripts;
- no non-Codex secrets beside the PR checkout.

## Validation workflow

`Validate repository` remains the host validation contract and gets two jobs:

1. **Router:** filtered workspace install, package typecheck/tests,
   `check:policy`, and `check:workflow`. This job proves the package without
   dashboard dependencies installed.
2. **Dashboard:** complete workspace install, app lint/typecheck/tests/build.

Both run whitespace validation. The overall workflow conclusion supplies the
attention workflow's PASSED or FAILED evidence. A `timed_out` conclusion is
also treated as FAILED and still classifies.

## V2 candidates

The installation guide records these as deferred, not V1 policy or behavior:

- Money, authentication, authorization, credential, persistence, migration,
  deployment, production-configuration, indexability, and CODEOWNERS rules are
  deferred because this repository has no corresponding host paths today.
- A generic shared-component rule is deferred because the current leaf
  components are the intended LOW probe surface; add it only when a real shared
  design-system directory exists.
- Binary-file, generated-file, dependency-major-version, and coverage-change
  signals are deferred because V1 retains only the established non-path
  signals.
- Cancelled, stale, skipped, and startup-failure validation conclusions are
  deferred until their retry and head-SHA behavior is tested.
- Fork and bot contributor policies are deferred because the isolated POC
  intentionally accepts only same-repository human collaborators.
- A reusable `workflow_call` wrapper is deferred until a second package-based
  host proves the stable host inputs.
- Compiled JavaScript, `bin` mappings, and private-registry installation are
  deferred until publication is approved; registry credentials must never
  share a job with PR source.
- A broader public API is deferred until the dashboard, mobile, and backend
  clients identify common imports.
- Per-app monorepo policy composition is deferred because V1 uses one
  repository-level policy with app-prefixed rules.

V1 count: **3 HIGH rules, 5 MEDIUM rules, 12 conformance cases**. None exceeds
the requested targets, so no exception justification is required.

## Rollout and rollback

Implementation uses one short-lived branch and a conventional PR title. The PR
is not merged without owner review. Keep the attention workflow disabled while
trusted package and workflow files are being installed. After merge, enable
comment-only classification and repeat LOW, MEDIUM, and HIGH hosted probes
before enabling notification channels.

Rollback begins by setting all enablement variables to `false`. Reverting the
implementation PR restores the app-contained router without changing the V1
authority boundary.
