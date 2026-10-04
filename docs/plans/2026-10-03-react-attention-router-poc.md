# React Attention Router POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox `- [ ]` syntax for tracking.

**Goal:** Build a standalone React test application and a pull-request workflow that validates real feature/fix commits, classifies required attention, maintains one PR comment, and sends change-only email notifications.

**Architecture:** Keep one npm package at `apps/attention-router` containing the Vite UI plus reusable TypeScript classification and notification modules. Extend the existing `validate.yml` workflow into a least-privilege multi-job pipeline so validation evidence establishes a deterministic floor before `openai/codex-action@v1` produces structured AI classification. Store prior tier state in the persistent PR comment; keep all credentials in GitHub configuration.

**Tech Stack:** Node.js 22, npm, Vite, React, strict TypeScript, Vitest, React Testing Library, CSS Modules, Nodemailer, GitHub Actions, `openai/codex-action@v1`.

**Specs:** `docs/design/2026-10-03-react-attention-router-poc-design.md`

## Global Constraints

- The app lives at `apps/attention-router` inside this repository and has no nested `.git` directory.
- The POC is standalone: no One App runtime, DLS, Amex production service, or production credential dependency.
- TypeScript uses strict mode, no `any`, and lint public rules where relevant.
- React uses accessible functional components and CSS Modules; tier meaning is never color-only.
- V1 classifies and notifies only. It cannot approve, merge, deploy, release, or modify PR source.
- Deterministic rules establish a minimum tier; Codex may raise but never lower it.
- The PR comment updates every successful run; email sends only for initial classification or a tier change.
- LOW remains a human review in V1 while identifying future agent-only candidates.
- POC-owned jobs use `self-hosted, macOS, ARM64`; local runner automation never moves to the real repositories.
- Secrets, tokens, SMTP settings, channel IDs, and recipient addresses remain outside source control.
- Do not use a git worktree for this implementation.

## Review Focus

- Empty or conflicting PR context must prevent LOW without treating absent Jira alone as material.
- An AI tier below the deterministic floor must be raised to the floor before publishing.
- Missing or malformed comment markers must create one new comment without duplicating existing marked comments.
- Same-tier persistence events must update the comment without sending email.
- Notification transport failure must be visible without changing or invalidating the classification result.

## Task 1: Approve the architecture and repository boundaries in documentation

**Files:**

- Modify: `README.md`
- Modify: `docs/adr/ADR-0001-route-attention-before-automation.md`
- Create: `docs/design/2026-10-03-react-attention-router-poc-design.md`
- Create: `docs/plans/2026-10-03-react-attention-router-poc.md`

**Interfaces:**

- Consumes: Approved architect feedback and POC decisions.
- Produces: Binding V1 authority boundary, risk vocabulary, notification policy, and implementation spec.
- PR updates: `README` to documentation diff against the approved decisions.

- [ ] **Step 1: Confirm that One SEO identifies the team/rubric, `one-seo` identifies the frontend repository, the three POC repositories are isolated from both real repositories, and conservative over-classification is an MEAN success criteria.**

- [ ] **Step 2: Validate formatting**

Run: `git diff --check`

Expected: exit 0 with no output.

- [ ] **Step 3: Commit the documentation baseline**

```bash
git add README.md docs/adr/ADR-0001-route-attention-before-automation.md docs/design/2026-10-03-react-attention-router-poc-design.md docs/plans/2026-10-03-react-attention-router-poc.md
git commit -m "docs: define React attention router POC"
```

## Task 2: Establish the standalone Vite package and validation toolchain

**Files:**

