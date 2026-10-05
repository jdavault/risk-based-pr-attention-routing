# Install the PR Attention Router

## Installation boundary

The router classifies required human attention as `LOW`, `MEDIUM`, or `HIGH`,
updates one persistent pull-request comment, and may send short email and Slack
alerts when the tier first appears or changes. It never approves, merges,
deploys, releases, or modifies pull-request source.

It is application-independent. React, React Native, NestJS, and Turborepo
repositories use the same package and workflow; each writes its own rules and
rubric.

```text
packages/pr-attention-router/       reusable package; copy unchanged
config/pr-attention-router/
  rules.json                        host path floors
  rubric.md                         host tier definitions
.github/workflows/
  pr-attention-review.yml           classify and publish
  <host validation>.yml             normal application checks
```

The optional `apps/par-dashboard` is not installed by adopting repositories.
In this reference repository it is a client of the package's public `route()`
result types, not part of the workflow installation contract. It does not
bundle the Node-only CLI into the browser.

## Package-to-host contract

The package has no runtime dependencies or host paths. Node 22.18+ runs its
TypeScript directly; CI uses Node 24. One file provides four subcommands:

```text
route.ts evidence <paths-z-file> <numstat-file> <validation-result> <base-sha> <head-sha>
route.ts prompt <adapter-dir> <evidence.json> <pull-request.json>
route.ts route <adapter-dir> <evidence.json> <ai-output-file> <pull-request.json> [previous-tier]
route.ts check <adapter-dir> <repo-root>
```

`rules.json` answers **where did the change occur?** It contains only known
existing paths whose minimum tier can be guaranteed from location. Rules may
be `MEDIUM` or `HIGH`, never `LOW`.

`rubric.md` answers **what does the change actually do?** It is the single
source for the semantic definition of every tier. It has exact `## LOW`,
`## MEDIUM`, and `## HIGH` headings, each with a definition, examples, blast
radius, and review focus.

Every rule agrees with the rubric, but not every rubric example needs a rule.
A shared UI path can establish MEDIUM while Codex raises a new analytics
destination in that path to HIGH based on behavior.

## Write the host adapter

Inspect the repository before writing policy:

1. Find money, authentication/authorization, credentials, deployment,
   data-loss/migration, search-indexability, and CI/automation surfaces that
   actually exist. These are HIGH-rule candidates.
2. Find app shells, routing, shared UI, shared libraries/API clients,
   build/dependency configuration, and operational runbooks that actually
   exist. These are MEDIUM-rule candidates.
3. Put localized, visible, easily reversible changes in LOW rubric examples;
   do not create LOW path rules.
4. Put semantic risks paths cannot identify—such as a new external data
   destination or credential handling—in the rubric.
5. Explain each rule with a concrete failure: “If X breaks unnoticed, Y
   happens.”
6. Validate every individual glob against tracked files.

Do not copy another repository's policy because its folder names look similar.
A frontend may need indexing and third-party-script examples. A NestJS backend
may need authorization, migration, queue, and external API rules. A mobile app
may need permissions, deep links, native configuration, release signing, and
data-storage examples. Add only capabilities the host has.

```bash
node packages/pr-attention-router/route.ts check config/pr-attention-router .
```

The check rejects malformed JSON, LOW rules, missing fields, empty path lists,
duplicate IDs, stale individual globs, and missing headings. Dotfile globs must
state the dot: `.github/**`, never `github/**`.

## Coded guarantees and Codex judgment

Code establishes a minimum tier for only three things:

1. A changed path matching `rules.json`.
2. Required validation that did not succeed: MEDIUM.
3. At least 250 changed lines: MEDIUM.

Codex receives the generic process, PR diff range and description, host
rubric, and floor. It may raise the floor, never lower it. Missing or
contradictory context and deleted or weakened tests are evidence for Codex,
not separate coded signals. Invalid AI output publishes the floor. Authority
language preserves a valid AI tier but withholds all AI prose.

## Workflow trust boundary

Listen to the exact top-level name of required host validation:

```yaml
on:
  workflow_run:
    workflows: [Validate repository]
    types: [completed]

env:
  PAR_ROUTER: packages/pr-attention-router
  PAR_ADAPTER: config/pr-attention-router
```

Preserve these properties:

- accept `success`, `failure`, and `timed_out`;
- load trusted router/config at `ref: ${{ github.sha }}`;
- check the validated PR head out separately under `.par/target`;
- require a same-repository, human-authored PR from a writer;
- require current and validated head SHAs to match;
- never execute or install PR code in the attention workflow;
- run Codex read-only with repository-read permissions only;
- expose the OpenAI key only to classify;
- expose comment writes and the Slack token only to publish;
- use `cancel-in-progress: false` so cancellation cannot strand an alert.

Because `workflow_run` loads from the default branch, exercise a changed
attention workflow with an acceptance PR after it lands.

## Variables and secrets

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `PAR_APP_WORKFLOWS_ENABLED` | Exactly `true` enables routing. |
| Variable | `PAR_AI_ENABLED` | Exactly `false` skips Codex; otherwise enabled. |
| Variable | `PAR_EMAIL_ENABLED` | Exactly `true` enables email. |
| Variable | `PAR_EMAIL_FROM` | SMTP sender address. |
| Variable | `PAR_EMAIL_TO_TEAM` | LOW/MEDIUM recipients, comma-delimited. |
| Variable | `PAR_EMAIL_TO_LEAD` | HIGH recipients, comma-delimited. |
| Variable | `SMTP_HOST` | Runner-reachable unauthenticated SMTP host. |
| Variable | `SMTP_PORT` | Required SMTP port, normally `25` or the ngrok TCP port. |
| Variable | `PAR_SLACK_ENABLED` | Exactly `true` enables Slack. |
| Variable | `PAR_SLACK_CHANNEL_ID` | Destination channel containing the bot. |
| Secret | `OPENAI_API_KEY` | Read-only classify job only. |
| Secret | `SLACK_BOT_TOKEN` | Publish job only; requires `chat:write`. |

The PR comment is canonical. Email and Slack receive only tier/title,
reviewer/floor, and URL. Plain unauthenticated SMTP uses Python's
standard-library `smtplib` in publish, adding no router dependency. HIGH routes
to the lead list; LOW/MEDIUM route to the team list. Both transports are
best-effort and cannot change classification.

If email later requires authentication, TLS policy, templates, attachments,
retries, or shared application behavior, replace the workflow snippet with an
approved Node adapter such as Nodemailer. Do not grow `smtplib` into an
application mail system.

## Host CI and acceptance

Required validation should run:

```bash
npm ci --ignore-scripts
npm run typecheck --workspace @scope/pr-attention-router
npm test --workspace @scope/pr-attention-router
node packages/pr-attention-router/route.ts check config/pr-attention-router .
```

Then run normal host lint, types, tests, build, and integration checks. The
package must test without installing the application.

After landing, use throwaway LOW, deterministic MEDIUM, deterministic HIGH,
semantic-raise, and AI-off PRs. Verify the floor, final tier, reviewer, one
persistent comment, thin email and Slack alerts, and no repeated same-tier
alert; close the probes without merging.
