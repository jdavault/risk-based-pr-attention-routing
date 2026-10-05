import type {
  DeterministicAssessment,
  ReviewerType,
  RiskTier,
} from './attention.ts';

export interface AiClassification {
  readonly tier: RiskTier;
  readonly summary: string;
  readonly rationale: readonly string[];
  readonly blastRadius: string;
  readonly reviewFocus: readonly string[];
  readonly reviewerType: ReviewerType;
  readonly missingEvidence: readonly string[];
}

export interface FinalClassification extends AiClassification {
  readonly deterministicFloor: RiskTier;
}

const classificationKeys = [
  'tier',
  'summary',
  'rationale',
  'blastRadius',
  'reviewFocus',
  'reviewerType',
  'missingEvidence',
] as const;

const tierRank: Readonly<Record<RiskTier, number>> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRiskTier(value: unknown): value is RiskTier {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}

function isReviewerType(value: unknown): value is ReviewerType {
  return value === 'NON_LEAD_DEVELOPER' || value === 'TECH_LEAD_OR_SME';
}

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= 500
  );
}

function isStringList(
  value: unknown,
  allowEmpty: boolean,
  maximumItems: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.length <= maximumItems &&
    value.every(isBoundedString)
  );
}

function containsProhibitedAuthorityLanguage(
  classification: AiClassification,
): boolean {
  const text = [
    classification.summary,
    ...classification.rationale,
    classification.blastRadius,
    ...classification.reviewFocus,
    ...classification.missingEvidence,
  ].join('\n');

  return /\b(?:approved?|safe to merge|merge now|no human review (?:is )?required)\b/iu.test(
    text,
  );
}

function hasExactClassificationKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === classificationKeys.length &&
    classificationKeys.every((key) => Object.hasOwn(value, key))
  );
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function reviewerForTier(tier: RiskTier): ReviewerType {
  return tier === 'HIGH' ? 'TECH_LEAD_OR_SME' : 'NON_LEAD_DEVELOPER';
}

export function parseAiClassification(input: unknown): AiClassification {
  if (isRecord(input) && !isRiskTier(input.tier)) {
    throw new Error('AI classification tier is invalid.');
  }

  if (
    !isRecord(input) ||
    !hasExactClassificationKeys(input) ||
    !isRiskTier(input.tier) ||
    !isBoundedString(input.summary) ||
    !isStringList(input.rationale, false, 10) ||
    !isBoundedString(input.blastRadius) ||
    !isStringList(input.reviewFocus, false, 10) ||
    !isReviewerType(input.reviewerType) ||
    !isStringList(input.missingEvidence, true, 20)
  ) {
    throw new Error('AI classification output is invalid.');
  }

  const classification: AiClassification = {
    tier: input.tier,
    summary: input.summary,
    rationale: input.rationale,
    blastRadius: input.blastRadius,
    reviewFocus: input.reviewFocus,
    reviewerType: input.reviewerType,
    missingEvidence: input.missingEvidence,
  };

  if (containsProhibitedAuthorityLanguage(classification)) {
    throw new Error(
      'AI classification output contains prohibited authority language.',
    );
  }

  return classification;
}

export function enforceClassification(
  assessment: DeterministicAssessment,
  ai: AiClassification,
): FinalClassification {
  const tier =
    tierRank[ai.tier] > tierRank[assessment.floor] ? ai.tier : assessment.floor;
  const deterministicFloorRaisedTier = tier !== ai.tier;
  const deterministicReviewFocus = `Review deterministic floor signals: ${assessment.rationale.join(
    ', ',
  )}`;

  return {
    tier,
    deterministicFloor: assessment.floor,
    summary: deterministicFloorRaisedTier
      ? `Deterministic controls raised the final tier from ${ai.tier} to ${tier}. ${ai.summary}`
      : ai.summary,
    rationale: unique([...assessment.rationale, ...ai.rationale]),
    blastRadius: deterministicFloorRaisedTier
      ? `Treat the blast radius as at least ${tier} because deterministic signals established that floor. ${ai.blastRadius}`
      : ai.blastRadius,
    reviewFocus: unique(
      deterministicFloorRaisedTier
        ? [deterministicReviewFocus, ...ai.reviewFocus]
        : ai.reviewFocus,
    ),
    reviewerType: reviewerForTier(tier),
    missingEvidence: unique([
      ...assessment.missingEvidence,
      ...ai.missingEvidence,
    ]),
  };
}
