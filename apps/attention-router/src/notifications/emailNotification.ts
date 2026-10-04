import type { RiskTier } from '../domain/attention';
import type { FinalClassification } from '../router/enforceClassification';
import { renderNotificationText } from '../router/renderClassification';

export interface PullRequestContext {
  readonly repository: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
}

export interface AttentionEmailInput {
  readonly classification: FinalClassification;
  readonly pullRequest: PullRequestContext;
  readonly recipients: {
    readonly team: readonly string[];
    readonly lead: readonly string[];
  };
  readonly from: string;
}

export interface EmailMessage {
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly text: string;
}

export interface EmailTransportResult {
  readonly id: string;
}

export interface EmailTransport {
  send(
    message: EmailMessage,
    idempotencyKey: string,
  ): Promise<EmailTransportResult>;
}

export interface EmailNotificationResult {
  readonly delivered: true;
  readonly messageId: string;
  readonly recipientCount: number;
  readonly tier: RiskTier;
}

function recipientsForTier(input: AttentionEmailInput): readonly string[] {
  return input.classification.tier === 'HIGH'
    ? input.recipients.lead
    : input.recipients.team;
}

function requireEmailAddresses(
  values: readonly string[],
  label: string,
): readonly string[] {
  if (
    values.length === 0 ||
    values.some((value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value))
  ) {
    throw new Error(`${label} must contain valid email addresses.`);
  }

  return values;
}

export async function sendAttentionEmail(
  input: AttentionEmailInput,
  transport: EmailTransport,
): Promise<EmailNotificationResult> {
  const recipients = requireEmailAddresses(
    recipientsForTier(input),
    'Attention email recipients',
  );
  requireEmailAddresses([input.from], 'Attention email sender');

  const idempotencyKey = `${input.pullRequest.repository}:${input.pullRequest.number}:${input.classification.tier}`;
  const result = await transport.send(
    {
      from: input.from,
      to: recipients,
      subject: `[${input.classification.tier}] PR #${input.pullRequest.number}: ${input.pullRequest.title}`,
      text: `${renderNotificationText(input.classification)}\nPull request: ${input.pullRequest.url}\n`,
    },
    idempotencyKey,
  );

  return {
    delivered: true,
    messageId: result.id,
    recipientCount: recipients.length,
    tier: input.classification.tier,
  };
}
