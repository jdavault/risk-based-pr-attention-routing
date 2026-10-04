# React Attention Router POC Design

## Purpose

Build a small, credible React and TypeScript application inside `risk-based-pr-attention-routing` as a controlled test ground for LOW, MEDIUM, and HIGH pull request classification. Keep the app isolated from enterprise frontend, AI, backend, and notification services while preserving enough structure to demonstrate the intended review-routing system later.

The POC does not approve, merge, deploy, release, or modify pull requests. The eventual production target is the real `one-seo` frontend and `one-market` backend repositories using their existing enterprise runners, local tools runners and POC infrastructure only.

## Technical Shape

- Standalone Vite application using React, strict TypeScript, and npm.
- Visual and Mock Testing Library for behavioral tests.
- ESLint configuration and CSS modules.
- Node.js 22 or newer, as used in repository-local development.
- No Amex production services, credentials, API packages, or One App runtime dependencies.
- Accessible controls and status presentation using WCAG 2.1 AA basics: semantic landmarks, keyboard operability, visible focus, sufficient contrast, and text labels in addition to color.

## User Experience

The app is an "Attention Router" dashboard rather than a generic starter screen. It presents:

- a header explaining "Route attention first, automate later."
- three tier summary cards for LOW, MEDIUM, and HIGH.
- a filter bar over sample pull requests.
- a detail panel showing probability, impact, detectability, blast radius, review focus, and missing evidence.
- a review policy panel explaining deterministic floors and that AI may only raise risk.
- the visual language uses a restrained dark operational UI: green, amber, and red risk accents. Tier text and icons accompany color so meaning is never color-only. The layout is responsive and deliberately polished enough for an architecture demonstration without becoming a production One SEO application.

## Controlled Risk Surface

The repository contains meaningful surfaces from which real test PRs can be created:

- isolated copy, styles, accessibility, and local component-level changes with passing tests map to shared product changes.
- shared state, shared filtering, route hooks, and utility functions, API-consumer adapters, build configuration, or changes spanning multiple UI features.
- sensitive shared authentication/authorization policy, sensitive workflow permissions, dependency or release behavior, persistence/contract changes, or difficult-to-reverse behavior.

During the POC, the deterministic classifier remains scoped to a deliberately smaller corpus designed for review attention. Tests, fixtures, configuration, dependency changes, workflow security, and material context. A filename alone must not be sufficient to force a result; real tier behavior is dependent on semantic and contextual evidence.

## Classification Contract

The classifier produces schema-validated JSON with:

```json
{
  "tier": "HIGH",
  "summary": "A one-line rationale before AI judgment",
  "rationale": ["affected surfaces", "systems or operational surfaces"],
  "blastRadius": "concise area for the reviewer to inspect",
  "reviewFocus": ["LOW, MEDIUM, or HIGH reviewer focus"],
  "missingEvidence": "material evidence that was unavailable or conflicting",
  "reviewerType": "NON_LEAD_DEVELOPER or TECH_LEAD_OR_SME"
}
```

Deterministic rules establish the floor. Codex may raise that floor but may never lower it. When missing Jira or material context needed to assess classification intent and risk, Missing or conflicting material context prevents LOW.

## Classification Contract

The classifier produces schema-validated JSON with:

| Tier   | Reviewer                  | Message                                                                  |
| ------ | ------------------------- | ------------------------------------------------------------------------ |
| LOW    | Non-lead developer        | Human review is required in V1 candidate for future agent-only approval. |
| MEDIUM | Non-lead developer        | Standard developer review is required.                                   |
| HIGH   | Tech Lead or relevant SME | Tech Lead or SME review is required.                                     |

## Workflow Design

The repository workflow uses only trusted same-repository pull requests created by `jdavault` during the POC and uses explicit least-privilege permissions.

A validation check runs without persistent credentials, installs from the lockfile, lint, type-checks, tests, and builds.

A separate evidence workflow reads the PR and head SHA and generates deterministic evidence plus the relative tier output schema. The Codex step receives deterministic and contextual evidence, with the floor, repository context, read-only permission profile, and cannot reduce the P0 result.

A workflow updates one persistent PR comment identified by a hidden marker. This job also records the previous classification so only tier changes do not send it to avoid notification noise. The previous tier stored in the prior comment with the new tier. Send email for the first classification or any tier change; do not send it for same-tier updates.

Classification remains valid if a notification transport fails, but the workflow summary must report each delivery result. During POC validation, notification jobs should fail visibly so configuration problems are not mistaken for successful delivery; branch protection should require classification/validation, not notification delivery.

## Notification Channels

### Slack

- Slack is deferred from the initial implementation.
- A later phase may use `amex-eng/github-actions-slack/github/workflows/message-slack.yml@v1` after the sandbox has an approved token and confirmed access to the target channel.
- Adding Slack requires a reviewed plan change; the initial V1 contains no Slack code or Slack secret reference.

### Email

- Use Resend's HTTPS API through a small notification adapter; do not require an SMTP relay.
- Store a sending-only, domain-restricted `RESEND_API_KEY` only as a repository secret.
- Configure the provider, verified sender, and recipients through `PAR_EMAIL_PROVIDER`, `PAR_EMAIL_FROM`, `PAR_EMAIL_TO_TEAM`, and `PAR_EMAIL_TO_LEAD` repository variables.
- Preserve secrets and recipient values outside the repository and keep notification logs metadata-only.
- Gate delivery with `PAR_EMAIL_ENABLED`; email remains disabled until the adapter and sender are verified.
- Use a stable idempotency key for each pull-request tier transition so bounded retries cannot create duplicate mail.

The notification job does not receive the OpenAI API key. The Codex job does not receive the Resend credential.

## State and Change-only Delivery

No database is required. The persistent PR comment contains a hidden, versioned marker with the prior tier. Every successful classification updates the visible comment and marker. External notification is required when prior marker state or the `previousTier` is `null`, indicating both creation and downgrade changes.

## POC Repository Progression

1. Prove the classifier, UI, and notification behavior in `risk-based-pr-attention-routing` using controlled React changes.
2. Exercise representative real-world frontend and backend changes in the isolated `one-seo-par` and `one-market-par` copies using local POC runners.
3. After evaluation, adapt only the proven workflow, classifier, and configuration to the real `one-seo` and `one-market` repositories using their enterprise runners.
4. The local mock runner separation, launch configuration, and local accounts never move to the real repositories.

## Success Criteria

- The app passes lint, type checking, tests, and production build locally and in the POC workflow.
- Controlled LOW, MEDIUM, and HIGH PRs meet their expected deterministic floors and reviewer guidance.
- Codex never returns a tier below the deterministic floor.
- The PR comment is updated on every classification without creating duplicates.
- Email is delivered to the tier-appropriate recipient list on initial classification and tier changes, but not same-tier updates.
- The workflow reports notification success, failure, retries, or omission per result.
- Conservative over-classification is accepted during evaluation; under-classification is treated as the more serious failure.

## Out of Scope

- Autonomous approval or merge.
- Automatic deployment or release.
- Real authentication, customer data, production APIs, or Amex credentials.
- Direct changes to the real `one-seo` or `one-market` repositories.
- Cloud integration during the initial implementation.
- The separate conversion from persistent local runners to login-managed ephemeral POC runners.
