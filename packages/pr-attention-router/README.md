# @p3sg/pr-attention-router

Classification-only pull-request attention routing. Deterministic code establishes
a minimum LOW, MEDIUM or HIGH tier from host-owned path rules, change size and
validation status. AI applies the host rubric and may raise, never lower, that
floor. The package grants no approval, merge, deployment or release authority.

Version 1.0.0 requires Node 24, has no runtime dependencies and is licensed under
Apache-2.0. React, Netlify, authentication, databases and the private P3 dashboard
are not package dependencies and are not included in the tarball.

## Install

Install a reviewed exact version:

```sh
npm install --save-exact @p3sg/pr-attention-router@1.0.0
```

The supported module entry points are exactly:

```ts
import { route, type RouteResult } from '@p3sg/pr-attention-router';
import {
  parsePublication,
  readPublication,
  type Publication,
} from '@p3sg/pr-attention-router/publication';
```

Internal modules, including the workflow-only publication script, are not public
exports. Publication records are closed schemas: unknown top-level, analysis,
dimension or dimension-detail fields are rejected rather than republished.

## Integrate a host repository

Copy the packaged examples from
`node_modules/@p3sg/pr-attention-router/dist/examples/` into the host repository,
then customize its rubric and path rules. The example workflow is a reference to
review and copy; installing the package does not install or enable a workflow.

Validate host policy against tracked files:

```sh
npx --no-install pr-attention-router check config/pr-attention-router .
```

The trusted workflow uses these commands:

```text
pr-attention-router evidence <paths-z-file> <numstat-file> <verify-conclusion> <base-sha> <head-sha>
pr-attention-router prompt <adapter-dir> <evidence.json> <pull-request.json> [repo-root]
pr-attention-router route <adapter-dir> <evidence.json> <ai-output-file> <pull-request.json> [previous-tier]
pr-attention-router check <adapter-dir> <repo-root>
```

`rules.json` contains a `rules` array of `{id,tier,paths,why}`. Each configured
glob must match tracked paths. `rubric.md` defines contextual LOW/MEDIUM/HIGH
semantics. An optional `## Engineering context` section may link to explicitly
named local `docs/*.md` files from the trusted repository root. The loader accepts
at most eight files and 32 KB, and rejects traversal, URLs and symlinks. Documents
proposed by a pull request remain evidence rather than active policy.

Invalid or unavailable AI output falls back to the deterministic floor. Legacy AI
output without risk dimensions remains readable; missing values are not invented.

## Release status

This repository prepares `@p3sg/pr-attention-router` 1.0.0 for staged publication.
The presence of this manifest does not mean the version is live on npm. Inspect the
packed artifact and the staged package before approving its public release.
