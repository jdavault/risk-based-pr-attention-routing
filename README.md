# Risk-Based PR Attention Routing

> Route attention first; automate later.

V1 classifies and notifies only. It does not approve, merge, deploy, or release
pull requests.

To add the router to an existing frontend or backend repository, see the
[installation guide](docs/setup/pr-attention-router-installation.md). The Vite
dashboard is a reference UI and is not required by an adopting application.

## Problem

AI increases pull-request throughput faster than it increases human review
capacity. This proof of concept tests whether repository evidence and AI
judgment can direct scarce human attention toward the changes where it matters
most.

## V1: Attention Router

The router evaluates four distinct dimensions:

- **Probability** — How likely is the change to be wrong?
- **Impact** — How severe are the consequences if it is wrong and nobody
  notices?
- **Detectability** — How likely are tests, CI, monitoring, or other controls
  to catch it?
- **Blast radius** — How broadly could the failure propagate across users,
  applications, systems, or One SEO capabilities?

Impact answers “how bad?” Blast radius answers “how far?”

Deterministic repository signals establish the minimum attention tier. AI may
raise that tier when business context warrants it, but it may never lower the
deterministic floor.

## Attention Tiers

The repository-owned
[rubric](config/pr-attention-router/rubric.md) is the single source for LOW,
MEDIUM, and HIGH definitions, examples, blast radius, and review focus. The
router derives reviewer authority from the final tier: HIGH requires a Tech
Lead or relevant SME; LOW and MEDIUM require a developer familiar with the
affected area.

## Signals and Context

Code guarantees only three deterministic floors: host path rules, failed
required validation (MEDIUM), and 250 or more changed lines (MEDIUM).
`rules.json` answers “where did the change occur?”; `rubric.md` answers “what
does the change actually do?” Codex applies the repository rubric using
probability, impact, detectability, and blast radius. It may raise the coded
floor but cannot lower it. Missing or contradictory context and deleted or
weakened tests are evidence Codex weighs rather than separate coded rules.

## GitHub Actions Flow

```text
Pull request opened or updated
             |
             v
Validate repository
  lint + type-check + test + build + whitespace
             |
             v
Collect trusted evidence and floor
             |
             v
Classify with Codex (read-only)
             |
             v
Finalize: tier = max(floor, Codex)
             |
             v
LOW / MEDIUM / HIGH
  + reasons and review focus
  + recommended reviewer
             |
             v
Notify on first result or tier change
  + email
  + Slack
             |
             v
Publish persistent PR comment
             |
             v
Human review and decision
```

The workflows and workspaces stay separate:

- `Validate repository` checks whitespace once, validates
  `packages/pr-attention-router` without installing React, and validates the
  `apps/par-dashboard` client in a separate job.
- `PR Attention Review` runs after validation succeeds, fails, or times out.
  Explicit evidence, classification, finalization, notification, and
  publication jobs make the trust boundary and each delivery outcome visible.
  The read-only jobs load trusted code and host rules while inspecting the PR
  in a separate checkout. Notification and publication jobs see no PR source.
- `apps/par-dashboard` is an optional client of the package's public
  `RouteResult` contract. It owns only its synthetic display model and contains
  no host policy, GitHub, email, or Slack logic.

The POC runs on GitHub-hosted `ubuntu-24.04` runners with Node 24. Codex uses
the action's built-in `read-only` safety strategy. A retired local-runner
runbook remains only as diagnostic history.

## Notifications

The persistent PR comment is the classification source of truth. Email and
Slack are change-only: they send for the first classification or when the tier
changes, not for same-tier updates. Delivery failure does not block the
comment.

- Plain unauthenticated SMTP uses Python's standard-library `smtplib` in the
  trusted email notification job, keeping the router package dependency-free. HIGH routes
  to `PAR_EMAIL_TO_LEAD`; LOW/MEDIUM routes to `PAR_EMAIL_TO_TEAM`.
- Slack uses `SLACK_BOT_TOKEN`, `PAR_SLACK_CHANNEL_ID`, and the Web API
  `chat.postMessage` method.
- Both receive only tier/title, reviewer and floor, and the PR URL; detailed
  reasoning remains in the persistent comment.
- If email later needs authentication, TLS policy, templates, attachments,
  retries, or shared application behavior, use an approved Node adapter such
  as Nodemailer.

Notifications do not grant approval, merge, deployment, release, or source
modification authority.

## POC Success Criteria

- Classify representative LOW, MEDIUM, and HIGH pull requests.
- Compare router output with human judgment and record false positives and
  false negatives.
- Favor conservative over-classification while treating under-classification
  as the more serious failure.
- Validate the persistent comment and optional notification paths without
  expanding the router’s authority.

Automated approval or merge may be considered only after the proof of concept
establishes feedback loops, observability, and sufficient evidence to trust a
broader automation boundary.

## Sandbox Boundaries

- Keep POC workflows, secrets, test pull requests, and run history in the
  isolated `risk-based-pr-attention-routing`, `one-seo-par`, and
  `one-market-par` repositories.
- Treat V1 as source-code read-only. Its only writes are the persistent PR
  classification comment and enabled attention notifications.
- Keep approval, merge, deployment, and release decisions under human control.
- Keep the POC isolated from the real `one-seo` frontend and `one-market`
  backend repositories until the approach is validated.

## Run the Attention Router App

The standalone React and TypeScript app provides controlled LOW, MEDIUM, and
HIGH examples for local testing.

```bash
npm ci --ignore-scripts
npm run dev --workspace par-dashboard -- --port 5157
```

Then open <http://localhost:5157>. Useful checks are:

```bash
npm run check
```

## Documentation

- [ADR-0001: Route attention before automating pull request decisions](docs/adr/ADR-0001-route-attention-before-automation.md)
- [ADR-0002: Keep the router lean and host-defined](docs/adr/ADR-0002-keep-the-router-lean-and-host-defined.md)
- [Local GitHub Actions runner runbook](docs/runbooks/local-actions-runner.md)
- [PR attention notification runbook](docs/runbooks/pr-attention-notification.md)
- [Personal Mac POC build prompt](docs/personal-mac-poc-build-prompt.md)

## Attention Router Dashboard

![PR Attention Router dashboard showing LOW, MEDIUM, and HIGH review tiers](apps/par-dashboard/public/assets/pr-attention-router-dashboard.png)
