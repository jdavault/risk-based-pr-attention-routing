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
