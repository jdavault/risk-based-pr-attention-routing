# Runbook: PR Attention Router

Code guarantees floors for sensitive files, failed validation, and changes of
250 lines or more. The repository rubric defines LOW, MEDIUM, and HIGH. Codex
may add caution, but can never reduce the coded floor.

Tier definitions: [`config/pr-attention-router/rubric.md`](../../config/pr-attention-router/rubric.md).

## How it runs

After `Validate repository` completes for a same-repository PR:

```text
Collect trusted evidence -> Classify with Codex -> Finalize attention result
  -> Notify email + Notify Slack -> Publish attention result
```

1. **Collect trusted evidence** authorizes the same-repository, human-authored
   PR against the validated SHA, reads the PR checkout, collects paths, line
   count, validation state and metadata, and summarizes the deterministic
   floor. It has no secrets or write permission.
2. **Classify with Codex** builds the prompt from bounded evidence and runs
   Codex read-only. It holds the OpenAI key and has no GitHub write permission.
3. **Finalize attention result** reads the existing bot comment, computes
   `max(floor, Codex)`, derives the reviewer and notification decision, and
   passes one bounded result downstream. It has no PR checkout or notification
   credentials.
4. **Notify email** and **Notify Slack** run in parallel only for the first
   classification or a tier change. Each job has only its own destination
   credentials and no repository permissions. A failed alert is visible but
   never blocks publication.
5. **Publish attention result** runs after both notification jobs regardless
   of their outcome, creates or updates the persistent comment, and summarizes
   the floor, final tier, reviewer, AI flags, comment action, and notification
   outcomes.

Codex failure produces a floor-only comment. Authority language preserves the
AI tier but withholds its prose.

## Settings

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `PAR_APP_WORKFLOWS_ENABLED` | `true` runs the router; keep enabled for this POC. |
| Variable | `PAR_AI_ENABLED` | `false` skips Codex; anything else enables it. |
| Variable | `PAR_EMAIL_ENABLED` | `true` sends change-only email; keep enabled. |
| Variable | `PAR_EMAIL_FROM` | SMTP sender. |
| Variable | `PAR_EMAIL_TO_TEAM` | LOW/MEDIUM recipients. |
| Variable | `PAR_EMAIL_TO_LEAD` | HIGH recipients. |
| Variable | `SMTP_HOST` | Runner-reachable unauthenticated SMTP host. |
| Variable | `SMTP_PORT` | SMTP port, normally `25` or the ngrok TCP port. |
| Variable | `PAR_SLACK_ENABLED` | `true` sends change-only Slack alerts; keep enabled. |
| Variable | `PAR_SLACK_CHANNEL_ID` | Slack destination. |
| Secret | `OPENAI_API_KEY` | Classify with Codex job only. |
| Secret | `SLACK_BOT_TOKEN` | Notify Slack job only; `chat:write`. |

Plain unauthenticated SMTP uses Python's standard-library `smtplib` in the
Notify email job. It adds no router dependency. If requirements expand to
authentication, TLS policy, templates, attachments, retries, or shared
application behavior, replace it with an approved Node/Nodemailer adapter.

## Change rules or tiers

- `rules.json` contains reliable path-based MEDIUM/HIGH floors.
- `rubric.md` contains semantic tier meaning and behavior paths cannot reveal.
- Run `node packages/pr-attention-router/route.ts check config/pr-attention-router .`.
- Both files are deterministic HIGH.

This repository has 3 HIGH and 5 MEDIUM rules; no target is exceeded.

## Diagnose a run

1. Confirm validation concluded `success`, `failure`, or `timed_out` for a
   same-repository PR.
2. Confirm a human author currently has write access.
3. Confirm current and validated head SHAs match.
4. Inspect Classify with Codex. Failure should fall back, not prevent
   finalization.
5. Inspect Finalize attention result for the final tier and floor.
6. Inspect the separate notification jobs for visible delivery failures.
7. If the comment exists but a notification is absent, check `shouldNotify`
   and its enable flag. For email, check host/port, tunnel, sender, and tier
   recipient. For Slack, check bot membership, token scope, and API response.
   A same-tier rerun intentionally stays quiet.

## Live probes

| Probe | Harmless change | Expected floor |
| --- | --- | --- |
| LOW | Copy in `apps/par-dashboard/src/components/TierCard.tsx` | LOW |
| MEDIUM | Comment in `apps/par-dashboard/src/App.tsx` | MEDIUM |
| HIGH | Comment in `.github/workflows/pr-attention-review.yml` | HIGH |
| AI off | Any probe with `PAR_AI_ENABLED=false` | Floor only |

Close probe PRs without merging. Detailed reasoning stays in the comment;
email and Slack remain deliberately thin.
