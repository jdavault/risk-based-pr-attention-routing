# PR Attention Router

Host-neutral, classification-only PR attention routing for GitHub Actions.
The package computes and enforces a deterministic LOW, MEDIUM, or HIGH floor,
renders the persistent review comment, and optionally sends change-only email
and Slack notifications.

The package never approves, merges, deploys, releases, or modifies pull-request
source. Each adopting repository owns its path policy, conformance cases, host
context, workflow trigger, recipients, and credentials outside this package.

The TypeScript entry points run directly on Node.js 22.18 or newer. The package
contains no React, Vite, DOM, or repository-specific policy.
