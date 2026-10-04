---
status: accepted
date: 2026-09-30
supersedes:
superseded_by:
---

# ADR-0001: Route Attention Before Automating Pull Request Decisions

## Context

AI-assisted development can increase pull request throughput faster than human review capacity. Review effort should therefore be directed toward the changes with the greatest probability of error, impact, difficulty of detection, and blast radius.

These dimensions are distinct:

- **Probability** — likelihood that the change is wrong.
- **Impact** — severity of the consequences if it is wrong and nobody notices.
- **Detectability** — likelihood that tests, CI, monitoring, or other controls will catch it.
- **Blast radius** — how broadly the failure could propagate across users, pages, systems, or One SEO capabilities.

The proof of concept must test this approach without granting an automated system authority to approve, merge, deploy, or release changes. It must remain isolated from the real `one-seo` frontend and `one-market` backend repositories while the approach is evaluated.

## Decision

V1 will be a PR Attention Router that classifies and notifies only.

- Classify required human attention as low, medium, or high using probability, impact, detectability, and blast radius.
- Require deterministic repository signals for baseline classification.
- Use Jira, specification, and ADR context when available to evaluate intent and business meaning.
- Prevent a LOW classification when material context needed to assess intent or risk is missing or conflicting. Missing Jira context alone is not material when the pull request otherwise establishes sufficient intent and risk evidence.
- Use deterministic rules to establish the minimum attention level.
- Allow AI judgment to raise the attention level when context warrants it, but never lower a deterministic minimum.
- Publish enough rationale, blast-radius information, reviewer focus, recommended reviewer type, and missing evidence for a human to decide what to inspect.
- Keep approval, merge, deployment, and release decisions under human control.
- Limit the initial V1 writes to its persistent PR classification comment and email attention notifications; Slack remains a deferred notification channel, and V1 must not modify repository source.
- Run the proof of concept, its workflows, secrets, and test pull requests only in the isolated `risk-based-pr-attention-routing`, `one-seo-par`, and `one-market-par` repositories.

## Consequences

- Human authority is preserved while review attention can be prioritized.
- Conservative over-classification is acceptable during the proof of concept; under-classification is the more serious failure.
- Missing or conflicting material context increases required human attention rather than allowing the router to assume low risk.
- The router cannot demonstrate time savings from autonomous approval or merging in V1.
- The deterministic rubric and AI rationale must be evaluated against reviewer feedback and revised as evidence accumulates.
- Any future authority to approve, merge, deploy, or release requires a new architectural decision.

## Alternatives Considered

- **Autonomous AI approval or merge:** rejected because the proof of concept has not established sufficient reliability or independent controls.
- **AI-only classification:** rejected because contextual judgment must not override deterministic safety floors.
- **Deterministic-only classification:** rejected because repository paths, change size, and other mechanical signals cannot capture all semantic or operational risk.
- **Allow LOW classification without material context:** rejected because missing evidence should increase uncertainty rather than be treated as evidence of low risk.
- **Implement directly in the real `one-seo` or `one-market` repositories:** rejected because experimentation, credentials, and test activity must remain isolated until the approach is validated.
