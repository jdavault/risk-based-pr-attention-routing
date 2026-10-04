import { describe, expect, it } from 'vitest';

import { parseNameStatus, parseNumstat } from '../../router/parseGitDiff';

describe('parseGitDiff', () => {
  it('parses modified and renamed paths', () => {
    expect(
      parseNameStatus(
        'M\tsrc/App.tsx\nR100\tsrc/old.ts\tsrc/new.ts\n',
      ),
    ).toEqual([
      { status: 'MODIFIED', path: 'src/App.tsx' },
      {
        status: 'RENAMED',
        previousPath: 'src/old.ts',
        path: 'src/new.ts',
      },
    ]);
  });

  it('totals text changes and counts binary files', () => {
    expect(parseNumstat('10\t3\tsrc/App.tsx\n-\t-\tpublic/app.png\n')).toEqual({
      additions: 10,
      deletions: 3,
      changedLines: 13,
      changedFiles: 2,
      binaryFiles: 1,
    });
  });
});
