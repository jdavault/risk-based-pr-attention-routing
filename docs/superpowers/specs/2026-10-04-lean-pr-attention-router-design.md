# Lean PR Attention Router Design

## Status

Approved for implementation by the repository owner on 2026-10-04. This design
adapts the reviewed P3 Solutions Group lean router to this repository.

## Goal

Make the attention router small enough to understand in one sitting while
preserving its essential guarantee:

> Code guarantees minimum attention for sensitive paths, failed validation,
> and changes of 250 lines or more. Codex applies the repository rubric and may
> raise that floor, but can never lower it.

The router remains classification-only. Humans retain approval, merge,
deployment, and release authority.

## Layout and ownership

```text
packages/pr-attention-router/
  route.ts
  route.test.ts
  classification-prompt.md
  classification.schema.json
  package.json
  tsconfig.json
  README.md
config/pr-attention-router/
  rules.json
  rubric.md
.github/workflows/
  validate.yml
  pr-attention-review.yml
apps/par-dashboard/
  # optional display client; imports package types, no routing or host policy
```

The package contains no React, Vite, DOM, host paths, email transport, or
GitHub-specific helper modules. `route.ts` exposes pure functions and four
native Node subcommands: `evidence`, `prompt`, `route`, and `check`.

The host supplies exactly two files. `rules.json` answers *where did the
change occur?* and establishes deterministic HIGH or MEDIUM path floors.
`rubric.md` answers *what does the change actually do?* and is the single
source of truth for LOW, MEDIUM, and HIGH semantics.

## Deterministic and AI authority

Code enforces only three kinds of floor:

1. Paths named by the host rules.
2. Failed, timed-out, or otherwise unsuccessful required validation: MEDIUM.
3. At least 250 changed lines: MEDIUM.

The final tier is `max(deterministic floor, AI tier)`. Invalid or missing AI
output uses the floor. If AI prose contains approval or merge-authority
language, its valid tier still participates in `max()`, but all AI prose is
withheld from the comment.

LOW and MEDIUM map to a developer familiar with the affected area. HIGH maps
to a Tech Lead or relevant SME. The mapping is package behavior, not host
policy.

## Repository rubric

The rubric describes only capabilities this repository has:

- LOW: localized dashboard component content, markup, styles, accessibility,
  and non-operational explanatory material.
- MEDIUM: dashboard shell/shared model/configuration, build/dependency
  configuration, operational docs, repository instructions, and non-workflow
  GitHub configuration.
- HIGH: Actions workflows, the router package, and its host configuration.

Semantic HIGH examples include introducing credential handling, an external
data destination, deployment authority, or weakened CI/router trust behavior,
wherever the behavior appears. This repository does not claim payment,
authentication, database, migration, sitemap, or production SEO rules it does
not have.

## Workflow and trust boundary

`validate.yml` is the required pull-request workflow. The attention workflow
uses `workflow_run`, and always loads itself, the router, and host config from
the trusted default-branch commit (`github.sha`). It checks the validated PR
head out separately under `.par/target` for read-only inspection.

The workflow has two jobs:

- `classify`: read-only repository permissions, PR-head inspection, evidence,
  prompt construction, and optional Codex classification.
- `publish`: trusted checkout only, one persistent PR comment, and short email
  and Slack alerts only on first classification or a tier change.

Only classify sees the OpenAI key. Only publish can write a comment and see
notification credentials. Same-repository, human-authored PRs from
collaborators with write access are accepted. The validated head SHA must
still equal the current PR head SHA. Fork PRs never reach secrets.

The router package has no notification dependencies. Publish sends the same
three-line summary through Python's standard-library SMTP client and Slack's
Web API. HIGH email goes to `PAR_EMAIL_TO_LEAD`; LOW/MEDIUM goes to
`PAR_EMAIL_TO_TEAM`. Both transports are best-effort, change-only, and unable
to change classification or prevent the persistent comment.

## Dashboard boundary

`apps/par-dashboard` is an optional visual explanation of the concept. It owns
its sample/display data and imports the package's public result types through a
workspace dependency. Its browser bundle does not import the Node-only
`route()` implementation; a typed synthetic `RouteResult` drives the comment
preview. Adopting repositories do not need to install or run the dashboard.

## Configuration validation

The package check rejects malformed JSON, LOW rules, missing fields, empty
path lists, duplicate IDs, stale individual globs, and rubrics missing any of
the exact `## LOW`, `## MEDIUM`, or `## HIGH` headings. Runtime glob matching
is conservatively dotfile-aware; configuration validation remains strict so
`.github/**` cannot be mistyped as `github/**`.

## Risks and mitigations

- Removing the executable workflow checker shifts trust review to normal code
  review; workflow files are therefore deterministic HIGH and retain explicit
  least-privilege permissions and tests for the router's pure trust decisions.
- Removing detailed evidence fields makes Codex rationale more important;
  invalid AI output safely falls back to the coded floor.
- Keeping notification adapters in the host workflow avoids package
  dependencies but makes their small scripts part of the workflow review
  surface; both remain best-effort and the comment remains canonical.
- Native TypeScript execution depends on Node 22.18+; CI uses Node 24.
- Host globs can become stale; `route.ts check` validates every glob against
  tracked files in required CI.