- Create: `apps/attention-router/package.json`
- Create: `apps/attention-router/package-lock.json`
- Create: `apps/attention-router/.nvmrc`
- Create: `apps/attention-router/index.html`
- Create: `apps/attention-router/tsconfig.json`
- Create: `apps/attention-router/tsconfig.app.json`
- Create: `apps/attention-router/tsconfig.node.json`
- Create: `apps/attention-router/vite.config.ts`
- Create: `apps/attention-router/eslint.config.js`
- Create: `apps/attention-router/src/test/setup.ts`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: Node.js 22 and npm.
- Produces: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` commands used by all later tasks and CI.

- [ ] **Step 1: Create package configuration without production components**

Set package name to `attention-router-poc`; add scripts `dev`, `build`, `lint`, `typecheck`, `test` (`vitest run`), and `test:watch` (`vitest`). Add runtime dependencies `react`, `react-dom`, and `nodemailer`. Add development dependencies `eslint/js`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@types/node`, `@types/nodemailer`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `axe-core`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `jsdom`, `tsx`, `typescript`, `typescript-eslint`, `vite`, and `vitest`. Configure Vitest with jsdom and React Testing Library setup.

- [ ] **Step 2: Install and lock dependencies**

Run: `npm install --prefix apps/attention-router`

Expected: a committed `package-lock.json` and an audit result recorded for review.

- [ ] **Step 3: Verify the empty toolchain**

Run: `npm --prefix apps/attention-router run typecheck && npm --prefix apps/attention-router run lint`

Expected: both commands exit 0.

- [ ] **Step 4: Commit the toolchain**

```bash
git add .gitignore apps/attention-router
git commit -m "chore: scaffold attention router app"
```

## Task 3: Build the Attention Router dashboard test-first

**Files:**

- Create: `apps/attention-router/src/__tests__/App.spec.tsx`
- Create: `apps/attention-router/src/App.tsx`
- Create: `apps/attention-router/src/App.module.css`
- Create: `apps/attention-router/src/main.tsx`
- Create: `apps/attention-router/src/data/samplePullRequests.ts`
- Create: `apps/attention-router/src/components/TierCard.tsx`
- Create: `apps/attention-router/src/components/TierCard.module.css`
- Create: `apps/attention-router/src/components/ReviewQueue.tsx`
- Create: `apps/attention-router/src/components/ReviewQueue.module.css`
- Create: `apps/attention-router/src/components/EvidencePanel.tsx`
- Create: `apps/attention-router/src/components/EvidencePanel.module.css`

**Interfaces:**

- Consumes: base SHA, head SHA, PR body, validation result, and git diff output.
- Produces: `RiskTier`, `ReviewerType`, and `SamplePullRequest` readonly types from `domain/attention.ts`.
- Produces: A responsive UI with aria-pressed tier filters and sample LOW/MEDIUM/HIGH review evidence.

- [ ] **Step 1: Write failing dashboard behavior and accessibility tests**

In `src/__tests__/App.spec.tsx`, assert that the dashboard renders its heading, three labeled tier cards, all sample PRs by default, filters by tier through keyboard-operable buttons, displays selected PR evidence, and has no automated accessibility violations.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm --prefix apps/attention-router test -- src/__tests__/App.spec.tsx`

Expected: FAIL because `App` and its domain components do not exist.

- [ ] **Step 3: Implement the minimum accessible dashboard**

Implement the domain types, static samples, functional components, local filter state, semantic landmarks, and visible tier labels required by the tests.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm --prefix apps/attention-router test -- src/__tests__/App.spec.tsx`

Expected: all dashboard tests pass with no warnings.

- [ ] **Step 5: Add the polished responsive CSS Modules presentation**

Use navy/neutral surfaces with green/amber/red accents, visible focus states, responsive grids, and reduced-motion-safe transitions. Re-run the dashboard test after styling.

- [ ] **Step 6: Verify the complete app**

Run: `npm --prefix apps/attention-router run lint && npm --prefix apps/attention-router run typecheck && npm --prefix apps/attention-router test && npm --prefix apps/attention-router run build`

Expected: all four commands exit 0 and Vite creates `dist/`.

- [ ] **Step 7: Commit the dashboard**

