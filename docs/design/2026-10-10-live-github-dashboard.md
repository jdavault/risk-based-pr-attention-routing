# Live GitHub dashboard and trusted evidence

Approved architecture: 2026-10-10. Implementation scope incorporates the owner's
five refinements. Work uses the existing checkout, a feature branch from main,
and npm workspaces. Human review and merge remain required.

## Product and application boundary

`pr-attention-router` is the distributed Node library/CLI. GitHub Actions is a
separate reference integration. `par-api` and `par-dashboard` are private P3
demonstration infrastructure; neither their authentication nor hosting is an
adoption prerequisite. Only explicitly allowlisted package files ship on npm.
No Turbo, database, SaaS tenancy, GitHub App, or automatic approval/merge/release.

The existing React tier cards, review queue, selection and evidence panel remain.
Replace synthetic records with authenticated reads of explicitly configured
GitHub repositories. GitHub is the source of truth. Refresh never invokes AI.

## Trust and result contract

Add a versioned publication record: repository, PR, head/base SHA, trusted policy
SHA, workflow run ID/attempt, timestamp, floor, final tier, reviewer, AI status,
summary/reasons/focus and optional four dimensions/missing evidence. Bound all
fields and enforce final tier >= deterministic floor; record no merge authority.
Existing AI output remains valid; absent dimensions render as not recorded.

Publish the same record in a machine-readable comment marker and a small
`classification.json` workflow artifact. The dashboard checks record shape,
repository/PR identity, current head (otherwise stale), configured workflow ID
and path, workflow_run event, default-branch run origin/policy SHA, successful
publication job for the recorded attempt, artifact ownership, archive digest,
and equality with the comment record. A copied bot marker is insufficient.
Expired artifacts, unsigned legacy comments and unavailable provenance are
displayed as unavailable/unverified; never silently promoted to trusted LOW.
GitHub and people able to modify the trusted default-branch workflow remain
trust roots. This is provenance verification, not a claim that AI is correct.

Classification stays behind verification completion. Preserve same-repository
human author/write permission checks, verified-head equality, trusted router
checkout, read-only PR inspection and secret isolation. Publish before alerts;
first result/tier change alerts, unchanged tier updates evidence without alerts.
For this increment keep the proven notification decision and document advanced
same-SHA reuse/retry recovery separately; no dashboard action can trigger either.
Never describe pending deduplication as implemented.

## API and authentication

One portable Request -> Response handler in apps/par-api with local Node and
Netlify adapters. Routes: GET /api/auth/login, GET /api/auth/callback,
GET /api/session, POST /api/auth/logout, GET /api/repositories,
GET /api/pulls?repository=owner/name. A bounded per-repository queue returns
classification evidence and current checks for display, with explicit truncation.

Use openid-client authorization code + PKCE, state and nonce, signature/issuer/
audience/expiry validation. Authorize exactly one configured issuer + subject.
Use jose authenticated encryption for short-lived HttpOnly/SameSite=Lax cookies,
Secure on HTTPS, loopback-only HTTP development. Ten-minute login transaction,
one-hour session; verify identity/configuration on every data request. No refresh
tokens or provider tokens retained. Origin-check POST logout. No open redirects.
Logout clears cookies; key rotation invalidates sessions; no individual stolen
cookie revocation without a session store. Missing config fails closed.

Use a server-side fine-grained PAT, read-only PRs, checks/statuses and Actions,
restricted to the same repositories as PAR_REPOSITORIES. Browser inputs cannot
choose upstream hosts/workflows/credentials. No secrets in VITE variables or
logs. No shared caching of private responses; bounded requests/pagination,
timeouts and sanitized errors. Preview deploys receive no production credentials
by default. OIDC issuer/client/subject are operator configuration, not code.

## Engineering context

Author architecture, security, governance, ADR, operations and three-part series
documentation from the actual implemented contracts. Demo scenarios are proposals,
not fabricated measurements or claims of completed security checks.
Path rules enforce known floors; workflow and application code enforce hard
restrictions. Rubric explains semantic risks and explicitly references bounded
Markdown engineering context from the trusted default-branch checkout. Changed
PR docs are evidence, never replacement governing instructions.

## Acceptance criteria

1. Router/package tests run without React/Netlify/auth dependencies; packed
   product excludes apps/secrets and includes CLI, types and adoption examples.
2. Unauthenticated, expired, tampered or wrong-owner sessions cannot reach GitHub;
   authenticated callers cannot read repositories outside the allowlist.
3. OIDC transaction protections and local/Netlify handler parity have tests.
4. Real PR data replaces runtime fixtures. Filters, selection, empty/error states,
   refresh and logout work; stale/unverified results are explicit and not counted
   as current tiers. All tiers require human review.
5. Wrong repo/PR/head/provenance/digest/record data cannot become current evidence.
6. A new workflow run publishes real structured output with no invented dimension
   scores. Notification failure does not invalidate a published classification.
7. The API has no classification or GitHub write operation; refresh tests prove
   read-only traffic. No model secret is deployed with the application.
8. Documentation/rules match implemented paths and trust boundaries; context
   loading rejects traversal, missing files and excessive inputs.
9. Typecheck, router/API/UI tests, lint/build, package smoke test and browser
   keyboard/mobile checks are recorded. Real OIDC/private-repo/Netlify verification
   is reported separately and requires operator configuration, never assumed.

## Three-part series

1. Explain/install the standalone router: floors, rubric, docs and human authority.
2. Follow a real commit through verification, classification and published evidence.
3. Show P3's authenticated live queue, read architecture and trust/failure states.

## Deferred independently testable work

Same-SHA AI reuse (including changed verification outcomes), publication recovery,
and per-channel retry receipts require their own acceptance tests. No exactly-once
notification guarantee. npm publishing and production deployment are release steps,
not consequences of opening this feature PR.
