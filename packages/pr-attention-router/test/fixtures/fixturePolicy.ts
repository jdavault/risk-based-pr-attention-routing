import type { DeterministicPolicy } from '../../lib/deterministicPolicy.ts';

export const fixturePolicy: DeterministicPolicy = {
  pathRules: [
    {
      id: 'authorization',
      tier: 'HIGH',
      patterns: [/^src\/auth\//u],
      rationale: 'Authorization behavior changed.',
    },
    {
      id: 'shared-library',
      tier: 'MEDIUM',
      patterns: [/^src\/shared\//u],
      rationale: 'Shared library behavior changed.',
    },
  ],
  productionFilePattern: /\.(?:[cm]?[jt]sx?|css|html)$/u,
  nonProductionFilePattern:
    /(^|\/)(?:__tests__|tests?|docs)\/|\.(?:spec|test)\.[cm]?[jt]sx?$/u,
  testFilePattern: /(^|\/)(?:__tests__|tests?)\/|\.(?:spec|test)\.[cm]?[jt]sx?$/u,
  productionFileThreshold: 5,
  changedLineThreshold: 250,
};
