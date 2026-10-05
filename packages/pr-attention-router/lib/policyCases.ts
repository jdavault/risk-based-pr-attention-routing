import { readFile } from 'node:fs/promises';

import type { RiskTier } from './attention.ts';
import type { DeterministicPolicy } from './deterministicPolicy.ts';
import {
  evaluateDeterministicFloor,
  type MaterialContextState,
  type ValidationStatus,
} from './evaluateDeterministicFloor.ts';
import type { ChangeStatus } from './parseGitDiff.ts';

export interface PolicyCase {
  readonly name: string;
  readonly paths: readonly string[];
  readonly status: ChangeStatus;
  readonly validationStatus: ValidationStatus;
  readonly materialContext: MaterialContextState;
  readonly changedLines: number;
  readonly floor: RiskTier;
  readonly rules: readonly string[] | undefined;
  readonly notRules: readonly string[] | undefined;
}

export interface PolicyCaseFailure {
  readonly name: string;
  readonly messages: readonly string[];
}

const changeStatuses = new Set<ChangeStatus>([
  'ADDED',
  'COPIED',
  'DELETED',
  'MODIFIED',
  'RENAMED',
  'TYPE_CHANGED',
  'UNMERGED',
]);
const validationStatuses = new Set<ValidationStatus>([
  'PASSED',
  'FAILED',
  'NOT_RUN',
]);
const materialContexts = new Set<MaterialContextState>([
  'SUFFICIENT',
  'MISSING',
  'CONFLICTING',
]);
const riskTiers = new Set<RiskTier>(['LOW', 'MEDIUM', 'HIGH']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value;
}

function nonEmptyStringList(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty list.`);
  }

  return value.map((entry, index) =>
    nonEmptyString(entry, `${field}[${index}]`),
  );
}

function optionalStringList(
  value: unknown,
  field: string,
): readonly string[] | undefined {
  return value === undefined ? undefined : nonEmptyStringList(value, field);
}

function parseCase(value: unknown, index: number): PolicyCase {
  if (!isRecord(value)) {
    throw new Error(`cases[${index}] must be an object.`);
  }

  const status = value.status ?? 'MODIFIED';
  const validationStatus = value.validationStatus ?? 'PASSED';
  const materialContext = value.materialContext ?? 'SUFFICIENT';
  const changedLines = value.changedLines ?? 2;

  if (!changeStatuses.has(status as ChangeStatus)) {
    throw new Error(`cases[${index}].status is unsupported.`);
  }

  if (!validationStatuses.has(validationStatus as ValidationStatus)) {
    throw new Error(`cases[${index}].validationStatus is unsupported.`);
  }

  if (!materialContexts.has(materialContext as MaterialContextState)) {
    throw new Error(`cases[${index}].materialContext is unsupported.`);
  }

  if (!Number.isInteger(changedLines) || (changedLines as number) < 0) {
    throw new Error(`cases[${index}].changedLines must be non-negative.`);
  }

  if (!riskTiers.has(value.floor as RiskTier)) {
    throw new Error(`cases[${index}].floor is unsupported.`);
  }

  return {
    name: nonEmptyString(value.name, `cases[${index}].name`),
    paths: nonEmptyStringList(value.paths, `cases[${index}].non-empty paths`),
    status: status as ChangeStatus,
    validationStatus: validationStatus as ValidationStatus,
    materialContext: materialContext as MaterialContextState,
    changedLines: changedLines as number,
    floor: value.floor as RiskTier,
    rules: optionalStringList(value.rules, `cases[${index}].rules`),
    notRules: optionalStringList(value.notRules, `cases[${index}].notRules`),
  };
}

export function parsePolicyCases(value: unknown): readonly PolicyCase[] {
  if (!isRecord(value) || !Array.isArray(value.cases) || value.cases.length === 0) {
    throw new Error('Policy cases must contain a non-empty case list.');
  }

  return value.cases.map(parseCase);
}

export async function readPolicyCasesFile(
  path: string,
): Promise<readonly PolicyCase[]> {
  const source = await readFile(path, 'utf8');
  return parsePolicyCases(JSON.parse(source) as unknown);
}

export function checkPolicyCases(
  policy: DeterministicPolicy,
  cases: readonly PolicyCase[],
): readonly PolicyCaseFailure[] {
  return cases.flatMap((policyCase): readonly PolicyCaseFailure[] => {
    const assessment = evaluateDeterministicFloor(
      {
        title: policyCase.name,
        body: 'Policy conformance fixture.',
        jiraReference: undefined,
        materialContext: policyCase.materialContext,
        validationStatus: policyCase.validationStatus,
        changedFiles: policyCase.paths.map((path) => ({
          status: policyCase.status,
          path,
        })),
        diffTotals: {
          additions: policyCase.changedLines,
          deletions: 0,
          changedLines: policyCase.changedLines,
          changedFiles: policyCase.paths.length,
          binaryFiles: 0,
        },
      },
      policy,
    );
    const messages: string[] = [];

    if (assessment.floor !== policyCase.floor) {
      messages.push(
        `expected floor ${policyCase.floor}, received ${assessment.floor}`,
      );
    }

    for (const rule of policyCase.rules ?? []) {
      if (!assessment.matchedRuleIds.includes(rule)) {
        messages.push(`required rule ${rule} did not match`);
      }
    }

    for (const rule of policyCase.notRules ?? []) {
      if (assessment.matchedRuleIds.includes(rule)) {
        messages.push(`forbidden rule ${rule} matched`);
      }
    }

    return messages.length === 0
      ? []
      : [{ name: policyCase.name, messages }];
  });
}
