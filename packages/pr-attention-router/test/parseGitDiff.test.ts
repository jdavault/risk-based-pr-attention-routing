import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseNameStatus, parseNumstat } from '../lib/parseGitDiff.ts';

describe('parseGitDiff', () => {
  it('parses modified and renamed paths', () => {
    assert.deepEqual(
      parseNameStatus('M\tsrc/App.tsx\nR100\tsrc/old.ts\tsrc/new.ts\n'),
      [
        { status: 'MODIFIED', path: 'src/App.tsx' },
        {
          status: 'RENAMED',
          previousPath: 'src/old.ts',
          path: 'src/new.ts',
        },
      ],
    );
  });

  it('totals text changes and counts binary files', () => {
    assert.deepEqual(
      parseNumstat('10\t3\tsrc/App.tsx\n-\t-\tpublic/app.png\n'),
      {
        additions: 10,
        deletions: 3,
        changedLines: 13,
        changedFiles: 2,
        binaryFiles: 1,
      },
    );
  });
});
