# Repository Instructions

## Workflow

- Create short-lived branches from `main` and integrate them through pull requests with passing checks and squash merges.
- Use conventional commit and pull request titles.
- Preserve unrelated and untracked files. Stage only files required by the current task.

## Safety Boundaries

- Keep this proof of concept isolated from `amex-eng/one-market`.
- Give every workflow explicit least-privilege permissions. Keep personal access tokens and provider credentials out of source and workflow files.

## Durable Context

- Read [ADR-0001](docs/adr/ADR-0001-route-attention-before-automation.md) before changing the risk model, classification authority, or automation boundary.
- Read the [local Actions runner runbook](docs/runbooks/local-actions-runner.md) before changing workflow runner labels or configuring a local runner.

## Validation

- Run the smallest relevant validation during development, then verify the complete affected workflow before requesting review.
- Run `git diff --check` before every commit.

## Current Focus

- Treat the lean sandbox baseline as the reference implementation.
- Before installing or running the router in SmartBites or another repository,
  obtain owner approval and amend or supersede ADR-0001's enumerated isolation
  boundary. Read-only inspection and design may proceed meanwhile.
- Keep package code generic and keep every adopting repository's path rules and
  semantic tier rubric host-owned.
- Close disposable acceptance PRs #17–#19 without merging after owner
  confirmation; their results are preserved in the acceptance report.

## Session Log

### Session 2026-10-06

- Branch: `docs/session-closeout-2026-10-06`.
- Focus: Complete the lean workflow acceptance cycle and preserve a fresh-
  context handoff.
- Completed: Explicit six-stage workflow alignment, LOW/MEDIUM/HIGH hosted
  acceptance probes, successful email and Slack delivery, demo report and
  screenshots, direct P3 workflow comparison, and session handoff.
- In Progress: Disposable PRs #17–#19 remain open pending owner-confirmed
  closure.
- Next: Read `handoff.md`, close the probes without merging when confirmed,
  then resolve the ADR-0001 scope gate before any SmartBites installation.

### Session 2026-10-04

- Branch: `refactor/extract-pr-attention-router`
- Focus: Complete and validate the application-independent package boundary.
- Completed: Package extraction, host policy adapter, executable workflow
  trust contract, P3-aligned workflow wiring, isolated CI jobs, and dashboard
  rename/decoupling.
- Completed later: PR #11 hosted validation, merge, and the LOW/MEDIUM/HIGH
  acceptance cycle described in the 2026-10-06 entry.

### Session 2026-10-04 — Lean router

- Branch: `refactor/lean-pr-attention-router`
- Focus: Port the reviewed P3 lean attention-router contract without using a
  worktree.
- Completed: Replaced the multi-module package with the generic P3 `route.ts`,
  repository-owned `rules.json`/`rubric.md`, two workflow jobs, and thin
  change-only email and Slack notifications.
- Completed later: hosted Ubuntu validation, squash merge, and all three
  acceptance probes described in the 2026-10-06 entry.
