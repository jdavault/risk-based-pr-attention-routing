# Lean PR Attention Router Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-04-lean-pr-attention-router-design.md`

**Goal:** Replace the current multi-module router with the proven P3 lean
contract, adapt its host rubric to this repository, limit the dashboard to the
public result contract, and preserve the workflow trust boundary.

## Global constraints

- Work on `refactor/lean-pr-attention-router` in the current checkout; the
  owner explicitly rejected a worktree for this sequential task.
- Use TDD for package and dashboard behavior.
- Merge only after the owner-authorized PR has passing hosted checks.
- Keep `PAR_APP_WORKFLOWS_ENABLED`, `PAR_EMAIL_ENABLED`, and
  `PAR_SLACK_ENABLED` enabled; move email out of the package into a small
  dependency-free host workflow step without mutating repository variables.
- Run `git diff --check` before each commit.

## Task 1: Lean package contract

Write `route.test.ts` first for path/CI/size floors, max(floor, AI), malformed
AI fallback, authority-language withholding, notification changes, prompt
composition, Markdown neutralization, and strict host config validation. Run it
against the old package and observe the expected failure. Implement the single
`route.ts`, prompt, schema, manifest, and TypeScript config; remove old
`cli/`, `lib/`, and `test/` trees. Verify package typecheck and tests.

## Task 2: Host adapter

Replace `policy.json`, `policy-cases.json`, and `host-context.md` with a small
repository-specific `rules.json` and explicit LOW/MEDIUM/HIGH `rubric.md`.
Run `route.ts check` and confirm every individual glob matches a tracked path.
Report counts by tier.

## Task 3: Dashboard client boundary

Change dashboard tests first to require the lean comment preview. Import only
the package's public result types, keep the synthetic fixture in
`apps/par-dashboard`, and avoid bundling the Node-only `route()` module. Then
run lint, typecheck, tests, and build.

## Task 4: Workflows and root scripts

Run the four `route.ts` subcommands across explicit evidence, classification,
finalization, notification, and publication jobs. Keep the trusted/default
checkout and untrusted target checkout separate, verify current head equals
validated head, keep Codex read-only and failure-tolerant, and send only
change-triggered email and Slack summaries. Use Python `smtplib` in the email
notification job so the router stays dependency-free. Align
`validate.yml` and root scripts with package tests, adapter check, dashboard
checks, and Node 24. Re-check P3's in-flight `verify` workflow before final
alignment.

## Task 5: Durable documentation

Add an ADR amendment for the lean coded/AI boundary and dependency-free,
host-owned notification adapters.
Update README, package README, installation guidance, and the notification
runbook. Preserve historical plans/designs as historical records rather than
rewriting them.

## Task 6: Verification and handoff

Run clean install, complete checks, package isolation proof, YAML parsing, and
`git diff --check`. Request one fresh whole-branch review, fix Important or
Critical findings with RED/GREEN evidence, commit conventionally, push, and
open a conventional PR. Do not merge.

## Review focus

- Trusted and PR-controlled checkouts never share write authority or secrets.
- A failed validation and 250-line change cannot remain LOW.
- AI cannot lower a floor; authority prose cannot reach the comment.
- Email and Slack are thin, best-effort, and change-only; the comment remains
  canonical.
- The dashboard builds using type-only package imports and no Node runtime
  modules.
- Every host rule names an existing path and matches the rubric.
