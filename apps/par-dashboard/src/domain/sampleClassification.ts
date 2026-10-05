import type {
  ReviewerType,
  RiskTier,
  SamplePullRequest,
} from './attention';

export interface FinalClassification {
  readonly tier: RiskTier;
  readonly deterministicFloor: RiskTier;
  readonly summary: string;
  readonly rationale: readonly string[];
  readonly blastRadius: string;
  readonly reviewFocus: readonly string[];
  readonly reviewerType: ReviewerType;
  readonly missingEvidence: readonly string[];
}

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
