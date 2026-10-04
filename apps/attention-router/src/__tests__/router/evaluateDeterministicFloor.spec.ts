import { describe, expect, it } from 'vitest';

import {
  evaluateDeterministicFloor,
  type PullRequestEvidence,
} from '../../router/evaluateDeterministicFloor';

function evidence(
  overrides: Partial<PullRequestEvidence> = {},
): PullRequestEvidence {
  return {
    title: 'Refine tier card guidance',
    body: 'Clarifies isolated dashboard copy and includes validation evidence.',
    jiraReference: undefined,
    materialContext: 'SUFFICIENT',
    validationStatus: 'PASSED',
    changedFiles: [{ status: 'MODIFIED', path: 'src/components/TierCard.tsx' }],
    diffTotals: {
      additions: 4,
      deletions: 2,
      changedLines: 6,
      changedFiles: 1,
      binaryFiles: 0,
    },
    ...overrides,
  };
}

describe('evaluateDeterministicFloor', () => {
  it('keeps a localized validated change at LOW', () => {
    expect(evaluateDeterministicFloor(evidence()).floor).toBe('LOW');
  });

  it('raises shared router code to MEDIUM', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          { status: 'MODIFIED', path: 'src/router/commentState.ts' },
        ],
      }),
    );

    expect(result.floor).toBe('MEDIUM');
    expect(result.rationale).toContain('Shared hook or service changed.');
  });

  it('raises failed validation to MEDIUM', () => {
    const result = evaluateDeterministicFloor(
      evidence({ validationStatus: 'FAILED' }),
    );

    expect(result.floor).toBe('MEDIUM');
    expect(result.rationale).toContain('Validation did not pass.');
  });

  it('raises sensitive workflow changes to HIGH', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          {
            status: 'MODIFIED',
            path: '.github/workflows/pr-attention-review.yml',
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      floor: 'HIGH',
      reviewerType: 'TECH_LEAD_OR_SME',
    });
  });

  it('raises the actual persistent-comment publisher to HIGH', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          {
            status: 'MODIFIED',
            path: '.github/scripts/publish-attention.comment.js',
          },
        ],
      }),
    );

    expect(result.floor).toBe('HIGH');
  });

  it('checks both sides of a rename for sensitive paths', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          {
            status: 'RENAMED',
            previousPath: 'src/auth/reviewerPolicy.ts',
            path: 'src/legacy/reviewerPolicy.ts',
          },
        ],
      }),
    );

    expect(result.floor).toBe('HIGH');
  });
});
