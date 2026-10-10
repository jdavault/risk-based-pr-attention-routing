# PR Attention Router v1 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@p3sg/pr-attention-router` 1.0.0 a secure, reproducible, publicly releasable Apache-2.0 npm package without publishing it.

**Architecture:** Preserve the existing classification-only library/CLI and close its public surface to two explicit module entry points. Treat the packed tarball—not the workspace source—as the release product, validate it from an isolated consumer, and stage future releases through GitHub OIDC plus human npm approval.

**Tech Stack:** Node.js 24, TypeScript 5.9, npm workspaces, `node:test`, GitHub Actions, npm trusted publishing.

**Spec:** `docs/superpowers/specs/2026-10-10-pr-attention-router-v1-release.md`

## Global Constraints

- Public package name: `@p3sg/pr-attention-router`; version: `1.0.0`; license: Apache-2.0.
- Author: Joe Davault; repository owner: `p3sg`; repository: `risk-based-pr-attention-routing`.
- Node minimum: 24; no runtime dependencies.
- Public module entry points are exactly `.` and `./publication`.
- Dashboard, API, OAuth, Netlify, host policy and credentials never enter the tarball.
- Publishing is not performed in this task.
- Preserve unrelated working-tree changes and stage only release-hardening files.

## Review Focus

- A publication record with an unknown top-level or nested authority field must be rejected rather than normalized or republished.
- A stale file already present in `dist` must be removed before compilation and absent from the tarball.
- An installed consumer must resolve documented imports while internal subpaths return `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- A release tag that differs from `v<package version>` must stop before registry authentication or staging.
- The release workflow must operate without `NODE_AUTH_TOKEN`, an npm secret or a self-hosted runner.

---

### Task 1: Close the publication schema

**Files:**
- Modify: `packages/pr-attention-router/publication.test.ts`
- Modify: `packages/pr-attention-router/publication.ts`

**Interfaces:**
- Consumes: existing `parsePublication(value: unknown): Publication | null`.
- Produces: a closed publication schema that accepts only declared keys at the record, analysis and dimension levels.

- [ ] **Step 1: Write failing parser tests**

Add separate cases proving that `parsePublication()` returns `null` for `mergeAuthority` at the record level, an undeclared analysis field, an undeclared dimension name, and an undeclared property within a dimension.

- [ ] **Step 2: Run the focused test on Node 24 and verify RED**

Run: `node --test packages/pr-attention-router/publication.test.ts`

Expected: the new unknown-property cases fail because current validation accepts them.

- [ ] **Step 3: Implement exact-key validation**

Add a reusable exact-key predicate in `publication.ts` and apply it to the top-level publication, `Analysis`, the dimensions record and every `Dimension`. Preserve existing legacy behavior where `dimensions` and `missingEvidence` may be `null`.

- [ ] **Step 4: Verify focused and complete package tests GREEN**

Run: `npm test --workspace @p3sg/pr-attention-router`

Expected: all package tests pass on Node 24.

### Task 2: Make the tarball reproducible and consumer-tested

**Files:**
- Create: `packages/pr-attention-router/clean.mjs`
- Create: `packages/pr-attention-router/package-smoke.mjs`
- Modify: `packages/pr-attention-router/package.json`
- Modify: `packages/pr-attention-router/route.ts`
- Modify: `.github/workflows/validate.yml`

**Interfaces:**
- Consumes: current TypeScript build and compiled `dist` modules/assets.
- Produces: `npm run package-smoke --workspace @p3sg/pr-attention-router`, which validates the actual tarball from an isolated consumer.

- [ ] **Step 1: Write the failing package smoke test**

Implement a Node script that seeds `dist/stale-release-file.txt`, invokes the package build, packs with lifecycle scripts disabled into a temporary directory, reads the tarball inventory, installs it into a temporary consumer and asserts the spec's exact inventory/import/type/CLI/private-subpath contract. Ensure temporary directories are removed in `finally`.

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `node packages/pr-attention-router/package-smoke.mjs`

Expected: failures identify stale output, wildcard internal imports and the `route.ts` CLI usage label.

- [ ] **Step 3: Implement clean build and explicit package surface**

Make `clean.mjs` remove only the package's resolved `dist` directory. Run it before `tsc`; retain asset copying and executable mode after emit. Replace the wildcard export with `.` and `./publication`, explicitly allowlist all required compiled modules/declarations/assets/examples, and render installed CLI usage with `pr-attention-router`, including the optional trusted repository root.

- [ ] **Step 4: Wire the smoke test into validation**

Add the package script and a named `Package smoke test` step to the existing Node 24 router job after build. Do not add credentials or broader permissions.

- [ ] **Step 5: Verify package build and smoke GREEN**

Run: `npm run typecheck --workspace @p3sg/pr-attention-router && npm test --workspace @p3sg/pr-attention-router && npm run build --workspace @p3sg/pr-attention-router && npm run package-smoke --workspace @p3sg/pr-attention-router`

Expected: every command exits zero; the smoke test reports the v1 tarball contract passed.

### Task 3: Finalize v1 metadata, license and documentation

**Files:**
- Create: `LICENSE`
- Modify: `packages/pr-attention-router/package.json`
- Modify: `package-lock.json`
- Modify: `packages/pr-attention-router/README.md`
- Modify: `README.md`
- Modify: `docs/setup/pr-attention-router-installation.md`

**Interfaces:**
- Consumes: the tested package contract from Task 2.
- Produces: truthful public npm metadata and operator/consumer documentation for version 1.0.0.

- [ ] **Step 1: Extend smoke assertions for release metadata and verify RED**

Assert exact version, license, author, repository URL/directory, homepage, bugs URL, keywords, Node engine, public access, zero runtime dependencies and packaged Apache license.

Run: `node packages/pr-attention-router/package-smoke.mjs`

Expected: metadata/license assertions fail against version 0.2.0 and `UNLICENSED`.

- [ ] **Step 2: Add Apache-2.0 and complete npm metadata**

Add the canonical Apache License 2.0 text. Set version `1.0.0`, Apache-2.0, Joe Davault, exact GitHub repository/directory/homepage/bugs metadata, relevant routing/code-review/automation keywords and `publishConfig.access: public`. Update the root lockfile without installing new dependencies.

- [ ] **Step 3: Synchronize documentation**

Document exact-version installation, installed CLI commands, two module entry points, packaged examples, Node 24, closed publication records, Apache-2.0, no runtime dependencies and the independent private dashboard boundary. Remove all `0.2.0`/`UNLICENSED` pre-release statements. Do not claim npm publication has occurred.

- [ ] **Step 4: Verify metadata and documentation GREEN**

Run: `npm run package-smoke --workspace @p3sg/pr-attention-router && rg -n "0\\.2\\.0|UNLICENSED|route\\.ts (evidence|prompt|route|check)" packages/pr-attention-router README.md docs/setup/pr-attention-router-installation.md package-lock.json`

Expected: smoke passes and `rg` finds no stale release/CLI wording in release-facing files.

### Task 4: Add token-free staged publishing

**Files:**
- Create: `.github/workflows/publish-npm.yml`
- Modify: `docs/setup/pr-attention-router-installation.md`
- Modify: `packages/pr-attention-router/package-smoke.mjs`

**Interfaces:**
- Consumes: a published GitHub release tagged exactly `v1.0.0` and an npm trust binding for `publish-npm.yml`.
- Produces: a GitHub-hosted, OIDC-authenticated `npm stage publish` operation requiring later human 2FA approval.

- [ ] **Step 1: Add failing release-contract assertions**

Extend the smoke test to read `publish-npm.yml` and require a GitHub release trigger, GitHub-hosted runner, exact `contents: read`/`id-token: write` permissions, tag/version verification before publication, Node 24, npm CLI supporting staged publishing, full package validation, package working directory and `npm stage publish`. Reject `NODE_AUTH_TOKEN`, npm secret interpolation, direct `npm publish` and self-hosted runners.

Run: `node packages/pr-attention-router/package-smoke.mjs`

Expected: failure because the workflow does not exist.

- [ ] **Step 2: Implement the staged-release workflow**

Create `publish-npm.yml` for `release: published`. Check out the release tag without persisted credentials, use Node 24 on `ubuntu-24.04`, install a fixed npm CLI version meeting staged/trusted requirements, install workspace dependencies with scripts disabled, compare the release tag to the manifest version, run typecheck/tests/build/config/package smoke/audit, then run `npm stage publish --access public` from `packages/pr-attention-router`. Use no npm token.

- [ ] **Step 3: Document the operator bootstrap and approval**

Record the exact npm trusted-publisher identity (`p3sg`, repository, `publish-npm.yml`, stage-only), the two-day initial validation window, package-level token disablement after bootstrap, staged-artifact inspection and human 2FA approval. Explicitly state that committing the workflow does not publish anything.

- [ ] **Step 4: Verify release contract GREEN**

Run: `npm run package-smoke --workspace @p3sg/pr-attention-router`

Expected: workflow security and staging assertions pass.

### Task 5: Complete release-readiness verification

**Files:**
- Modify only files required to fix failures attributable to Tasks 1–4.

**Interfaces:**
- Consumes: completed v1 release candidate.
- Produces: recorded evidence that the package is ready to stage, not a registry publication.

- [ ] **Step 1: Run the complete local package gate on Node 24**

Run: `npm run check:router && npm run package-smoke --workspace @p3sg/pr-attention-router`

Expected: all typechecks,  unit tests, build, host config and consumer checks pass.

- [ ] **Step 2: Run vulnerability and package-name checks**

Run: `npm audit --workspace @p3sg/pr-attention-router --omit=dev` and `npm audit --workspace @p3sg/pr-attention-router`; confirm zero known advisories. Run `npm view @p3sg/pr-attention-router version`; expect `E404` until the package is created, and stop if another owner has registered it.

- [ ] **Step 3: Inspect the final tarball and source diff**

Run: `npm pack --dry-run --json --ignore-scripts --workspace @p3sg/pr-attention-router`, `git diff --check`, and review `git diff --stat` plus every release-hardening hunk. Confirm no credentials or unrelated files are staged.

- [ ] **Step 4: Request independent code review**

Review the completed diff against this spec, with special focus on unknown-field rejection, tarball allowlisting, smoke-test isolation, release permissions and absence of publication credentials. Fix verified findings and rerun Steps 1–3.
