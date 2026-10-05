import type {
  ReviewerType,
  RiskTier,
} from '@scope/pr-attention-router';

export type { ReviewerType, RiskTier };

export interface RiskDimension {
  readonly level: 'Low' | 'Moderate' | 'High';
  readonly detail: string;
}

export interface SamplePullRequest {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly repository: string;
  readonly tier: RiskTier;
  readonly reviewerType: ReviewerType;
  readonly reviewerLabel: string;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly probability: RiskDimension;
  readonly impact: RiskDimension;
  readonly detectability: RiskDimension;
  readonly blastRadius: RiskDimension;
  readonly reviewFocus: string;
  readonly missingEvidence: readonly string[];
}

export interface TierDefinition {
  readonly tier: RiskTier;
  readonly label: string;
  readonly reviewer: string;
  readonly guidance: string;
}

export const tierDefinitions: readonly TierDefinition[] = [
  {
    tier: 'LOW',
    label: 'Focused change',
    reviewer: 'Non-lead developer',
    guidance:
      'Human review is required in V1; candidate for future agent-only approval.',
  },
  {
    tier: 'MEDIUM',
    label: 'Shared surface',
    reviewer: 'Non-lead developer',
    guidance: 'Standard developer review is required.',
  },
  {
    tier: 'HIGH',
    label: 'Sensitive change',
    reviewer: 'Tech Lead or relevant SME',
    guidance: 'Tech Lead or SME review is required.',
  },
] as const;
