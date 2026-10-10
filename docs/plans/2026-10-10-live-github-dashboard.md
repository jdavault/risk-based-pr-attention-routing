# Live GitHub Dashboard Implementation Plan

> For agentic workers: use superpowers:executing-plans inline, task by task.

Goal: authenticated P3 dashboard showing real, provenance-checked PR evidence.
Architecture: portable API + existing React UI + workflow-owned result publication.
Tech stack: npm workspaces, Node 24, React/Vite, TypeScript, openid-client, jose,
fflate for bounded GitHub artifact archives; Node tests and Vitest.
Spec: [approved design](../design/2026-10-10-live-github-dashboard.md).

## Global constraints

- Existing checkout, fresh branch from main; no worktree or Turbo.
- Router is the only published product; no application auth dependency in it.
- Server-only PAT, single-owner OIDC, repository allowlist, no database or AI in API.
- All tiers require human review; no automatic approval, merge or deployment.
- Incremental tests and commits, final independent diff review, human merge.

## Review focus

- Forged/replayed classification and spoofed workflow metadata: reject provenance.
- Expired/tampered cookies and wrong issuer/owner: no private data access.
- Partial GitHub outages, truncation and missing artifacts: honest UI states.
- Repository-switch/refresh races: no evidence under the wrong PR or repository.
- Trusted docs and publication packaging: traversal, authority and secret isolation.

## Task 1: Versioned evidence and workflow publication

Files: packages/pr-attention-router/publication.ts and publication.test.ts,
route.ts/prompt/schema, .github/workflows/pr-attention-review.yml.
Interfaces: createPublication(input), parsePublication(value), encode/decode marker.
- [ ] Write tests for record roundtrip, bounds, floor enforcement, malformed inputs.
- [ ] Run node --test publication.test.ts and observe missing functionality.
- [ ] Implement pure result contract and optional structured dimensions; reuse
      existing route output; retain legacy AI output compatibility.
- [ ] Write/read bounded classification.json in trusted publish job; upload result
      artifact and update comment; notifications depend on successful publication.
- [ ] Run router tests/typecheck; commit evidence increment.

## Task 2: Authenticated portable GitHub reader

Files: apps/par-api/src/{config,auth,github,app,server}.ts, tests/*.test.ts,
package.json/tsconfig, adapters/netlify.ts, root lockfile.
Interfaces: createApp(config, dependencies): (Request) => Promise<Response>;
GitHubReader.listPulls(repository) returns queue DTO; session only authorizes owner.
- [ ] Write tests for denied sessions/allowlist, encrypted cookie expiry/tampering,
      provenance metadata/artifact mismatch, bounded reads and upstream failures.
- [ ] Observe failures, implement config/auth/read API and thin host adapters.
- [ ] Exercise OIDC with a local test issuer/HTTP transport seam, real token crypto;
      include wrong state/nonce/issuer/subject and CSRF logout behavior.
- [ ] Run API tests/typecheck and complete affected suite; commit API increment.

## Task 3: Preserve React UX with live API state

Files: App.tsx, components/{ReviewQueue,EvidencePanel}, domain/attention.ts,
api.ts, App.spec.tsx, CSS, Vite proxy; remove runtime synthetic helpers.
Interfaces: session/repository/queue routes from Task 2, publication DTO from Task 1.
- [ ] Replace UI tests with authenticated network-boundary fixtures; assert login,
      filters, selection, stale/unverified evidence, empty/error and refresh races.
- [ ] Observe failures, replace runtime data with fetching; keep existing layout.
- [ ] Remove future auto-approval copy; add repository, refresh and logout controls.
- [ ] Run lint/types/UI tests/build; inspect desktop/mobile and keyboard; commit.

## Task 4: Adoption, engineering knowledge and delivery

Files: docs/architecture.md, security.md, governance.md, ADR/runbooks/demo guide,
config/pr-attention-router/{rules.json,rubric.md}, examples/, package metadata,
Netlify config, README, validation workflow and npm scripts.
- [ ] Test trusted context loading/traversal/bounds before implementation.
- [ ] Author actual architecture/operations docs and explicit three-part examples.
- [ ] Configure trusted document references and path floors; validate tracked globs.
- [ ] Package compiled JS/types/CLI with explicit files allowlist; pack/install smoke
      test from an isolated consumer, without dashboard dependencies.
- [ ] Run all checks, independent review/fixes and git diff --check; commit.
- [ ] Push feature branch and create PR using repository template. Report operator
      setup/live checks pending separately; do not merge or publish to npm.

## Execution ledger

- 2026-10-10: owner explicitly authorized spec, plan, PR and implementation;
  no extra plan confirmation needed. Existing checkout branch starts at 4b72c33.
- Ruling: use trusted GitHub artifact provenance rather than introducing signing
  credentials. Expired artifacts render unavailable; retention documented.
- Ruling: defer advanced retry/SHA reuse per latest refinement; workflow-only AI
  and zero-AI dashboard reads are implemented and tested immediately.
