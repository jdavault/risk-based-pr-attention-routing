import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FinalClassification } from '../lib/enforceClassification.ts';
import {
  createSlackBotTransport,
  sendAttentionSlack,
  type SlackHttpClient,
} from '../lib/slackNotification.ts';

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
  it('posts the same lean three-line notification', async () => {
    let capturedBody: unknown;
    const request: SlackHttpClient = async (_url, init) => {
      capturedBody = JSON.parse(String(init.body)) as unknown;
      return {
        status: 200,
        async json() {
          return { ok: true, ts: '1728000000.000001' };
        },
      };
    };
    const transport = createSlackBotTransport('xoxb-test-token', request);

    const result = await sendAttentionSlack(
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
    );

    assert.deepEqual(result, {
      delivered: true,
      messageId: '1728000000.000001',
      tier: 'HIGH',
    });
    assert.deepEqual(capturedBody, {
      channel: 'C0123456789',
      text: [
        '[HIGH] PR #17: Synthetic pull request',
        'Reviewer: Tech Lead or relevant SME · Floor: HIGH',
        'https://github.com/owner/repository/pull/17',
      ].join('\n'),
    });
  });

  it('surfaces Slack API errors', async () => {
    const request: SlackHttpClient = async () => ({
      status: 200,
      async json() {
        return { ok: false, error: 'channel_not_found' };
      },
    });
    const transport = createSlackBotTransport('xoxb-test-token', request);

    await assert.rejects(
      transport.post({ channel: 'missing', text: 'test' }),
      /channel_not_found/u,
    );
  });
});
