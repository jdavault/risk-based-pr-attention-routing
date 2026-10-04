# PR Attention Notifications

## Purpose

V1 sends optional email after the final classification and deterministic floor
have been applied. Notification never approves, merges, deploys, releases, or
modifies pull-request source. A delivery failure must not prevent publication
of the persistent classification comment.

Email remains disabled while the application is being reconstructed. The
personal POC will use Resend's HTTPS API instead of an SMTP relay.

## Configuration

Configure these under **Settings → Secrets and variables → Actions**.

### Secret

| Secret | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Project-specific, sending-only Resend credential restricted to the verified POC domain and used only by the email job. |

### Variables

| Variable | Purpose |
| --- | --- |
| `PAR_EMAIL_PROVIDER` | Must equal `resend` before the email job is eligible to run. |
| `PAR_EMAIL_ENABLED` | Must equal `true` to permit delivery. Any other value keeps delivery off. |
| `PAR_EMAIL_FROM` | Sender address on a domain verified in Resend. |
| `PAR_EMAIL_TO_TEAM` | Comma-delimited recipients for LOW and MEDIUM classifications. |
| `PAR_EMAIL_TO_LEAD` | Comma-delimited recipients for HIGH classifications. |

Recipient values must be trimmed, validated, and deduplicated by application
code. Never store API keys or recipient addresses in workflow source or logs.

## Enablement sequence

1. Keep `PAR_EMAIL_ENABLED` absent or set to `false` while implementing the
   notification adapter.
2. Verify the sending domain and `PAR_EMAIL_FROM` address in Resend.
3. Create a sending-only Resend API key restricted to the verified POC domain,
   then add it as the `RESEND_API_KEY` repository secret.
4. Add the provider, sender, and recipient variables.
5. Run notification unit tests locally with a fake transport; tests must not
   call Resend.
6. Set `PAR_EMAIL_ENABLED=true` only for an intentional end-to-end test.
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
email delivery. A Resend failure must be reported in the email job and workflow
summary, but the publish job still updates the pull-request comment.

Use a stable Resend idempotency key derived from the repository, pull-request
number, and resulting tier marker. Do not retry indefinitely. Any retry policy
must be bounded and reuse that idempotency key so an accepted request is not
delivered twice when the client misses the response.

## Deferred Slack delivery

Slack remains outside the initial POC. No Slack token, channel identifier, or
feature flag is required.
