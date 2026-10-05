---
status: accepted
date: 2026-10-04
supersedes:
superseded_by:
---

# ADR-0002: Keep the Router Lean and Host-Defined

## Context

The first application-independent router preserved too much proof-of-concept
machinery: six CLIs, a workflow self-checker, a policy-case framework, a
custom diff parser, multiple context signals, and email plus Slack adapters.
The implementation was substantially harder to teach and adopt than the
classification problem requires.

## Decision

- The reusable package is one TypeScript module, one generic test suite, one
  prompt, and one output schema with no runtime dependencies.
- Each host owns `rules.json` for deterministic path floors and `rubric.md` as
  the single definition of LOW, MEDIUM, and HIGH.
- Code guarantees floors only for host rules, unsuccessful required
  validation, and changes of 250 lines or more.
- Codex applies the host rubric and may raise, never lower, that floor.
  Uncertainty, missing or contradictory context, and deleted or weakened tests
  are AI evidence rather than separate coded signals.
- LOW and MEDIUM map to a developer familiar with the affected area; HIGH maps
  to a Tech Lead or relevant SME.
- Missing or invalid AI output falls back to the floor. Authority language
  withholds AI prose while retaining its valid tier.
- The PR comment is canonical. Email and Slack send the same short summary on
  the first result or a tier change. Plain unauthenticated SMTP uses Python's
  standard-library `smtplib` in the trusted host workflow so the router package
  remains dependency-free. Both transports are best-effort.
- The attention workflow uses explicit evidence, classify, finalize, email,
  Slack, and publish jobs so every stage and notification outcome is visible.
  Human authority and the trusted/untrusted checkout boundary from ADR-0001
  remain unchanged.

## Consequences

The entire decision path can be explained as: rules identify known locations,
the rubric defines actual behavior, the higher of the coded floor and Codex
judgment wins, and one comment records the result.

The executable workflow self-check is removed. Workflow changes are
deterministic HIGH and depend on ordinary code review plus live acceptance
testing after landing. Richer deterministic context signals are deliberately
traded for a smaller, more teachable V1. If email later requires
authentication, TLS policy, templates, attachments, retries, or shared
application behavior, replace `smtplib` with an approved Node adapter such as
Nodemailer rather than expanding the generic router.

ADR-0001 remains authoritative for classification-only scope and human
approval/merge authority. Where ADR-0001's original implementation details
name deterministic material-context handling or package-owned email, this ADR
supersedes those details without expanding router authority.

## Revision: explicit workflow stages

The first lean workflow had two jobs, which hid stage and notification
outcomes inside steps. The workflow now uses six visible jobs: Collect trusted
evidence, Classify with Codex, Finalize attention result, Notify email, Notify
Slack, and Publish attention result. This is an observability choice only: the
package remains lean, classification stays in `route.ts`, and every job keeps
least-privilege permissions. A failed alert is visible as its own failed job
while the persistent comment still publishes.
