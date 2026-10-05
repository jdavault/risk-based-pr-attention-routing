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

- Validate PR #11, which extracts the application-independent router into
  `packages/pr-attention-router`, keeps host policy in
  `config/pr-attention-router`, and makes `apps/par-dashboard` an optional
  UI-only client.
- After merge, open an acceptance PR to test the new default-branch
  `workflow_run` orchestration end to end.

## Session Log

### Session 2026-10-04

- Branch: `refactor/extract-pr-attention-router`
- Focus: Complete and validate the application-independent package boundary.
- Completed: Package extraction, host policy adapter, executable workflow
  trust contract, P3-aligned workflow wiring, isolated CI jobs, and dashboard
  rename/decoupling.
- In Progress: PR #11 hosted validation and post-merge acceptance testing.
- Next: Verify package/policy/dashboard checks, merge only after owner review,
  then exercise the landed workflow with a harmless classification PR.
