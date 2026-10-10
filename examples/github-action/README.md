# Copyable GitHub Actions integration

This is the hosted reference workflow adapted to install a reviewed npm package
instead of using monorepo source. Replace every `REPLACE_WITH_REVIEWED_VERSION`
placeholder after publishing/choosing a reviewed release, configure your verification
workflow name, and copy to `.github/workflows/pr-attention-review.yml`.

Preserve default-branch trust, author/repository/head validation and least-privilege
job boundaries. Configure host-owned rules/rubric and optional engineering docs.
No P3 dashboard, backend, database or OIDC setup is required.
