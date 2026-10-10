import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEngineeringContext } from './context.ts';

test('loads only explicitly named local docs from the engineering context section', () => {
  const root = mkdtempSync(join(tmpdir(), 'par-context-'));
  try {
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs/security.md'), 'Human review is always required.');
    const text = loadEngineeringContext('## Engineering context\n[Security](docs/security.md)\n## LOW\n[Ignored](https://example.com)', root);
    assert.match(text, /docs\/security.md/);
    assert.match(text, /Human review/);
    assert.equal(loadEngineeringContext('# No document references', root), '');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('rejects non-local, missing, traversal, symlink and oversized engineering context', () => {
  const root = mkdtempSync(join(tmpdir(), 'par-context-'));
  try {
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'secret.md'), 'Not policy');
    writeFileSync(join(root, 'docs/big.md'), 'x'.repeat(33_000));
    symlinkSync(join(root, 'secret.md'), join(root, 'docs/link.md'));
    for (const path of ['https://example.com', 'docs/../secret.md', 'docs/missing.md', 'docs/link.md', 'docs/big.md']) {
      assert.throws(() => loadEngineeringContext(`## Engineering context\n[Doc](${path})`, root), Error, path);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
