#!/usr/bin/env node

import { readPolicyFile } from '../lib/loadPolicy.ts';
import {
  checkPolicyCases,
  readPolicyCasesFile,
} from '../lib/policyCases.ts';

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Missing required ${name} option.`);
  }

  return value;
}

const policy = await readPolicyFile(option('--policy'));
const cases = await readPolicyCasesFile(option('--cases'));
const failures = checkPolicyCases(policy, cases);

if (failures.length > 0) {
  for (const failure of failures) {
    for (const message of failure.messages) {
      console.error(`${failure.name}: ${message}`);
    }
  }

  process.exitCode = 1;
} else {
  console.log(`${cases.length}/${cases.length} policy cases passed.`);
}
