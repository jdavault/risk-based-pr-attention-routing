# Install the PR Attention Router

## Purpose and authority boundary

The PR Attention Router classifies required human attention as `LOW`,
`MEDIUM`, or `HIGH`, publishes one persistent pull-request comment, and may
send change-only email or Slack summaries. It never approves, merges, deploys,
releases, or modifies pull-request source. Read
[ADR-0001](../adr/ADR-0001-route-attention-before-automation.md) before
changing that boundary.

The router is application-independent. A React, React Native, NestJS, or
monorepo host supplies its own validation workflow and repository policy.
The optional dashboard in `apps/par-dashboard` is a client and is not part of
an installation.

## Installation boundary

Copy or workspace-link these three pieces:

```text
packages/pr-attention-router/       reusable package; no host path rules
config/pr-attention-router/         one repository-owned policy adapter
.github/workflows/
  pr-attention-review.yml           orchestration
  <host validation workflow>.yml    application checks
```

Also add the `Material context: SUFFICIENT | CONFLICTING` field from this
repository's pull-request template. An absent field is `MISSING`.

The package contains:

- native Node TypeScript CLIs under `cli/`;
- policy loading, deterministic evaluation, floor enforcement, rendering,
  notifications, GitHub helpers, workflow contract checking, prompt, and
  schema under `lib/`;
- framework-independent `node:test` suites under `test/`.

It has no React, Vite, DOM, or host-application dependency. Its runtime
dependencies are `nodemailer` and `yaml`; only the email workflow job installs
runtime dependencies.

## Workspace setup

For a repository with `apps/` and `packages/`, add:

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

Use one root lockfile. A dashboard or application that needs the public
classification types/renderers may declare:

```json
{
  "dependencies": {
    "@scope/pr-attention-router": "*"
  }
}
```

The host application must not import policy loaders, evidence collectors,
notification transports, or workflow helpers. Those remain package/workflow
concerns.

For a repository without an existing packages directory, a `tools/` location
is acceptable; update `PAR_ROUTER` accordingly. Keep the same package/config
separation.

If the package is later published outside a workspace, compile TypeScript to
JavaScript and publish explicit exports. Native `.ts` execution is deliberate
for this trusted in-repository Node 24 workflow, not a registry distribution
contract.

## Host policy

Create:

```text
config/pr-attention-router/
  policy.json
  policy-cases.json
  host-context.md
```

The reusable package contains no host paths. `policy.json` contains the
repository's deterministic HIGH and MEDIUM path rules; unmatched paths may
remain LOW unless a built-in non-path signal raises the floor. The loader
rejects LOW path rules, invalid regular expressions, empty pattern lists, and
duplicate IDs.

Use one policy per repository. In a monorepo, prefix rules with their app or
package paths rather than composing separate policies in V1. Add only paths
that exist today and explain each rule as a concrete failure.

Built-in non-path signals remain:

- failed validation;
- missing or conflicting material context;
- a deleted test;
- five or more production files;
- 250 or more changed lines.

`host-context.md` gives Codex repository-specific vocabulary and constraints.
It supplements the generic package prompt; it does not replace deterministic
rules.

This repository's validated scope is:

> V1 policy: 3 HIGH rules, 5 MEDIUM rules, 12 conformance cases.
> All counts remain below the review targets; no exception is required.

## Workflow wiring

The attention workflow listens to the exact top-level name of the host
validation workflow:

```yaml
on:
  workflow_run:
    workflows: [Validate repository]
    types: [completed]

env:
  PAR_ROUTER: packages/pr-attention-router
  PAR_ADAPTER: config/pr-attention-router
```

The name is host-specific. For example, P3 declares `name: verify`, so its
attention workflow uses `workflows: [verify]`.

Preserve the trust contract:

- accept `success`, `failure`, and `timed_out`; only success maps to `PASSED`;
- load trusted router code from `ref: ${{ github.sha }}`;
- check the PR head out separately under `.par/target`;
- never execute shell commands or package installs inside `.par/target`;
- use Codex `safety-strategy: read-only` in `.par/target`;
- grant explicit least-privilege permissions;
- permit exactly one writer job, limited to the persistent comment;
- keep secrets away from jobs holding PR source, except the Codex API key on
  the read-only Codex step;
