# Local Actions Runner (Optional, Retired from the POC)

<!-- Acceptance probe: a runbook-only comment must retain the MEDIUM floor. -->

## Current status

The active validation and PR Attention Router workflows run on
`ubuntu-24.04`. A self-hosted Mac runner and its smoke-test workflow are not
part of the current installation contract.

This document preserves the earlier local-runner procedure only for future
diagnostics. Do not change an active workflow from GitHub-hosted runners
without reviewing the trust, lifecycle, network, and credential implications.

## When a local runner may help

A local runner can isolate whether a hosted-runner problem comes from network
access, vendor policy, or the workflow itself. It must not be used to weaken
the package/config separation or execute untrusted PR code on a workstation.

Example runner selector:

```yaml
runs-on: [self-hosted, macOS, ARM64]
```

Before using it:

1. Register a short-lived repository runner under **Settings → Actions →
   Runners**.
2. Confirm the labels match exactly.
3. Use a manual diagnostic workflow with `contents: read`,
   `persist-credentials: false`, and no repository secrets.
4. Do not check out or execute a pull-request head.
5. Remove the runner when diagnosis is complete.

## Current hosted validation

Use the repository's real commands instead of a runner smoke test:

```bash
npm ci --ignore-scripts
npm run check
```

The hosted workflow independently validates the reusable router package and
the `apps/par-dashboard` client. The attention workflow then consumes the
exact `Validate repository` conclusion.

## Security notes

A persistent self-hosted runner has access to the workstation account and any
reachable local services. Treat it as infrastructure, not as an ordinary
development process:

- never expose personal credentials or unrelated repositories;
- never run fork or untrusted PR code;
- keep workflow permissions explicit and minimal;
- stop and unregister the runner after diagnosis;
- rotate any credential suspected of exposure.

The production-shaped acceptance path for this POC is GitHub-hosted Ubuntu,
not the retired local Mac runner.
