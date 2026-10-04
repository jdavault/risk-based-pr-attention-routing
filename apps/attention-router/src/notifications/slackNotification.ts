import type { RiskTier } from '../domain/attention';
import type { FinalClassification } from '../router/enforceClassification';
import { renderNotificationText } from '../router/renderClassification';
import type { PullRequestContext } from './emailNotification';

export interface AttentionSlackInput {
  readonly classification: FinalClassification;
  readonly pullRequest: PullRequestContext;
  readonly channel: string;
}

export interface SlackMessage {
  readonly channel: string;
  readonly text: string;
}

export interface SlackTransport {
  post(message: SlackMessage): Promise<{ readonly id: string }>;
}

export interface SlackNotificationResult {
  readonly delivered: true;
  readonly messageId: string;
  readonly tier: RiskTier;
}

export interface SlackHttpResponse {
  readonly status: number;
  json(): Promise<unknown>;
}

export type SlackHttpClient = (
  url: string,
  init: RequestInit,
) => Promise<SlackHttpResponse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const defaultHttpClient: SlackHttpClient = async (url, init) => {
  const response = await fetch(url, init);

  return {
    status: response.status,
    async json() {
      return response.json() as Promise<unknown>;
    },
  };
};

export function createSlackBotTransport(
  token: string,
  request: SlackHttpClient = defaultHttpClient,
): SlackTransport {
  if (token.trim().length === 0) {
    throw new Error('Slack bot token is required.');
  }

  return {
    async post(message) {
      const response = await request(
        'https://slack.com/api/chat.postMessage',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(message),
        },
      );
      const payload = await response.json();

      if (
        response.status < 200 ||
        response.status >= 300 ||
        !isRecord(payload) ||
        payload.ok !== true ||
        typeof payload.ts !== 'string'
      ) {
        const reason =
          isRecord(payload) && typeof payload.error === 'string'
            ? payload.error
            : `HTTP ${response.status}`;
        throw new Error(`Slack delivery failed: ${reason}.`);
      }

      return { id: payload.ts };
    },
  };
}

export async function sendAttentionSlack(
  input: AttentionSlackInput,
  transport: SlackTransport,
): Promise<SlackNotificationResult> {
  if (input.channel.trim().length === 0) {
    throw new Error('Slack channel ID is required.');
  }

  const result = await transport.post({
    channel: input.channel,
    text: `${renderNotificationText(input.classification)}\nPull request: ${input.pullRequest.url}\n`,
  });

  return {
    delivered: true,
    messageId: result.id,
    tier: input.classification.tier,
  };
}
