import { describe, expect, it, vi } from 'vitest';

import type { FinalClassification } from '../../router/enforceClassification';
import {
  sendAttentionEmail,
  type AttentionEmailInput,
  type EmailTransport,
} from '../../notifications/emailNotification';

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
      repository: 'jdavault/risk-based-pr-attention-routing',
      number: 17,
      title: 'Synthetic pull request',
      url: 'https://github.com/jdavault/risk-based-pr-attention-routing/pull/17',
    },
    recipients: {
      team: ['team@example.com'],
      lead: ['lead@example.com'],
    },
    from: 'router@example.com',
  };
}

describe('sendAttentionEmail', () => {
  it('routes HIGH attention to lead recipients', async () => {
    const send = vi.fn<EmailTransport['send']>().mockResolvedValue({
      id: 'email-1',
    });

    const result = await sendAttentionEmail(input('HIGH'), { send });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['lead@example.com'] }),
      'jdavault/risk-based-pr-attention-routing:17:HIGH',
    );
    expect(result).toMatchObject({ delivered: true, messageId: 'email-1' });
  });

  it('routes LOW and MEDIUM attention to team recipients', async () => {
    const send = vi.fn<EmailTransport['send']>().mockResolvedValue({
      id: 'email-2',
    });

    await sendAttentionEmail(input('MEDIUM'), { send });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['team@example.com'] }),
      'jdavault/risk-based-pr-attention-routing:17:MEDIUM',
    );
  });
});
