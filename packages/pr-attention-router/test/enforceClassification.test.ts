import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DeterministicAssessment } from '../lib/attention.ts';
import {
  enforceClassification,
  parseAiClassification,
  type AiClassification,
} from '../lib/enforceClassification.ts';

const mediumFloor: DeterministicAssessment = {
  floor: 'MEDIUM',
  reviewerType: 'NON_LEAD_DEVELOPER',
  rationale: ['Shared hook or service changed.'],
  missingEvidence: [],
};

const lowAiClassification: AiClassification = {
  tier: 'LOW',
  summary: 'The change appears localized.',
  rationale: ['One component changed.'],
  blastRadius: 'The dashboard only.',
  reviewFocus: ['Confirm shared behavior.'],
  reviewerType: 'NON_LEAD_DEVELOPER',
  missingEvidence: [],
};

describe('enforceClassification', () => {
  it('never allows AI to lower the deterministic floor', () => {
    const result = enforceClassification(mediumFloor, lowAiClassification);

    assert.equal(result.tier, 'MEDIUM');
    assert.equal(result.deterministicFloor, 'MEDIUM');
    assert.match(result.summary, /raised the final tier from LOW to MEDIUM/u);
  });

  it('rejects merge-authority language in AI output', () => {
    assert.throws(
      () =>
        parseAiClassification({
          ...lowAiClassification,
          summary: 'Safe to merge without another look.',
        }),
      /prohibited authority language/u,
    );
  });
});
