# Claude Handoff: Install the PR Attention Router in Two Applications

## Objective

Use the working proof of concept in
`/Users/davauj2/code/sandbox/risk-based-pr-attention-routing` as a reference
and install the same classification-only PR Attention Router approach into:

1. `/Users/davauj2/code/p3-solutions-group/p3sg-website`
2. `/Users/davauj2/code/smartbites-solutions/apps/smartbites-mobile-v2`

The goal is both implementation and learning: explain how each part works,
identify what is genuinely reusable, and compare what a website and mobile
application need before this approach is taken into work repositories.

## Prompt to give Claude

```text
You are helping me understand and port a working GitHub PR Attention Router
proof of concept into two personal application repositories.

Source/reference repository:
/Users/davauj2/code/sandbox/risk-based-pr-attention-routing

Target repositories:
/Users/davauj2/code/p3-solutions-group/p3sg-website
/Users/davauj2/code/smartbites-solutions/apps/smartbites-mobile-v2

The router's V1 authority is classification and notification only. It must not
approve, merge, deploy, release, or modify pull-request source. Humans retain
all decision authority. Deterministic rules establish a binding LOW, MEDIUM,
or HIGH floor. AI may raise the tier but may never lower that floor.

Start with a read-only audit. Read all AGENTS.md/CLAUDE.md instructions in each
repository and inspect their package managers, workspace boundaries, existing
GitHub workflows, default branches, required validation commands, test suites,
and contributor/fork policies. Do not assume the two repositories have the
same structure.

In the reference repository, read these files before proposing changes:
- AGENTS.md
- SESSION-LOG.md
- README.md
- docs/adr/ADR-0001-route-attention-before-automation.md
- docs/setup/pr-attention-router-installation.md
- docs/runbooks/pr-attention-notification.md
- docs/runbooks/local-actions-runner.md
- .github/workflows/validate.yml
- .github/workflows/pr-attention-review.yml
- .github/attention-router/classification-prompt.md
- .github/attention-router/classification.schema.json
- .github/scripts/read-pr-material-context.js
- .github/scripts/publish-attention.comment.js
- apps/attention-router/scripts/
- apps/attention-router/src/domain/
- apps/attention-router/src/router/
- apps/attention-router/src/notifications/

Important current-state facts:
- The Vite dashboard is optional. Neither target application should need to
  import, build, or deploy it to use PR attention routing.
- The current POC router runtime is colocated under apps/attention-router, so a
  copy-in installation carries accidental React/Vite dependencies.
- packages/pr-attention-router is the intended future modular boundary, but it
  has not been extracted yet. Assess this independently; do not perform a broad
  extraction in all three repositories without first presenting the trade-offs
  and getting my approval.
- Trusted router/workflow code must come from the default branch. PR source is
  checked out separately under .par/target for read-only inspection.
- The workflow currently has jdavault-specific allowlists. Replace these only
  with a deliberate policy appropriate to each target repository; do not
  silently remove the trust boundary.
- Reuse each repository's existing CI/validation contract where possible.
  Disabling the router must never disable normal application CI.
- Current official-action majors are actions/checkout@v7,
  actions/setup-node@v7, and actions/github-script@v8.
- The Codex action is openai/codex-action@v1.8 with safety-strategy: read-only.
- OPENAI_API_KEY and SLACK_BOT_TOKEN are secrets. Never copy secret values from
  the reference repository, print them, or commit them.
- Begin with PAR_APP_WORKFLOWS_ENABLED=false, PAR_EMAIL_ENABLED=false, and
  PAR_SLACK_ENABLED=false. Enable comment-only classification first, then test
  email and Slack separately only with my approval.

Work in short-lived branches created from each target's current main/default
branch. Preserve unrelated and untracked files. Use conventional commits and
pull requests. Do not merge either target PR until I review the implementation
and checks.

First deliver a comparative design before editing:
1. Existing validation workflow and exact install seam in each target.
2. Files that must be copied unchanged, files that need repository-specific
   adapters, and files that should not be copied.
3. Proposed deterministic LOW/MEDIUM/HIGH path rules for the website versus the
   mobile application, with rationale for probability, impact, detectability,
   and blast radius.
4. Contributor/fork trust policy and least-privilege job permissions.
5. Whether to use the current copy-in layout for this learning exercise or
   first extract packages/pr-attention-router in the reference repository.
6. Validation, rollback, and acceptance-test plans.

After I approve the design, implement one target at a time so we can learn from
the first installation before changing the second. Explain each workflow job,
script boundary, permission, secret, variable, and deterministic rule as you
go. Prefer adapting existing CI over duplicating it.

Acceptance criteria for each target:
- Existing application lint, type-check, test, and build checks still pass.
- A harmless localized change can produce LOW when material context is
  SUFFICIENT and validation passes.
- A shared or repository-defined risk path establishes at least MEDIUM.
- A harmless workflow/policy change establishes HIGH.
- FAILED validation still runs classification and establishes at least MEDIUM.
- MISSING or CONFLICTING material context cannot result in final LOW.
- Codex can raise but cannot lower the deterministic floor.
- The persistent PR comment is created or updated.
- A same-tier rerun updates the comment without duplicate email or Slack.
- Notification failure cannot prevent persistent comment publication.
- Workflow logs and source contain no secret values, recipients, or message
  bodies.
- Each target has a small installation note documenting its chosen commands,
  path rules, permissions, variables, secrets, rollout, and rollback.

At the end, give me a side-by-side report of what was universal, what differed,
what should move into packages/pr-attention-router, and what must remain local
repository policy before I attempt the work application.
```

## Reference implementation status

The reference POC has verified hosted validation, Codex classification,
deterministic floors, persistent comments, smtp4dev/ngrok email, Slack bot
delivery, same-tier suppression, and notification-failure isolation. See
`SESSION-LOG.md` for the detailed evidence and known debt.

Do not reuse the current live ngrok endpoint. Start the local services, read
the current dynamic TCP endpoint from the ngrok agent API, and set target
repository variables only when intentionally testing email.
