import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = resolve(
  process.cwd(),
  '../../.github/workflows/pr-attention-review.yml',
);

describe('PR attention workflow permissions', () => {
  it('can create or update the persistent pull-request comment', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const publishJob = workflow.match(
      /\n[ ]{2}publish:\n(?<job>[\s\S]*?)(?=\n[ ]{2}[a-z][a-z-]+:\n|$)/u,
    )?.groups?.job;

    expect(publishJob).toContain('issues: write');
    expect(publishJob).toContain('pull-requests: write');
  });
});
