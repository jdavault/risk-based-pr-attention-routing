import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

type MaterialContextState = 'SUFFICIENT' | 'MISSING' | 'CONFLICTING';

interface ReadPrMaterialContextModule {
  readonly readPrMaterialContext: (body: string) => MaterialContextState;
}

const require = createRequire(import.meta.url);
const { readPrMaterialContext } = require(
  '../lib/readPrMaterialContext.cjs',
) as ReadPrMaterialContextModule;

describe('readPrMaterialContext', () => {
  it('reads an explicit sufficient declaration', () => {
    assert.equal(
      readPrMaterialContext(
        '## Intent\nUpdate isolated copy.\n\nMaterial context: SUFFICIENT',
      ),
      'SUFFICIENT',
    );
  });

  it('reads an explicit conflicting declaration', () => {
    assert.equal(
      readPrMaterialContext('Material context: conflicting'),
      'CONFLICTING',
    );
  });

  it('treats an absent declaration as missing', () => {
    assert.equal(readPrMaterialContext('No declaration.'), 'MISSING');
  });

  it('fails closed when declarations disagree', () => {
    assert.equal(
      readPrMaterialContext(
        'Material context: SUFFICIENT\nMaterial context: CONFLICTING',
      ),
      'CONFLICTING',
    );
  });
});
