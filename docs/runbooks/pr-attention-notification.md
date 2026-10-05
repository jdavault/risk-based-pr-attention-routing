# Runbook: PR Attention Router

Code guarantees floors for sensitive files, failed validation, and changes of
250 lines or more. The repository rubric defines LOW, MEDIUM, and HIGH. Codex
may add caution, but can never reduce the coded floor.

Tier definitions: [`config/pr-attention-router/rubric.md`](../../config/pr-attention-router/rubric.md).

## How it runs

After `Validate repository` completes for a same-repository PR:

1. **Classify** checks out trusted router/config and the validated PR head
   separately, authorizes it, collects paths and line count, builds the prompt,
   and optionally runs Codex read-only. It has no write permission.
2. **Publish** computes `max(floor, Codex)`, creates or updates one comment,
   and posts three-line email and Slack alerts only for the first result or a
   tier change. It never checks out PR source.

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
| Secret | `OPENAI_API_KEY` | Classify job only. |
| Secret | `SLACK_BOT_TOKEN` | Publish job only; `chat:write`. |

Plain unauthenticated SMTP uses Python's standard-library `smtplib` in the
trusted publish job. It adds no router dependency. If requirements expand to
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
4. Inspect classify. Codex failure should fall back, not prevent publication.
5. Inspect publish for the final tier and floor.
6. If the comment exists but a notification is absent, check `shouldNotify`
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