```bash
git add apps/attention-router
git commit -m "feat: add attention router dashboard"
```

## Task 4: Implement deterministic evidence and minimum-tier classification test-first

**Files:**

- Create: `apps/attention-router/src/__tests__/router/evaluateDeterministicFloor.spec.ts`
- Create: `apps/attention-router/src/__tests__/router/normalizeClassification.spec.ts`
- Create: `apps/attention-router/src/__tests__/router/routeClassification.spec.ts`
- Create: `apps/attention-router/src/__tests__/router/commentState.spec.ts`
- Create: `apps/attention-router/src/router/evaluateDeterministicFloor.ts`
- Create: `apps/attention-router/src/router/normalizeClassification.ts`
- Create: `apps/attention-router/src/router/routeClassification.ts`
- Create: `apps/attention-router/src/router/commentState.ts`
- Create: `apps/attention-router/src/domain/attention.ts`
- Create: `apps/attention-router/scripts/collectPullRequestEvidence.ts`

**Interfaces:**

- Consumes: base SHA, head SHA, PR body, validation result, and git diff output.
- Consumes: parser output and AI classification.
- Produces: deterministic floor, normalized classification, and JSON containing `floor`, `rationale`, and `missingEvidence`.

- [ ] **Step 1: Write failing pure parser and floor tests**

Cover isolated copy/style changes as LOW, shared hooks/services, dependency/configuration changes, the `250 or more changed lines` case, failed validation, and missing/conflicting material context as at least MEDIUM; sensitive workflow/authentication/persistence and sensitive workflow actions as HIGH. Assert that missing Jira alone remains LOW when PR intent is sufficient.

- [ ] **Step 2: Run the router tests and verify RED**

Run: `npm --prefix apps/attention-router test -- src/__tests__/router`

Expected: FAIL because the parser and evaluator do not exist.

- [ ] **Step 3: Implement parsers and `evaluateDeterministicFloor`**

Use explicit ordered tier ranks and documented path/semantic rules. Keep git process execution in the CLI and all classification decisions in pure functions.

- [ ] **Step 4: Run the router tests and verify GREEN**

Run: `npm --prefix apps/attention-router test -- src/__tests__/router`

Expected: all parser and deterministic-floor tests pass.

- [ ] **Step 5: Verify the collector against the current branch**

Run the collector with local base/head SHAs and inspect the generated JSON for changed-file counts, validation result, context state, and floor.

Expected: valid JSON with no credentials, environment secrets, or file contents unrelated to classification.

- [ ] **Step 6: Commit deterministic classifications**

```bash
git add apps/attention-router/src/router apps/attention-router/scripts
git commit -m "feat: add deterministic attention floor"
```

## Task 5: Enforce AI output and change-only comment state test-first

**Files:**

- Create: `apps/attention-router/src/__tests__/router/classification.spec.ts`
- Create: `apps/attention-router/src/router/classification.ts`
- Create: `apps/attention-router/src/__tests__/router/commentState.spec.ts`
- Create: `apps/attention-router/src/router/commentState.ts`
- Create: `apps/attention-router/src/router/renderClassification.ts`
- Create: `apps/attention-router/src/router/normalizeClassification.ts`
- Create: `apps/attention-router/scripts/normalizeClassification.ts`
- Create: `.github/attention-router/classification-prompt.md`
- Create: `.github/attention-router/classification.schema.json`

[Middle tasks/steps are not visible in the supplied screenshots.]

## Task 8: Run the external-delivery sanity sequence

Update the controlled PR with a documented HIGH workflow or authorization-policy change.

Expected: one HIGH email is delivered to the lead list, and the PR comment updates.

- [ ] **Step 7: Record evidence without secrets**

Add run URLs, observed tiers, delivery outcomes, and discrepancies to the PR description or a POC results document. Never paste message tokens, API keys, SMTP credentials, or recipient configuration.
