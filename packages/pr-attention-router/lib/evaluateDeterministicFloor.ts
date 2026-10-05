import type {
  DeterministicAssessment,
  ReviewerType,
  RiskTier,
} from './attention.ts';
import type { DeterministicPolicy, PathRule } from './deterministicPolicy.ts';
import type { ChangedFile, DiffTotals } from './parseGitDiff.ts';

export type MaterialContextState = 'SUFFICIENT' | 'MISSING' | 'CONFLICTING';
export type ValidationStatus = 'PASSED' | 'FAILED' | 'NOT_RUN';

export interface PullRequestEvidence {
  readonly title: string;
  readonly body: string;
  readonly jiraReference: string | undefined;
  readonly materialContext: MaterialContextState;
  readonly validationStatus: ValidationStatus;
  readonly changedFiles: readonly ChangedFile[];
  readonly diffTotals: DiffTotals;
}

function reviewerForTier(tier: RiskTier): ReviewerType {
  return tier === 'HIGH' ? 'TECH_LEAD_OR_SME' : 'NON_LEAD_DEVELOPER';
}

function pathsFor(file: ChangedFile): readonly string[] {
  return file.previousPath === undefined
    ? [file.path]
    : [file.path, file.previousPath];
}

function matchesRule(
  changedFiles: readonly ChangedFile[],
  rule: PathRule,
): boolean {
  return changedFiles.some((file) =>
    pathsFor(file).some((path) =>
      rule.patterns.some((pattern) => pattern.test(path)),
    ),
  );
}

function countProductionFiles(
  changedFiles: readonly ChangedFile[],
  policy: DeterministicPolicy,
): number {
  return changedFiles.filter(
    (file) =>
      policy.productionFilePattern.test(file.path) &&
      !policy.nonProductionFilePattern.test(file.path),
  ).length;
}

export function evaluateDeterministicFloor(
  evidence: PullRequestEvidence,
  policy: DeterministicPolicy,
): DeterministicAssessment {
  const highRationale: string[] = [];
  const mediumRationale: string[] = [];
  const missingEvidence: string[] = [];
  const matchedRuleIds: string[] = [];

  for (const rule of policy.pathRules) {
    if (!matchesRule(evidence.changedFiles, rule)) {
      continue;
    }

    matchedRuleIds.push(rule.id);
    (rule.tier === 'HIGH' ? highRationale : mediumRationale).push(
      rule.rationale,
    );
  }

  if (
    evidence.changedFiles.some(
      (file) => file.status === 'DELETED' && policy.testFilePattern.test(file.path),
    )
  ) {
    mediumRationale.push('A test file was deleted.');
  }

  if (
    countProductionFiles(evidence.changedFiles, policy) >=
    policy.productionFileThreshold
  ) {
    mediumRationale.push('Five or more production files changed.');
  }

  if (evidence.diffTotals.changedLines >= policy.changedLineThreshold) {
    mediumRationale.push('Change size is 250 lines or greater.');
  }

  if (evidence.validationStatus === 'FAILED') {
    mediumRationale.push('Validation did not pass.');
  } else if (evidence.validationStatus === 'NOT_RUN') {
    mediumRationale.push('Validation has not run.');
    missingEvidence.push('Passing validation result');
  }

  if (evidence.materialContext === 'MISSING') {
    mediumRationale.push('Material PR context is missing.');
    missingEvidence.push('Sufficient PR intent and risk context');
  } else if (evidence.materialContext === 'CONFLICTING') {
    mediumRationale.push('Material PR context conflicts.');
    missingEvidence.push('Resolved PR intent and risk context');
  }

  if (evidence.changedFiles.length === 0) {
    mediumRationale.push('Changed-file evidence is unavailable.');
    missingEvidence.push('Changed-file evidence');
  }

  const floor: RiskTier =
    highRationale.length > 0
      ? 'HIGH'
      : mediumRationale.length > 0
        ? 'MEDIUM'
        : 'LOW';
  const rationale =
    floor === 'LOW'
      ? ['Change is localized with passing validation and sufficient intent.']
      : [...highRationale, ...mediumRationale];

  return {
    floor,
    reviewerType: reviewerForTier(floor),
    rationale,
    missingEvidence,
    matchedRuleIds,
  };
}