- install dependencies only in the email job.

The workflow builds its prompt from the trusted generic package prompt plus
the trusted host context. It invokes every CLI and GitHub helper from
`$PAR_ROUTER`, never from the dashboard or PR checkout.

Do not add registry credentials to any job that holds PR source. If a future
published package requires authentication, resolve it in a trusted job that
does not check out untrusted source, or use an approved artifact boundary.

## Validation commands

From the repository root:

```bash
npm ci --ignore-scripts
npm run check --workspace @scope/pr-attention-router
npm run check:policy --workspace @scope/pr-attention-router -- \
  --policy ../../config/pr-attention-router/policy.json \
  --cases ../../config/pr-attention-router/policy-cases.json
npm run check:workflow --workspace @scope/pr-attention-router -- \
  --workflow ../../.github/workflows/pr-attention-review.yml
```

The host CI should install the router workspace in isolation and prove React
is unavailable there. Validate the application in a separate job using the
host's normal lint, typecheck, test, build, and integration commands.

## Variables and secrets

Required for classification:

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `PAR_APP_WORKFLOWS_ENABLED` | Master workflow gate; exactly `true` enables runs. |
| Secret | `OPENAI_API_KEY` | Codex classification credential. |

Optional email configuration:

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `PAR_EMAIL_ENABLED` | Exactly `true` enables email. |
| Variable | `PAR_EMAIL_FROM` | Sender address. |
| Variable | `PAR_EMAIL_TO_TEAM` | LOW/MEDIUM recipients. |
| Variable | `PAR_EMAIL_TO_LEAD` | HIGH recipients. |
| Variable | `SMTP_HOST` | Runner-reachable SMTP host. |
| Variable | `SMTP_PORT` | SMTP port. |

Optional Slack configuration:

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `PAR_SLACK_ENABLED` | Exactly `true` enables Slack. |
| Variable | `PAR_SLACK_CHANNEL_ID` | Channel ID containing the bot. |
| Secret | `SLACK_BOT_TOKEN` | Bot token with `chat:write`. |

Email and Slack receive the same three-line summary: tier/title, reviewer and
floor, and PR URL. Detailed rationale, blast radius, review focus, and missing
evidence remain only in the persistent PR comment. Notifications occur on the
first classification and once per tier change; same-tier reruns stay quiet.

## Rollout

1. Land package, config, validation, and attention workflow on the default
   branch with all feature gates false.
2. Run package, policy, workflow-contract, and host validation locally.
3. Set `PAR_APP_WORKFLOWS_ENABLED=true` and open a harmless same-repository PR
   with sufficient material context.
4. Verify deterministic evidence, Codex output, floor enforcement, and the
   persistent comment.
5. Test LOW, MEDIUM, and HIGH paths.
6. Enable one notification channel at a time and verify change-only behavior.
7. Keep human review and merge decisions unchanged.

Because `workflow_run` uses the workflow from the default branch, a PR that
changes `pr-attention-review.yml` cannot validate its new orchestration end to
end before merge. Its static trust contract and package tests run in PR CI;
perform an acceptance PR after the workflow lands.

## V2 candidates

- Absent sensitive path families — add authentication, payments, migrations,
  SEO/indexability, or deployment rules only when those paths exist.
- Shared-component rule — defer until real misclassification shows component
  changes need a deterministic floor beyond current shared surfaces.
- New signal types — V1 intentionally keeps only the five documented
  non-path signals.
- Additional workflow conclusions — defer conclusions beyond success,
  failure, and timeout until observed runner behavior requires them.
- Forks and bots — V1 classifies same-repository, human-authored PRs from
  contributors with write access so secrets never cross that boundary.
- Reusable workflow wrapper — defer until at least two installations prove a
  stable host interface.
- Package publication — defer until workspace installations validate the API
  and an approved registry/credential model exists.
- Broader public API — export only UI-safe types and renderers until consumers
  demonstrate another stable need.
- Per-app policy composition — use one repository policy with app-prefixed
  rules until a real monorepo requires composition.
