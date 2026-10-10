# PR Attention Router v1 Release Design

**Date:** 2026-10-10

## Goal

Release `@p3sg/pr-attention-router` 1.0.0 as a public Apache-2.0 npm package with a
small explicit API, reproducible package contents, consumer-level validation,
and token-free staged publication with npm provenance.

## Product boundary

The npm product remains the classification-only router under
`packages/pr-attention-router`. The private dashboard, API, OAuth setup,
Netlify configuration, repository policy and credentials are not package
dependencies and must never enter the tarball. Host repositories continue to
own their rubric, path rules and engineering context.

The package uses the organization-owned npm scope
`@p3sg/pr-attention-router`. Registry and provenance metadata use the
repository's matching identity:

- author: Joe Davault
- repository: `https://github.com/p3sg/risk-based-pr-attention-routing`
- package directory: `packages/pr-attention-router`
- issues: the repository's GitHub Issues page
- homepage: the package directory on the repository's default branch

The repository and npm trusted-publisher binding use the same `p3sg` owner.

## Public contract

The supported JavaScript/TypeScript entry points are exactly:

- `@p3sg/pr-attention-router`
- `@p3sg/pr-attention-router/publication`

The supported executable remains `pr-attention-router`. Prompt/schema files and
copyable integration examples are packaged assets. `publish-record.js` remains
a workflow-only executable artifact required by the example workflow; it is
not importable through a package export. No wildcard subpath export is allowed.

`Publication` records are closed schemas. The top-level record, analysis object
and each risk-dimension object reject unknown properties. This prevents
unreviewed authority or behavior fields from being accepted, preserved or
republished.

## Reproducible packaging

Every build removes `dist` before TypeScript emits files or assets are copied.
The package manifest explicitly allowlists each supported compiled module,
declaration, asset and example. A committed smoke test packs the package into a
temporary directory, installs it into an isolated consumer and verifies:

- the exact tarball file inventory;
- executable permissions and CLI behavior;
- JavaScript and TypeScript imports from supported entry points;
- rejection of private/internal subpath imports;
- absence of applications, secrets, Netlify files and stale build output.

Node 24 remains the declared and tested minimum. The package has no runtime
dependencies. Development-tool advisories and the full repository lockfile are
audited before release.

## Documentation and versioning

The package uses Apache-2.0 and includes the standard license text. Package
metadata includes description, keywords, author, repository, homepage, bugs,
engine and public registry configuration. README commands must match the CLI's
rendered usage and distinguish source-repository commands from installed
package commands.

The version changes from 0.2.0 to 1.0.0 only in the release-hardening change,
after parser, build and consumer tests exist. The root lockfile records the same
version. The root README and installation guide continue to explain that the
dashboard/API/Netlify deployment is independent of package adoption.

## Trusted release flow

A dedicated GitHub-hosted workflow stages releases from a published GitHub
release whose tag exactly matches `v<package version>`. It uses explicit
least-privilege permissions: `contents: read` and `id-token: write`. It installs
with scripts disabled, runs the complete package checks and isolated smoke test,
and invokes `npm stage publish` from the package directory.

The npm trusted publisher is bound to:

- GitHub owner: `p3sg`
- repository: `risk-based-pr-attention-routing`
- workflow filename: `publish-npm.yml`
- stage-publish permission only

No npm token is stored in GitHub. Trusted OIDC publication automatically emits
provenance for a public repository and public package. A human maintainer must
inspect and approve the staged version with npm 2FA before it becomes public.
After bootstrap, traditional token publishing is disabled in npm package
settings.

Publishing itself is an operator action and is not performed by this
implementation task.

## Acceptance criteria

1. Unknown publication fields at every modeled level are rejected by tests.
2. A seeded stale `dist` file cannot survive a build or enter the tarball.
3. Only the two documented module entry points resolve; internal subpaths fail.
4. The isolated consumer smoke test validates runtime imports, declarations,
   CLI execution, permissions and exact package contents.
5. The package is version 1.0.0, Apache-2.0 licensed and has complete, truthful
   npm/GitHub metadata.
6. Package, root and installation documentation agree with actual commands and
   the classification-only authority boundary.
7. Node 24 typecheck, unit tests, build, host-config check, package smoke,
   `npm audit` and `git diff --check` pass.
8. The release workflow contains no long-lived npm credential and stages only a
   tag/version-matched, fully validated package from a GitHub-hosted runner.
