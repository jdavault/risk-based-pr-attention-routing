# Risk-Based PR Attention Routing

> **Route attention first; automate later.**

> **v0.1 classifies and notifies only. It does not approve or merge pull
> requests.**

## Problem

AI increases pull request throughput faster than it increases human
review capacity. How should scarce human review attention be directed
toward the changes where it matters most?

## V1: Attention Router

Run a PR attention router in GitHub Actions. It consumes repository
signals, the PR's risk rubric, and AI judgment to classify how much
human attention each pull request needs. Here, `@SEO` names the team and
its rubric; `one-seo` names the frontend React repository.

```text
                 PR
                 |
                 v
        +-------------------+
        | PROBABILITY       |
        | could it be       |
        | wrong?            |
        +-------------------+
                 |
                 v
        +-------------------+
        | IMPACT            |
        | if wrong,         |
        | how bad?          |
        +-------------------+
                 |
                 v
        +-------------------+
        | DETECTABILITY     |
        | where else        |
        | catches it?       |
        +-------------------+
                 |
                 v
        +-------------------+
        | BLAST RADIUS      |
        +-------------------+
                 |
                 v
        +-------------------+
        | HUMAN ATTENTION   |
        +-------------------+
```

The dimensions are distinct:

- **Probability** --- How likely is the change to be wrong?
- **Impact** --- How severe are the consequences if it is wrong and
  nobody notices?
- **Detectability** --- How likely are tests, CI, monitoring, or other
  controls to catch it?
- **Blast radius** --- How broadly could the failure propagate across
  users, apps, systems, or One SEO capabilities?

**Impact answers "how bad?" Blast radius answers "how far?"**

## Low: Lightweight Human Review

Examples:

- Localized UI, copy, style, or accessibility changes
- User-facing documentation
- Developer documentation or runbook updates that do not change
  operational policy or executable configuration
- Isolated component changes with no shared contracts or business
  logic

## Medium: Targeted Human Review

Examples:

- Shared components
- Routing or navigation
- GraphQL or API consumers
- Meaningful query changes
- Changes spanning multiple One SEO features
- Dependency, migration, or build configuration
- `github/workflows` changes limited to CI checks, tests, linting, or
  other non-deployment automation

**Blast radius:** Multiple consumers, workflows, or features could be
affected.

**Human review:** Identify the specific areas that require reviewer
attention.

## High: Tech Lead or SME Review

Examples:

- Sitemap eligibility or indexability
- Metadata publishing or delivery
- Authorization or security
- Shared API or event contracts
- Persistence, schemas, or migrations
- Destructive or difficult-to-reverse changes
- `.github/workflows` changes affecting deployment, release,
  publishing, permissions, secrets, OIDC, credentials, or other
  security-sensitive automation
- Runbook or documentation changes that alter operational, security,
  or production procedures

**Blast radius:** Core business behavior, data integrity, production
operations, security, or consumers or pages could be affected.

**Human review:** A Tech Lead or relevant subject-matter expert.

## Signals

Deterministic rules use available repository signals to establish the
baseline classification:

- Changed paths and size
- Module and consumer blast radius
- Tests and coverage changes
- CI and build results
- Dependencies and configuration
- Contracts

The router also uses available context to understand the intent and
business meaning of the change:

- Jira intent
- Specification alignment
- ADR and architecture alignment

Missing Jira context alone does not prevent a low classification if the
pull request provides enough evidence to establish intent and risk. If
material context is missing or conflicts with the change, however, the
pull request should be escalated.

## Deterministic Rules Establish a Minimum Attention Level

AI may raise that level based on business context, but it may never
lower the deterministic minimum.

## Intended AI/ML Integration

```text
PR
  |
  +-- opened or updated
  |
GitHub Action
  |
  v
Deterministic signals
  |
  +-- available Jira / spec / ADR context
  |
  v
openai/edits-action
  |
  v
PR Attention Router
  |
  +-- LOW / MEDIUM / HIGH
  +-- rationale
  +-- blast radius
  +-- review focus
  +-- recommended reviewer type
  +-- missing evidence
  |
  v
Persistent PR comment
  +-- change-only email notification
  +-- human review
```

The PR comment is the persistent audit artifact. A later comparison may
evaluate retrievals or other output, but Claude is not part of the
initial implementation workflow.

## Classification Rules

Classification may be raised by AI when repository signals, Jira,
specifications, ADRs, or business context justify it.

- **LOW and MEDIUM** route to `ONE_DAILY_TO_SEO`
- **HIGH** routes to `HIGH_DAILY` (`PR1_DESIGN` / `PR1_CODE`)

## Noisy Scope Controls

Classify pull requests and collect evidence about how noisy the router
would be.

Conservative over-classification is acceptable during the proof of
concept; under-classification is the more serious failure. This defines
the POC's optimization target rather than merely describing a possible
outcome.

Automated approval or merge may be considered only after the proof of
concept establishes feedback loops, observability, and sufficient
evidence to trust a broader automation boundary.

## Sandbox Boundaries

- Repo POC workflow, secrets, test pull requests, and templates
- Iterations
- POC v0.1 source-code-only. It may update persistent PR
  classification comments and send email attention notifications.
- Repo approval, merge, deployment, or release decisions remain
  human-controlled.
- The POC may be isolated from the real `one-seo` frontend and
  `one-hotel` backend repositories until the approach is validated.
- The POC test ground should include a small standalone React and
  TypeScript Attention Router application. It provides isolation,
  controlled fixtures for LOW/MEDIUM/HIGH examples, and a persistent
  browser workflow.
- An Attention Router dashboard showing LOW, MEDIUM, and HIGH router
  levels.

## Intended GitHub Integration

- **LOW/MEDIUM** route attention before automating pull-request
  decisions.
- **HIGH** route attention to the appropriate reviewer/SME.
- GitHub Actions provides the workflow integration point.
