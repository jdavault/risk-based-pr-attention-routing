import { writeFile } from 'node:fs/promises';

import {
  enforceClassification,
  parseAiClassification,
} from '../lib/enforceClassification.ts';
import type { DeterministicAssessment } from '../lib/evaluateDeterministicFloor.ts';
import { renderClassificationComment } from '../lib/renderClassification.ts';

interface DeterministicEvidenceDocument {
  readonly assessment: DeterministicAssessment;
}

function readOption(name: string): string | undefined {
  const optionIndex = process.argv.indexOf(name);
  return optionIndex === -1 ? undefined : process.argv[optionIndex + 1];
}

function requireOption(name: string): string {
  const value = readOption(name);
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required ${name} option.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDeterministicEvidenceDocument(
  input: unknown,
): input is DeterministicEvidenceDocument {
  if (!isRecord(input) || !isRecord(input.assessment)) {
    return false;
  }

  const { floor, reviewerType, rationale, missingEvidence, matchedRuleIds } =
    input.assessment;
  return (
    (floor === 'LOW' || floor === 'MEDIUM' || floor === 'HIGH') &&
    (reviewerType === 'NON_LEAD_DEVELOPER' ||
      reviewerType === 'TECH_LEAD_OR_SME') &&
    isStringList(rationale) &&
    isStringList(missingEvidence) &&
    isStringList(matchedRuleIds)
  );
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

async function main(): Promise<void> {
  const outputPath = requireOption('--output');
  const deterministic = parseJson(
    requireOption('--deterministic-json'),
    'Deterministic evidence',
  );
  const ai = parseAiClassification(
    parseJson(requireOption('--ai-json'), 'AI classification'),
  );

  if (!isDeterministicEvidenceDocument(deterministic)) {
    throw new Error('Deterministic classification input is invalid.');
  }

  const classification = enforceClassification(deterministic.assessment, ai);
  await writeFile(
    outputPath,
    `${JSON.stringify({ classification, commentBody: renderClassificationComment(classification) }, null, 2)}\n`,
    'utf8',
  );
}

await main();
