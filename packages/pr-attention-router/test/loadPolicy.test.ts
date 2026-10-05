import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parsePolicy } from '../lib/loadPolicy.ts';

const thresholds = {
  productionFilePattern: '\\.[jt]s$',
  nonProductionFilePattern: '(^|/)test/',
  testFilePattern: '(^|/)test/',
  productionFileThreshold: 5,
  changedLineThreshold: 250,
};

describe('parsePolicy', () => {
  it('rejects LOW path rules', () => {
    assert.throws(
      () =>
        parsePolicy({
          version: 1,
          pathRules: [
            { id: 'low', tier: 'LOW', patterns: ['^src/'], rationale: 'x' },
          ],
          ...thresholds,
        }),
      /MEDIUM or HIGH/u,
    );
  });

  it('rejects empty pattern lists', () => {
    assert.throws(
      () =>
        parsePolicy({
          version: 1,
          pathRules: [
            { id: 'empty', tier: 'HIGH', patterns: [], rationale: 'x' },
          ],
          ...thresholds,
        }),
      /non-empty patterns/u,
    );
  });

  it('rejects invalid regular expressions', () => {
    assert.throws(
      () =>
        parsePolicy({
          version: 1,
          pathRules: [
            { id: 'bad', tier: 'HIGH', patterns: ['['], rationale: 'x' },
          ],
          ...thresholds,
        }),
      /invalid regular expression/u,
    );
  });

  it('rejects duplicate rule IDs', () => {
    const duplicateRule = {
      id: 'duplicate',
      tier: 'HIGH',
      patterns: ['^src/'],
      rationale: 'x',
    };

    assert.throws(
      () =>
        parsePolicy({
          version: 1,
          pathRules: [duplicateRule, duplicateRule],
          ...thresholds,
        }),
      /unique IDs/u,
    );
  });
});
