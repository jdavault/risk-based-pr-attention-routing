# PR Attention Router rubric

The single definition of LOW, MEDIUM, and HIGH for this repository. Path floors live in `rules.json`; this file defines what each tier means so a developer and Codex apply the same standard. Reviewer authority is fixed by the router, not by this file.

## Repository

This repository is an isolated proof of concept for classification-only pull request attention routing. It contains a reusable router package, GitHub Actions workflows, host policy, and an optional React dashboard populated with synthetic examples. Validation covers package types and tests plus dashboard lint, types, tests, and build. It does not verify live Slack delivery or visual quality, and the project has no production deployment authority. The dashboard has no backend API, authentication, or database. Its application contracts are the router types and result shape it imports, plus its shared domain types and sample-data shape.

## LOW

**Definition.** A localized, readily detectable dashboard or explanatory change that does not alter shared behavior or contracts, weaken validation, or change the router, its policy, or CI.

**Examples.** Copy, markup, styling, or accessibility inside one dashboard component such as `TierCard.tsx`, `ReviewQueue.tsx`, or `EvidencePanel.tsx` and its CSS module; added tests that preserve or improve existing coverage; and explanatory planning or handoff documentation outside operational runbooks, ADRs, and installation guidance. LOW does not include shared filtering or selection behavior, a shared contract change, deleted or weakened tests, or public demo evidence that may contain identities or external endpoints.

**Blast radius.** One dashboard component or document. A mistake is visible, does not change classifications, and is cheap to revert.

**Review focus.** Rendered behavior, accessibility, wording accuracy, and the specific test or example being changed. Because CI does not verify visual quality, manually inspect the affected component when appearance changes.

## MEDIUM

**Definition.** A change to a shared dashboard surface, repository build or dependency contract, test safety net, public demo evidence, or operational guidance where a mistake can affect multiple consumers but remains recoverable through ordinary developer review.

**Examples.** The dashboard shell or entry point; filtering, selection, or queue behavior shared across components; shared domain types, sample-data shape, the dashboard's representation of router results, and global styles; removed or weakened dashboard tests and assertions; root or dashboard dependencies; TypeScript, Vite, and ESLint configuration; public screenshots and other demo evidence; operational runbooks, ADRs, installation guidance, repository agent instructions, and non-workflow GitHub configuration. Failed required validation and changes of 250 lines or more also receive a coded MEDIUM floor.

**Blast radius.** Multiple dashboard components, the information presented to demo viewers, validation steps, adopters, or contributors can be affected.

**Review focus.** Consumers of the shared surface, build and test evidence, whether removed assertions reduced regression detection, manual rendering of visual changes, sensitive information in public assets, dependency provenance, and whether the documented trust boundary is accurate.

## HIGH

**Definition.** A change that can weaken CI or credential isolation, alter the classification guarantee, or systematically misroute review attention.

**Examples.** Any file under `.github/workflows/`; any file in `packages/pr-attention-router/`; and any file in `config/pr-attention-router/`.

**HIGH by behavior, wherever it appears.** Introducing credential handling or a new external data destination; adding deployment or production authority; weakening the separation between untrusted pull-request content and jobs that hold secrets or write to GitHub; or deleting or weakening tests that protect floor enforcement, output validation and sanitization, or the human-authority boundary.

**Blast radius.** A mistake can misclassify every pull request processed by the proof of concept, expose credentials used by its workflow, or corrupt the persistent PR comment that reviewers rely on.

**Review focus.** Least-privilege permissions, trusted versus untrusted checkouts, floor enforcement, AI fallback behavior, secret exposure, and rollback.

This repository has no payment flow, authentication surface, database, migration path, sitemap, or production SEO capability. Adopting repositories
add those concerns only when corresponding behavior and paths actually exist.
