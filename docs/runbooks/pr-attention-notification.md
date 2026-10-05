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
| `SMTP_HOST` | SMTP host reachable from the active runner; `localhost` for the local runner or the hostname from an ngrok TCP endpoint for a GitHub-hosted runner. |
| `SMTP_PORT` | Port paired with `SMTP_HOST`; `25` for local smtp4dev or the public port assigned by ngrok. |
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

## Expose smtp4dev through ngrok

Use separate tunnels for the smtp4dev web inbox and SMTP transport. HTTP is
appropriate for the inbox on local port `8025`; SMTP on local port `25`
requires a raw TCP tunnel.

Add the following entries under `tunnels` in
`~/Library/Application Support/ngrok/ngrok.yml`:

```yaml
tunnels:
  p3sg-email:
    proto: http
    addr: 8025
    subdomain: p3sg-email
  p3sg-smtp:
    proto: tcp
    addr: 25
```

Start both tunnels and leave the process running:

```bash
ngrok start p3sg-smtp p3sg-email \
  --config "$HOME/Library/Application Support/ngrok/ngrok.yml"
```

The tunnel name `p3sg-smtp` is not a public hostname. Unless the account has a
reserved TCP address, ngrok assigns a dynamic endpoint resembling
`tcp://6.tcp.us-cal-1.ngrok.io:26541`. Read the live endpoint from the agent's
local API:

```bash
curl -s http://127.0.0.1:4040/api/tunnels |
  jq -r '.tunnels[] | select(.name == "p3sg-smtp") | .public_url'
```

Extract the host and port and update the GitHub Actions variables after every
ngrok restart:

```bash
smtp_url=$(curl -s http://127.0.0.1:4040/api/tunnels |
  jq -r '.tunnels[] | select(.name == "p3sg-smtp") | .public_url')

smtp_endpoint=${smtp_url#tcp://}
smtp_host=${smtp_endpoint%:*}
smtp_port=${smtp_endpoint##*:}

gh variable set SMTP_HOST --body "$smtp_host"
gh variable set SMTP_PORT --body "$smtp_port"

echo "SMTP_HOST=$smtp_host"
echo "SMTP_PORT=$smtp_port"
```

Do not include the `tcp://` scheme in `SMTP_HOST`, and do not set the public
port to local port `25`. For example, the endpoint above maps to
`SMTP_HOST=6.tcp.us-cal-1.ngrok.io` and `SMTP_PORT=26541`; ngrok forwards that
public port to local port `25`.

Open <https://p3sg-email.ngrok.io> to inspect captured messages. Keep both
tunnels temporary because they expose the capture inbox and SMTP listener to
the public internet. A reserved ngrok TCP address avoids changing the GitHub
variables after every restart.

Some ISPs intercept ngrok TCP DNS names even when the tunnel is healthy. If
the public hostname resolves to an ISP block page, test the SMTP endpoint from
a GitHub-hosted runner or another network. Do not replace the ngrok hostname
with the tunnel name.

## Pause and resume the POC

Pause the POC after intentional testing so it cannot consume classification
API usage or send surprise notifications:

```bash
gh variable set PAR_EMAIL_ENABLED --body false
gh variable set PAR_SLACK_ENABLED --body false
gh variable set PAR_APP_WORKFLOWS_ENABLED --body false
```

Wait for active runs to finish before changing the variables. Disabling the
master workflow gate does not cancel a job that has already started.

Resume in stages:

1. Start smtp4dev and any required ngrok tunnels.
2. Read the live ngrok TCP endpoint and update `SMTP_HOST` and `SMTP_PORT`.
3. Confirm `PAR_EMAIL_ENABLED=false` and `PAR_SLACK_ENABLED=false`.
4. Set `PAR_APP_WORKFLOWS_ENABLED=true`.
5. Run a harmless classification PR and verify the persistent PR comment.
6. Enable and test one notification channel at a time.

Inspect the non-secret configuration without printing credentials:

```bash
gh variable list
```

Do not retrieve or print `OPENAI_API_KEY` or `SLACK_BOT_TOKEN` during startup
checks.

## Routing and content

- LOW and MEDIUM route to `PAR_EMAIL_TO_TEAM`.
- HIGH routes to `PAR_EMAIL_TO_LEAD`.
- Email subjects use the first summary line: `[TIER] PR #number: title`.
- Email and Slack contain only three lines: tier/title, reviewer and
  deterministic floor, and pull-request URL.
- Rationale, blast radius, review focus, and missing evidence remain only in
  the persistent pull-request comment.

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
