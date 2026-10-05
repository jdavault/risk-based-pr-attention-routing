#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

import { checkWorkflowContract } from '../lib/checkWorkflowContract.ts';

const optionIndex = process.argv.indexOf('--workflow');
const workflowPath =
  optionIndex === -1 ? undefined : process.argv[optionIndex + 1];

if (workflowPath === undefined || workflowPath.startsWith('--')) {
  throw new Error('Missing required --workflow option.');
}

const violations = checkWorkflowContract(await readFile(workflowPath, 'utf8'));

for (const violation of violations) {
  process.stderr.write(`FAIL ${violation.job ?? 'workflow'}: ${violation.rule}\n`);
}

process.stdout.write(
  violations.length === 0
    ? `${workflowPath} satisfies the attention-router trust contract.\n`
    : `${violations.length} trust-contract violation(s).\n`,
);

if (violations.length > 0) {
  process.exitCode = 1;
}
