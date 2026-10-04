import type { FinalClassification } from '../src/router/enforceClassification';
import {
  sendAttentionEmail,
  type AttentionEmailInput,
  type PullRequestContext,
} from '../src/notifications/emailNotification';
import { createSmtpEmailTransport } from '../src/notifications/smtpEmailTransport';

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

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required ${name} variable.`);
  }

  return value;
}

function parseRecipients(name: string): readonly string[] {
  return requireEnvironment(name)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parsePort(name: string): number {
  const value = Number.parseInt(requireEnvironment(name), 10);

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseFinalClassification(input: unknown): FinalClassification {
  const value = isRecord(input) && isRecord(input.classification)
    ? input.classification
    : input;

  if (
    !isRecord(value) ||
    (value.tier !== 'LOW' && value.tier !== 'MEDIUM' && value.tier !== 'HIGH') ||
    (value.deterministicFloor !== 'LOW' &&
      value.deterministicFloor !== 'MEDIUM' &&
      value.deterministicFloor !== 'HIGH') ||
    typeof value.summary !== 'string' ||
    !isStringList(value.rationale) ||
    typeof value.blastRadius !== 'string' ||
    !isStringList(value.reviewFocus) ||
    (value.reviewerType !== 'NON_LEAD_DEVELOPER' &&
      value.reviewerType !== 'TECH_LEAD_OR_SME') ||
    !isStringList(value.missingEvidence)
  ) {
    throw new Error('Normalized classification input is invalid.');
  }

  return {
    tier: value.tier,
    deterministicFloor: value.deterministicFloor,
    summary: value.summary,
    rationale: value.rationale,
    blastRadius: value.blastRadius,
    reviewFocus: value.reviewFocus,
    reviewerType: value.reviewerType,
    missingEvidence: value.missingEvidence,
  };
}

function parsePullRequestContext(input: unknown): PullRequestContext {
  if (
    !isRecord(input) ||
    typeof input.repository !== 'string' ||
    !Number.isInteger(input.number) ||
    typeof input.title !== 'string' ||
    typeof input.url !== 'string'
  ) {
    throw new Error('Pull request context is invalid.');
  }

  return {
    repository: input.repository,
    number: input.number as number,
    title: input.title,
    url: input.url,
  };
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

async function main(): Promise<void> {
  const input: AttentionEmailInput = {
    classification: parseFinalClassification(
      parseJson(requireOption('--classification-json'), 'Classification'),
    ),
    pullRequest: parsePullRequestContext(
      parseJson(requireOption('--pr-context-json'), 'Pull request context'),
    ),
    recipients: {
      team: parseRecipients('PAR_EMAIL_TO_TEAM'),
      lead: parseRecipients('PAR_EMAIL_TO_LEAD'),
    },
    from: requireEnvironment('PAR_EMAIL_FROM'),
  };

  const result = await sendAttentionEmail(
    input,
    createSmtpEmailTransport({
      host: requireEnvironment('SMTP_HOST'),
      port: parsePort('SMTP_PORT'),
    }),
  );

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

await main();
