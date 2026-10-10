# Repository attention rubric — customize this

Describe your actual application, important contracts and verification gaps.
The router enforces the floor. All tiers require human review.

## Engineering context

Add explicit local Markdown links to engineering documents that actually exist
under docs/ in your trusted repository. With no links, no extra context is loaded.

## LOW

Localized, mechanically verifiable change with no shared or security impact.

## MEDIUM

Shared behavior or contracts, deleted tests, operational guidance or uncertain
impact across multiple consumers. Inspect callers and validation evidence.

## HIGH

Identity/authorization, secrets, workflow trust, new data destinations or weakened
safety requirements, regardless of filename. Require a Tech Lead or relevant SME.
