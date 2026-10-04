# Personal Mac POC Build Prompt

Copy the prompt below into the AI coding agent on the personal Mac after cloning the complete repository. The repository is the source of truth; preserve the existing implementation and adapt only the environment-specific integration.

## Prompt

You are working in the `risk-based-pr-attention-routing` repository. Continue and validate the existing Risk-Based PR Attention Router proof of concept on this personal Mac and its GitHub repository. Do not recreate the application from memory or replace working code with a new scaffold.

Before changing code, read these files completely:

- `AGENTS.md`
- `README.md`
- `docs/adr/ADR-0001-route-attention-before-automation.md`
- `docs/design/2026-10-02-react-attention-router-poc-design.md`
- `docs/runbooks/local-actions-runner.md`
- `docs/runbooks/pr-attention-notification.md`
- `.github/workflows/validate.yml`
- `.github/workflows/pr-attention-review.yml`

### Product purpose

The repository is a controlled test ground for routing human review attention. V1 classifies and notifies only. It must never approve, merge, deploy, release, or modify pull request source.

The router uses two layers:

1. Deterministic repository evidence establishes a minimum `LOW`, `MEDIUM`, or `HIGH` attention tier.
2. Codex evaluates broader context and may raise that tier, but may never lower the deterministic minimum.

The risk dimensions are probability, impact, detectability, and blast radius. Conservative over-classification is acceptable during the POC; under-classification is the more serious failure.

Reviewer routing is:

- `LOW`: non-lead developer; still requires human review in v1 and may be identified as a future agent-only candidate.
- `MEDIUM`: non-lead developer performing standard review.
- `HIGH`: Tech Lead or relevant subject-matter expert.

### What the Vite application does

`apps/attention-router` is a standalone Vite, React, and strict TypeScript application. It is not a One App module and must not use Amex production dependencies or services.

The dashboard is a visual explanation and synthetic test surface for the router. It:

- presents LOW, MEDIUM, and HIGH summary cards;
- filters a synthetic pull-request review queue by tier;
- displays the selected PR's probability, impact, detectability, blast radius, review focus, reviewer type, and missing evidence;
- explains that deterministic rules create a floor and AI can only raise it;
- preserves human authority visibly in the UI; and
- uses accessible functional components, keyboard-operable controls, semantic landmarks, visible focus, sufficient contrast, and text in addition to color.

The dashboard currently reads synthetic fixture data from `apps/attention-router/src/data/samplePullRequests.ts`. It is not a live GitHub dashboard and does not need a backend or MCP API for this phase. Real classification results are exercised through GitHub pull requests and Actions. The reference screenshot is `apps/attention-router/public/assets/pr-attention-router-dashboard.png`.

### Where the implementation lives

- `.github/workflows/validate.yml` runs repository validation.
- `.github/workflows/pr-attention-review.yml` collects evidence, invokes Codex, enforces the floor, publishes the PR result, and sends notifications.
- `.github/attention-router/` contains the Codex prompt and JSON schema.
- `.github/scripts/publish-attention-comment.js` manages the single persistent PR comment.
- `apps/attention-router/src/scripts/` contains deterministic classification, floor enforcement, and comment-state logic.
- `apps/attention-router/scripts/` contains the evidence collector, classification normalizer, and email CLI.
- `apps/attention-router/src/notifications/` contains email configuration and message logic.
- `apps/attention-router/src/__tests__/` contains UI, router, comment, and notification tests.

The `.github` directory is the workflow control plane, but it is not sufficient by itself. The full repository is required because the deterministic engine, notification code, UI, tests, and architectural boundaries live elsewhere.

### Personal GitHub adaptation

Keep the product behavior and safety boundary unchanged while replacing only Amex-specific infrastructure that is unavailable on the personal Mac:

- use an available GitHub-hosted or personal self-hosted runner;
- use the official Node setup action instead of an internal Amex setup action;
- use the repository's hosted or public GitHub;
- store the OpenAI credential only as the repository secret;
- `OPENAI_API_KEY`; never place it in source, workflow text, output, or logs;
- use the official `openai/codex-action` with a pinned, reviewed version. Run both the Codex sandbox and the action safety strategy in read-only mode.
- keep `actions/checkout` configured with `persist-credentials: false`;
- give each job explicit least-privilege permissions.
- remove Amex proxy, certificate, SMTP, runner-label, and internal-action assumptions only when they do not apply to the personal environment.
- treat email as optional until the Resend adapter is implemented, its sender domain is verified, and an intentional delivery test is approved. Store `RESEND_API_KEY` only as a repository secret.
- keep Slack disabled during initial validation to avoid notification noise.

Before selecting action versions or changing action inputs, check the current official action documentation. Do not weaken the read-only boundary merely to make the workflow pass.

### Required behavior

Preserve these invariants:

- Deterministic evidence is collected from the exact PR base and head SHAs.
- Missing Jira context alone does not prevent LOW when the PR otherwise provides sufficient intent and risk evidence.
- Missing or conflicting material context prevents LOW.
- Failed validation, shared/configuration changes, large changes, and sensitive workflow or security changes retain their documented deterministic floors.
- Schema-invalid AI output fails closed.
- An AI result below the deterministic floor is raised to the floor.
- One versioned PR comment is updated instead of creating duplicates.
- Email is change-only: send on the first classification or a tier change, not on same-tier updates.
- Notification failure must not silently change the classification result.
- Pull requests from untrusted forks must not receive provider credentials.

### Validation

Run the application locally:

```bash
npm ci --prefix apps/attention-router
npm run dev --prefix apps/attention-router
```

Vite should serve the dashboard at the URL it prints, normally `http://localhost:5173`.

Before requesting review, run:

```bash
npm ci --prefix apps/attention-router
npm run lint --prefix apps/attention-router
npm run typecheck --prefix apps/attention-router
npm test --prefix apps/attention-router
npm run build --prefix apps/attention-router
git diff --check
```

Then validate the workflow with three small, separate synthetic PRs:

1. `LOW`: isolated copy, styling, documentation, or accessibility text with passing tests and no shared contract change.
2. `MEDIUM`: shared filtering/state, a user-consumer adapter, build configuration, or a change spanning multiple UI features.
3. `HIGH`: simulated authorization/security policy, sensitive workflow permissions, dependency/release behavior, or a difficult-to-reverse contract change.

For each PR, record the deterministic floor, final tier, rationale, reviewer type, comment behavior, and whether notification behavior matched the policy.

### Completion criteria

The work is complete when:

- the dashboard runs and all local checks pass;
- the validation workflow passes on the selected runner;
- the Codex job authenticates with the repository secret and remains read-only;
- LOW, MEDIUM, and HIGH test PRs never produce a tier below their deterministic floor;
- the workflow updates one persistent PR comment;
- the email omits settings follow the change-only policy; and
- no workflow can approve, merge, deploy, release, or modify PR source.

Make changes on a short-lived branch, use conventional commits, preserve unrelated files, and summarize any personal-environment adaptation separately from product behavior changes.
