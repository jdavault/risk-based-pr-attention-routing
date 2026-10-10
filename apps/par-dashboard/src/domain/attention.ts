import type { Tier } from '@p3sg/pr-attention-router';

export type RiskTier = Tier;

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
    reviewer: 'Developer familiar with the affected area',
    guidance:
      'Human review is required. Focus on the affected area.',
  },
  {
    tier: 'MEDIUM',
    label: 'Shared surface',
    reviewer: 'Developer familiar with the affected area',
    guidance: 'Standard developer review is required.',
  },
  {
    tier: 'HIGH',
    label: 'Sensitive change',
    reviewer: 'Tech Lead or relevant SME',
    guidance: 'Tech Lead or SME review is required.',
  },
] as const;
