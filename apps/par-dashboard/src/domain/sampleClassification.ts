import type { FinalClassification } from '@scope/pr-attention-router';

import type { SamplePullRequest } from './attention';

export function toSampleClassification(
  pullRequest: SamplePullRequest,
): FinalClassification {
  return {
    tier: pullRequest.tier,
    deterministicFloor: pullRequest.tier,
    summary: pullRequest.summary,
    rationale: pullRequest.evidence,
    blastRadius: pullRequest.blastRadius.detail,
    reviewFocus: [pullRequest.reviewFocus],
    reviewerType: pullRequest.reviewerType,
    missingEvidence: pullRequest.missingEvidence,
  };
}
