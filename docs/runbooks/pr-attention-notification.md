# PR Attention Notifications

## Purpose

V1 sends optional email after the final classification and deterministic floor
have been applied. Notification never approves, merges, deploys, releases, or
modifies pull-request source. A delivery failure must not prevent publication
of the persistent classification comment.

Email remains disabled until an intentional delivery test. The personal POC
uses the same SMTP transport shape as the work environment, with smtp4dev as a
local capture server.

## Configuration

Configure these under **Settings → Secrets and variables → Actions**.

### Variables

| Variable | Purpose |
| --- | --- |
| `PAR_EMAIL_ENABLED` | Must equal `true` to permit delivery. Any other value keeps delivery off. |
| `SMTP_HOST` | SMTP host reachable from the self-hosted runner; `localhost` for local smtp4dev. |
| `SMTP_PORT` | SMTP port; `25` for the POC and work-aligned configuration. |
| `PAR_EMAIL_FROM` | Sender address used in notification messages. |
| `PAR_EMAIL_TO_TEAM` | Comma-delimited recipients for LOW and MEDIUM classifications. |
| `PAR_EMAIL_TO_LEAD` | Comma-delimited recipients for HIGH classifications. |

Recipient values must be trimmed, validated, and deduplicated by application
code. Never store API keys or recipient addresses in workflow source or logs.

## Enablement sequence

1. Keep `PAR_EMAIL_ENABLED` absent or set to `false` while configuring SMTP.
2. Start smtp4dev with SMTP on host port `25` and its web inbox on port `8025`.
3. Add the SMTP host, port, sender, and recipient variables.
4. Run notification unit tests locally with a fake transport; tests must not
   call an SMTP server.
5. Send one intentional local message and confirm it appears in smtp4dev.
6. Set `PAR_EMAIL_ENABLED=true` only for an intentional workflow test.
7. Confirm that workflow logs contain delivery metadata only—never the body,
   recipients, or credential.

## Routing and content

- LOW and MEDIUM route to `PAR_EMAIL_TO_TEAM`.
- HIGH routes to `PAR_EMAIL_TO_LEAD`.
- Subjects use `PR Attention <repository> PR #number - <tier>`.
- Bodies include the rationale, deterministic floor, blast radius, requested
  reviewer, review focus, missing evidence, and pull-request URL.

## Change-only behavior

The workflow stores the prior tier in the versioned marker inside the
persistent pull-request comment. Send email on the first classification or
when the tier changes. Do not send email for a same-tier update, even when the
explanatory text changes.

## Failure behavior

Classification and persistent comment publication do not depend on successful
email delivery. An SMTP failure must be reported in the email job and workflow
summary, but the publish job still updates the pull-request comment. The final
publish job records email and Slack job results in `$GITHUB_STEP_SUMMARY`
without including credentials, recipients, or message bodies.

Include a stable delivery key derived from the repository, pull-request number,
and resulting tier marker in the SMTP message headers. Do not retry
indefinitely; SMTP delivery itself does not guarantee provider-side
idempotency.

## Slack delivery

Slack uses a bot token and the Web API `chat.postMessage` method. Configure the
following under **Settings → Secrets and variables → Actions**:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `SLACK_BOT_TOKEN` | Bot user OAuth token with `chat:write`; never expose it in workflow logs. |
| Variable | `PAR_SLACK_CHANNEL_ID` | Target channel ID; the bot must already be a member. |
| Variable | `PAR_SLACK_ENABLED` | Must equal `true` to permit Slack delivery. |

Slack follows the same change-only behavior as email: send on the first
classification or when the tier changes, not on a same-tier update. Keep
`PAR_SLACK_ENABLED=false` until an intentional workflow test.
