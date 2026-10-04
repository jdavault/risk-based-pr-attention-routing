import { describe, expect, it, vi } from 'vitest';

import type { FinalClassification } from '../../router/enforceClassification';
import {
  createSlackBotTransport,
  sendAttentionSlack,
  type SlackHttpClient,
} from '../../notifications/slackNotification';

const classification: FinalClassification = {
  tier: 'HIGH',
  deterministicFloor: 'HIGH',
  summary: 'Authorization policy changed.',
  rationale: ['Sensitive authorization code changed.'],
  blastRadius: 'All routed pull requests.',
  reviewFocus: ['Confirm reviewer authorization.'],
  reviewerType: 'TECH_LEAD_OR_SME',
  missingEvidence: [],
};

describe('Slack notification', () => {
  it('posts the classification through the bot-token transport', async () => {
    const request = vi.fn<SlackHttpClient>().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ ok: true, ts: '1728000000.000001' }),
    });
    const transport = createSlackBotTransport('xoxb-test-token', request);

    const result = await sendAttentionSlack(
      {
        classification,
        pullRequest: {
          repository: 'jdavault/risk-based-pr-attention-routing',
          number: 17,
          title: 'Protect reviewer authorization policy',
          url: 'https://github.com/jdavault/risk-based-pr-attention-routing/pull/17',
        },
        channel: 'C0123456789',
      },
      transport,
    );

    expect(result).toEqual({
      delivered: true,
      messageId: '1728000000.000001',
      tier: 'HIGH',
    });
    expect(request).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer xoxb-test-token',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }),
    );

    const body = request.mock.calls[0]?.[1].body;
    if (typeof body !== 'string') {
      throw new TypeError('Expected Slack request body to be a string.');
    }
    const requestBody = JSON.parse(body) as Record<string, unknown>;
    expect(requestBody).toMatchObject({ channel: 'C0123456789' });
    expect(requestBody.text).toContain('PR Attention Review: HIGH');
    expect(requestBody.text).toContain('/pull/17');
  });

  it('fails when Slack rejects the request', async () => {
    const request = vi.fn<SlackHttpClient>().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ ok: false, error: 'channel_not_found' }),
    });
    const transport = createSlackBotTransport('xoxb-test-token', request);

    await expect(
      sendAttentionSlack(
        {
          classification,
          pullRequest: {
            repository: 'owner/repository',
            number: 17,
            title: 'Synthetic pull request',
            url: 'https://github.com/owner/repository/pull/17',
          },
          channel: 'C0123456789',
        },
        transport,
      ),
    ).rejects.toThrow(/channel_not_found/u);
  });
});
