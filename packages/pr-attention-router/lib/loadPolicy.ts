import { readFile } from 'node:fs/promises';

import type {
  DeterministicPolicy,
  FloorTier,
  PathRule,
} from './deterministicPolicy.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value;
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }

  return value as number;
}

function compilePattern(value: unknown, field: string): RegExp {
  const source = requiredString(value, field);

  try {
    return new RegExp(source, 'u');
  } catch (error) {
    throw new Error(`${field} contains an invalid regular expression.`, {
      cause: error,
    });
  }
}

function parseTier(value: unknown): FloorTier {
  if (value !== 'MEDIUM' && value !== 'HIGH') {
    throw new Error('Path-rule tier must be MEDIUM or HIGH.');
  }

  return value;
}

function parseRule(value: unknown, index: number): PathRule {
  if (!isRecord(value)) {
    throw new Error(`pathRules[${index}] must be an object.`);
  }

  if (!Array.isArray(value.patterns) || value.patterns.length === 0) {
    throw new Error(`pathRules[${index}] must have non-empty patterns.`);
  }

  return {
    id: requiredString(value.id, `pathRules[${index}].id`),
    tier: parseTier(value.tier),
    patterns: value.patterns.map((pattern, patternIndex) =>
      compilePattern(pattern, `pathRules[${index}].patterns[${patternIndex}]`),
    ),
    rationale: requiredString(
      value.rationale,
      `pathRules[${index}].rationale`,
    ),
  };
}

export function parsePolicy(value: unknown): DeterministicPolicy {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error('Policy version must be 1.');
  }

  if (!Array.isArray(value.pathRules)) {
    throw new Error('Policy pathRules must be an array.');
  }

  const pathRules = value.pathRules.map(parseRule);
  const ids = pathRules.map(({ id }) => id);

  if (new Set(ids).size !== ids.length) {
    throw new Error('Path rules must have unique IDs.');
  }

  return {
    pathRules,
    productionFilePattern: compilePattern(
      value.productionFilePattern,
      'productionFilePattern',
    ),
    nonProductionFilePattern: compilePattern(
      value.nonProductionFilePattern,
      'nonProductionFilePattern',
    ),
    testFilePattern: compilePattern(value.testFilePattern, 'testFilePattern'),
    productionFileThreshold: positiveInteger(
      value.productionFileThreshold,
      'productionFileThreshold',
    ),
    changedLineThreshold: positiveInteger(
      value.changedLineThreshold,
      'changedLineThreshold',
    ),
  };
}

export async function readPolicyFile(
  path: string,
): Promise<DeterministicPolicy> {
  const source = await readFile(path, 'utf8');
  return parsePolicy(JSON.parse(source) as unknown);
}
