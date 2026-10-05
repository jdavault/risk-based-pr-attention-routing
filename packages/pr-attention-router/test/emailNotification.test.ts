import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FinalClassification } from '../lib/enforceClassification.ts';
import {
  sendAttentionEmail,
  type AttentionEmailInput,
  type EmailMessage,
  type EmailTransport,
} from '../lib/emailNotification.ts';

function input(tier: FinalClassification['tier']): AttentionEmailInput {
  return {
    classification: {
      tier,
      deterministicFloor: tier,
      summary: 'Synthetic classification.',
      rationale: ['Controlled test evidence.'],
      blastRadius: 'The POC only.',
      reviewFocus: ['Review the intended behavior.'],
      reviewerType:
        tier === 'HIGH' ? 'TECH_LEAD_OR_SME' : 'NON_LEAD_DEVELOPER',
      missingEvidence: [],
    },
    pullRequest: {
      repository: 'owner/repository',
      number: 17,
      title: 'Synthetic pull request',
      url: 'https://github.com/owner/repository/pull/17',
    },
    recipients: {
      team: ['team@example.com'],
      lead: ['lead@example.com'],
    },
    from: 'router@example.com',
  };
}

describe('sendAttentionEmail', () => {
  it('routes HIGH to the lead with the exact lean notification', async () => {
    let captured:
      | { readonly message: EmailMessage; readonly idempotencyKey: string }
      | undefined;
    const transport: EmailTransport = {
      async send(message, idempotencyKey) {
        captured = { message, idempotencyKey };
        return { id: 'email-1' };
      },
    };

    const result = await sendAttentionEmail(input('HIGH'), transport);

    assert.deepEqual(captured, {
      message: {
        from: 'router@example.com',
        to: ['lead@example.com'],
        subject: '[HIGH] PR #17: Synthetic pull request',
        text: [
          '[HIGH] PR #17: Synthetic pull request',
          'Reviewer: Tech Lead or relevant SME · Floor: HIGH',
          'https://github.com/owner/repository/pull/17',
        ].join('\n'),
      },
      idempotencyKey: 'owner/repository:17:HIGH',
    });
    assert.deepEqual(result, {
      delivered: true,
      messageId: 'email-1',
      recipientCount: 1,
      tier: 'HIGH',
    });
  });

  it('routes LOW and MEDIUM to the team', async () => {
    for (const tier of ['LOW', 'MEDIUM'] as const) {
      let recipients: readonly string[] = [];
      await sendAttentionEmail(input(tier), {
        async send(message) {
          recipients = message.to;
          return { id: `email-${tier}` };
        },
      });
      assert.deepEqual(recipients, ['team@example.com']);
    }
  });

  it('rejects invalid recipients before delivery', async () => {
    await assert.rejects(
      sendAttentionEmail(
        {
          ...input('MEDIUM'),
          recipients: { team: ['not-an-email'], lead: ['lead@example.com'] },
        },
        {
          async send() {
            throw new Error('must not deliver');
          },
        },
      ),
      /valid email addresses/u,
    );
  });
});
