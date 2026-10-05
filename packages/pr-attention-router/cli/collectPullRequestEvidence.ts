import { execFileSync } from 'node:child_process';

import {
  evaluateDeterministicFloor,
  type MaterialContextState,
  type PullRequestEvidence,
  type ValidationStatus,
} from '../lib/evaluateDeterministicFloor.ts';
import { readPolicyFile } from '../lib/loadPolicy.ts';
import { parseNameStatus, parseNumstat } from '../lib/parseGitDiff.ts';

interface CollectorArguments {
  readonly base: string;
  readonly head: string;
  readonly repositoryDirectory: string;
  readonly policyPath: string;
  readonly title: string;
  readonly body: string;
  readonly jiraReference: string | undefined;
  readonly materialContext: MaterialContextState;
  readonly validationStatus: ValidationStatus;
}

function readOption(name: string): string | undefined {
  const optionIndex = process.argv.indexOf(`--${name}`);
  return optionIndex === -1 ? undefined : process.argv[optionIndex + 1];
}

function requireOption(name: string): string {
  const value = readOption(name);
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required --${name} option.`);
  }

  return value;
}

function parseMaterialContextState(value: string): MaterialContextState {
  if (
    value === 'SUFFICIENT' ||
    value === 'MISSING' ||
    value === 'CONFLICTING'
  ) {
    return value;
  }

  throw new Error(`Unsupported material context state ${value}`);
}

function parseValidationStatus(value: string): ValidationStatus {
  if (value === 'PASSED' || value === 'FAILED' || value === 'NOT_RUN') {
    return value;
  }

  throw new Error(`Unsupported validation status ${value}`);
}

function parseArguments(): CollectorArguments {
  return {
    base: requireOption('base'),
    head: requireOption('head'),
    repositoryDirectory: requireOption('repository-directory'),
    policyPath: requireOption('policy'),
    title: requireOption('title'),
    body: readOption('body') ?? '',
    jiraReference: readOption('jira-reference'),
    materialContext: parseMaterialContextState(requireOption('material-context')),
    validationStatus: parseValidationStatus(requireOption('validation-status')),
  };
}

function runGitDiff(
  mode: '--name-status' | '--numstat',
  base: string,
  head: string,
  repositoryDirectory: string,
): string {
  return execFileSync(
    'git',
    ['diff', mode, '--find-renames', `${base}...${head}`],
    { cwd: repositoryDirectory, encoding: 'utf8' },
  );
}

function collectEvidence(options: CollectorArguments): PullRequestEvidence {
  return {
    title: options.title,
    body: options.body,
    jiraReference: options.jiraReference,
    materialContext: options.materialContext,
    validationStatus: options.validationStatus,
    changedFiles: parseNameStatus(
      runGitDiff(
        '--name-status',
        options.base,
        options.head,
        options.repositoryDirectory,
      ),
    ),
    diffTotals: parseNumstat(
      runGitDiff(
        '--numstat',
        options.base,
        options.head,
        options.repositoryDirectory,
      ),
    ),
  };
}

const options = parseArguments();
const evidence = collectEvidence(options);
const assessment = evaluateDeterministicFloor(
  evidence,
  await readPolicyFile(options.policyPath),
);

process.stdout.write(
  `${JSON.stringify({ base: options.base, head: options.head, evidence, assessment }, null, 2)}\n`,
);
