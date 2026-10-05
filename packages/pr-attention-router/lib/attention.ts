export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReviewerType = 'NON_LEAD_DEVELOPER' | 'TECH_LEAD_OR_SME';

export interface DeterministicAssessment {
  readonly floor: RiskTier;
  readonly reviewerType: ReviewerType;
  readonly rationale: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly matchedRuleIds: readonly string[];
}
