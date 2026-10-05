import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateDeterministicFloor,
  type PullRequestEvidence,
} from '../lib/evaluateDeterministicFloor.ts';
import { fixturePolicy } from './fixtures/fixturePolicy.ts';

function evidence(
  overrides: Partial<PullRequestEvidence> = {},
): PullRequestEvidence {
  return {
    title: 'Refine a local component',
    body: 'The intent and validation evidence are documented.',
    jiraReference: undefined,
    materialContext: 'SUFFICIENT',
    validationStatus: 'PASSED',
    changedFiles: [{ status: 'MODIFIED', path: 'src/components/Card.tsx' }],
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
  it('keeps localized passing evidence at LOW', () => {
    assert.equal(
      evaluateDeterministicFloor(evidence(), fixturePolicy).floor,
      'LOW',
    );
  });

  it('returns matched rule IDs and their rationales', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          { status: 'MODIFIED', path: 'src/shared/requestClient.ts' },
        ],
      }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'MEDIUM');
    assert.deepEqual(result.matchedRuleIds, ['shared-library']);
    assert.ok(result.rationale.includes('Shared library behavior changed.'));
  });

  it('checks both sides of a rename', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          {
            status: 'RENAMED',
            previousPath: 'src/auth/authorize.ts',
            path: 'src/legacy/authorize.ts',
          },
        ],
      }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'HIGH');
    assert.deepEqual(result.matchedRuleIds, ['authorization']);
  });

  it('collects failed validation and missing context even at HIGH', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        validationStatus: 'FAILED',
        materialContext: 'MISSING',
        changedFiles: [{ status: 'MODIFIED', path: 'src/auth/authorize.ts' }],
      }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'HIGH');
    assert.ok(result.rationale.includes('Validation did not pass.'));
    assert.ok(result.rationale.includes('Material PR context is missing.'));
    assert.ok(
      result.missingEvidence.includes('Sufficient PR intent and risk context'),
    );
  });

  it('raises a deleted test to MEDIUM', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        changedFiles: [
          { status: 'DELETED', path: 'test/requestClient.test.ts' },
        ],
      }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'MEDIUM');
    assert.ok(result.rationale.includes('A test file was deleted.'));
  });

  it('raises five production files to MEDIUM', () => {
    const changedFiles = Array.from({ length: 5 }, (_, index) => ({
      status: 'MODIFIED' as const,
      path: `src/components/Card${index}.tsx`,
    }));

    const result = evaluateDeterministicFloor(
      evidence({ changedFiles }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'MEDIUM');
    assert.ok(result.rationale.includes('Five or more production files changed.'));
  });

  it('raises exactly 250 changed lines to MEDIUM', () => {
    const result = evaluateDeterministicFloor(
      evidence({
        diffTotals: {
          additions: 200,
          deletions: 50,
          changedLines: 250,
          changedFiles: 1,
          binaryFiles: 0,
        },
      }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'MEDIUM');
    assert.ok(result.rationale.includes('Change size is 250 lines or greater.'));
  });

  for (const materialContext of ['MISSING', 'CONFLICTING'] as const) {
    it(`raises ${materialContext.toLowerCase()} material context to MEDIUM`, () => {
      assert.equal(
        evaluateDeterministicFloor(
          evidence({ materialContext }),
          fixturePolicy,
        ).floor,
        'MEDIUM',
      );
    });
  }

  it('raises missing changed-file evidence to MEDIUM', () => {
    const result = evaluateDeterministicFloor(
      evidence({ changedFiles: [] }),
      fixturePolicy,
    );

    assert.equal(result.floor, 'MEDIUM');
    assert.ok(result.missingEvidence.includes('Changed-file evidence'));
  });
});
