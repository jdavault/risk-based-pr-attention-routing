import { describe, expect, it } from 'vitest';

import {
  enforceClassification,
  parseAiClassification,
  type AiClassification,
} from '../../router/enforceClassification';
import type { DeterministicAssessment } from '../../router/evaluateDeterministicFloor';

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

    expect(result.tier).toBe('MEDIUM');
    expect(result.deterministicFloor).toBe('MEDIUM');
    expect(result.summary).toContain('raised the final tier from LOW to MEDIUM');
  });

  it('rejects authority language in AI output', () => {
    expect(() =>
      parseAiClassification({
        ...lowAiClassification,
        summary: 'Safe to merge without another look.',
      }),
    ).toThrow(/prohibited authority language/u);
  });
});
