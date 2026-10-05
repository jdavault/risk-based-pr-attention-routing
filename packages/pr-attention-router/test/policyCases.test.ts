import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkPolicyCases,
  parsePolicyCases,
} from '../lib/policyCases.ts';
import { fixturePolicy } from './fixtures/fixturePolicy.ts';

describe('parsePolicyCases', () => {
  it('applies the documented evidence defaults', () => {
    const [policyCase] = parsePolicyCases({
      cases: [{ name: 'local', paths: ['src/local.ts'], floor: 'LOW' }],
    });

    assert.deepEqual(policyCase, {
      name: 'local',
      paths: ['src/local.ts'],
      status: 'MODIFIED',
      validationStatus: 'PASSED',
      materialContext: 'SUFFICIENT',
      changedLines: 2,
      floor: 'LOW',
      rules: undefined,
      notRules: undefined,
    });
  });

  for (const [name, input, message] of [
    ['empty case list', { cases: [] }, /non-empty case list/u],
    [
      'unsupported status',
      { cases: [{ name: 'bad', paths: ['x'], floor: 'LOW', status: 'BROKEN' }] },
      /status/u,
    ],
    [
      'unsupported context',
      {
        cases: [
          { name: 'bad', paths: ['x'], floor: 'LOW', materialContext: 'UNKNOWN' },
        ],
      },
      /materialContext/u,
    ],
    [
      'unsupported validation status',
      {
        cases: [
          { name: 'bad', paths: ['x'], floor: 'LOW', validationStatus: 'SKIPPED' },
        ],
      },
      /validationStatus/u,
    ],
    [
      'negative changed lines',
      { cases: [{ name: 'bad', paths: ['x'], floor: 'LOW', changedLines: -1 }] },
      /changedLines/u,
    ],
    [
      'empty paths',
      { cases: [{ name: 'bad', paths: [], floor: 'LOW' }] },
      /non-empty paths/u,
    ],
    [
      'empty required rules',
      { cases: [{ name: 'bad', paths: ['x'], floor: 'LOW', rules: [] }] },
      /rules/u,
    ],
  ] as const) {
    it(`rejects ${name}`, () => {
      assert.throws(() => parsePolicyCases(input), message);
    });
  }
});

describe('checkPolicyCases', () => {
  it('reports floor and rule mismatches', () => {
    const cases = parsePolicyCases({
      cases: [
        {
          name: 'wrong expectation',
          paths: ['src/shared/client.ts'],
          floor: 'LOW',
          rules: ['missing-rule'],
          notRules: ['shared-library'],
        },
      ],
    });

    assert.deepEqual(checkPolicyCases(fixturePolicy, cases), [
      {
        name: 'wrong expectation',
        messages: [
          'expected floor LOW, received MEDIUM',
          'required rule missing-rule did not match',
          'forbidden rule shared-library matched',
        ],
      },
    ]);
  });
});
