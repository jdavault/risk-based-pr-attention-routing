# PR Attention Router

Route human attention toward consequential changes. Deterministic rules establish
a minimum tier; AI applies the host's rubric and trusted engineering context and
may raise that tier. LOW, MEDIUM and HIGH all require human review. Classification
never grants approval, merge, deployment or release authority.

## Three independent pieces

- `packages/pr-attention-router`: standalone npm product, compiled JS/types/CLI,
  no React, hosting or authentication dependencies.
- `examples/github-action`: separate copyable workflow reference; host-owned
  `rules.json`, `rubric.md` and optional engineering docs define repository policy.
- `apps/par-api` and `apps/par-dashboard`: private P3 demonstration infrastructure.
  The React dashboard reads real GitHub PRs and provenance-checked classifications
  behind single-owner OIDC. It never triggers AI. No database or mock data source.

The project uses **npm workspaces**, not Turborepo. These private apps are not
adopter requirements and are excluded from the npm tarball.

## Work locally

Use Node 24:

```sh
npm ci --ignore-scripts
npm run check
npm run dev
```

`dev` builds the router contract and starts the API on loopback 3001 and Vite on
5173. Follow [Google Workspace setup](docs/setup/p3-dashboard-google.md) for ignored
server-only credentials, exact issuer+subject authorization and Netlify deployment.
Missing configuration fails closed; it never enables mock data or bypasses login.

Focused commands:

```sh
npm test --workspace @p3sg/pr-attention-router
npm test --workspace par-api
npm test --workspace par-dashboard
npm run build
```

## Adopt only the router

See [installation](docs/setup/pr-attention-router-installation.md) and the package
[README](packages/pr-attention-router/README.md). The public package is prepared as
`@p3sg/pr-attention-router` 1.0.0 under Apache-2.0. It requires Node 24, has no
runtime dependencies and exposes only the root and `/publication` module entry
points. This branch prepares and validates packaging; it does **not** claim that
the version has been published to npm.

The workflow uses trusted default-branch code/policy, inspects untrusted PR changes,
publishes a human-readable comment plus bounded structured evidence and an Actions
artifact, then sends enabled notifications only for the first or a changed tier.
Same-SHA AI reuse and delivery retry hardening remain separate follow-up work.

## Design and demonstration

- [Architecture](docs/architecture.md), [security](docs/security.md), [governance](docs/governance.md)
- [Approved specification](docs/design/2026-10-10-live-github-dashboard.md)
- [Implementation plan and evidence](docs/plans/2026-10-10-live-github-dashboard.md)
- [Three-part series](docs/demo-series.md), [operations](docs/runbooks/dashboard-operations.md)

Tests use isolated network fixtures. They do not substitute for the live Google,
Netlify and private-repository acceptance gate. Record actual PR evidence, not
invented throughput, security incidents or model accuracy metrics.
