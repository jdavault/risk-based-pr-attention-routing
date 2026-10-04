import type { RiskTier } from '../domain/attention';

export interface PriorClassification {
  readonly tier: RiskTier;
  readonly version: 1;
}

const stateMarkerPattern = /<!--\s*par:v1 tier=(LOW|MEDIUM|HIGH)\s*-->/u;

export function parseCommentState(body: string): PriorClassification | null {
  const match = stateMarkerPattern.exec(body);
  const tier = match?.[1];

  if (tier !== 'LOW' && tier !== 'MEDIUM' && tier !== 'HIGH') {
    return null;
  }

  return { tier, version: 1 };
}

export function shouldNotify(
  previousTier: RiskTier | null,
  currentTier: RiskTier,
): boolean {
  return previousTier !== currentTier;
}
