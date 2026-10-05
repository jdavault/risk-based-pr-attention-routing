export type FloorTier = 'MEDIUM' | 'HIGH';

export interface PathRule {
  readonly id: string;
  readonly tier: FloorTier;
  readonly patterns: readonly RegExp[];
  readonly rationale: string;
}

export interface DeterministicPolicy {
  readonly pathRules: readonly PathRule[];
  readonly productionFilePattern: RegExp;
  readonly nonProductionFilePattern: RegExp;
  readonly testFilePattern: RegExp;
  readonly productionFileThreshold: number;
  readonly changedLineThreshold: number;
}
