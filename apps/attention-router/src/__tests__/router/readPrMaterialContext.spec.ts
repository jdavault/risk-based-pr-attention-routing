import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

type MaterialContextState = 'SUFFICIENT' | 'MISSING' | 'CONFLICTING';

interface ReadPrMaterialContextModule {
  readonly readPrMaterialContext: (body: string) => MaterialContextState;
}

const require = createRequire(import.meta.url);
const { readPrMaterialContext } = require(
  '../../../../../.github/scripts/read-pr-material-context.js',
) as ReadPrMaterialContextModule;

describe('readPrMaterialContext', () => {
  it('reads an explicit sufficient declaration', () => {
    expect(
      readPrMaterialContext(
        '## Intent\nUpdate isolated copy.\n\nMaterial context: SUFFICIENT',
      ),
    ).toBe('SUFFICIENT');
  });

  it('reads an explicit conflicting declaration', () => {
    expect(
      readPrMaterialContext('Material context: conflicting'),
    ).toBe('CONFLICTING');
  });

  it('treats an absent declaration as missing', () => {
    expect(
      readPrMaterialContext(
        'This description is deliberately longer than forty characters.',
      ),
    ).toBe('MISSING');
  });

  it('fails closed when declarations disagree', () => {
    expect(
      readPrMaterialContext(
        'Material context: SUFFICIENT\nMaterial context: CONFLICTING',
      ),
    ).toBe('CONFLICTING');
  });
});
