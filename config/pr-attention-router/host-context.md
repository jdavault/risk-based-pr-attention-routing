## Repository context

This repository is an isolated proof of concept for classification-only pull
request attention routing. `packages/pr-attention-router` contains the reusable
router, while `apps/attention-router` is an optional React, TypeScript, and Vite
dashboard that displays synthetic LOW, MEDIUM, and HIGH examples. The dashboard
is not required for classification and has no production deployment authority.

Hosted Ubuntu validation checks the router package and dashboard independently.
The router may publish one persistent classification comment and optional
change-only email or Slack notifications. It may not approve, merge, deploy,
release, or modify pull-request source.

Automated checks do not establish visual correctness or verify live SMTP,
ngrok, Slack, or OpenAI endpoints. Treat those integrations and rendered UI
quality as evidence requiring explicit human verification.
