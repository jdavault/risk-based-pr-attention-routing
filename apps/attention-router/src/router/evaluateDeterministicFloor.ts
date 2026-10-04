import type { RiskTier, ReviewerType } from '../domain/attention';
import type { ChangedFile, DiffTotals } from './parseGitDiff';

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

export interface DeterministicAssessment {
  readonly floor: RiskTier;
  readonly reviewerType: ReviewerType;
  readonly rationale: readonly string[];
  readonly missingEvidence: readonly string[];
}

const highRiskPathPatterns: readonly RegExp[] = [
  /(^|\/)(auth|authorization|security|persistence|database|migrations?)(\/|$|-)/iu,
  /^\.github\/workflows\/.*(deploy|release|publish|permission|auth|security).+\.ya?ml$/iu,
  /^\.github\/workflows\/pr-attention-review\.ya?ml$/iu,
  /^\.github\/scripts\/publish-attention\.comment\.js$/iu,
];

const sharedCodePathPattern =
  /(^|\/)(hooks|services|shared|state|router)(\/|[-_.])/iu;

const operationalRunbookPathPatterns: readonly RegExp[] = [
  /^docs\/runbooks\//iu,
];

const dependencyOrConfigurationPatterns: readonly RegExp[] = [
  /(^|\/)package(?:-lock)?\.json$/iu,
  /(^|\/)(?:vite|eslint|commitlint|webpack|rollup)\.config\.[cm]?[jt]s$/iu,
  /(^|\/)tsconfig(?:\.[^-]+)?\.json$/iu,
  /(^|\/)Dockerfile$/u,
];

const testOrDocumentationPattern =
  /(^|\/)(__tests__|test|tests|docs)(\/|$)|\.(?:md|spec\.[jt]sx?|test\.[jt]sx?)$/iu;

const productionFilePattern = /\.(?:[cm]?[jt]sx?|css|scss|html)$/iu;

function hasMatchingPath(
  changedFiles: readonly ChangedFile[],
  patterns: readonly RegExp[],
): boolean {
  return changedFiles.some((file) =>
    [file.path, file.previousPath]
      .filter((path): path is string => path !== undefined)
      .some((path) => patterns.some((pattern) => pattern.test(path))),
  );
}

function allChangedPaths(changedFiles: readonly ChangedFile[]): string {
  return changedFiles
    .flatMap((file) =>
      file.previousPath === undefined
        ? [file.path]
        : [file.path, file.previousPath],
    )
    .join('|');
}

function countProductionFiles(changedFiles: readonly ChangedFile[]): number {
  return changedFiles.filter(
    (file) =>
      productionFilePattern.test(file.path) &&
      !testOrDocumentationPattern.test(file.path) &&
      !dependencyOrConfigurationPatterns.some((pattern) =>
        pattern.test(file.path),
      ),
  ).length;
}

function reviewerForTier(tier: RiskTier): ReviewerType {
  return tier === 'HIGH' ? 'TECH_LEAD_OR_SME' : 'NON_LEAD_DEVELOPER';
}

export function evaluateDeterministicFloor(
  evidence: PullRequestEvidence,
): DeterministicAssessment {
  const rationale: string[] = [];
  const missingEvidence: string[] = [];

  if (hasMatchingPath(evidence.changedFiles, highRiskPathPatterns)) {
    rationale.push(
      'Security, authorization, persistence, or sensitive workflow automation changed.',
    );

    return {
      floor: 'HIGH',
      reviewerType: reviewerForTier('HIGH'),
      rationale,
      missingEvidence,
    };
  }

  if (
    sharedCodePathPattern.test(allChangedPaths(evidence.changedFiles))
  ) {
    rationale.push('Shared hook or service changed.');
  }

  if (
    hasMatchingPath(evidence.changedFiles, operationalRunbookPathPatterns)
  ) {
    rationale.push('Operational runbook changed.');
  }

  if (
    hasMatchingPath(evidence.changedFiles, dependencyOrConfigurationPatterns)
  ) {
    rationale.push('Dependency or build configuration changed.');
  }

  if (countProductionFiles(evidence.changedFiles) >= 5) {
    rationale.push('Five or more production files changed.');
  }

  if (evidence.diffTotals.changedLines >= 250) {
    rationale.push('Change size is 250 lines or greater.');
  }

  if (evidence.validationStatus === 'FAILED') {
    rationale.push('Validation did not pass.');
  } else if (evidence.validationStatus === 'NOT_RUN') {
    rationale.push('Validation has not run.');
    missingEvidence.push('Passing validation result');
  }

  if (evidence.materialContext === 'MISSING') {
    rationale.push('Material PR context is missing.');
    missingEvidence.push('Sufficient PR intent and risk context');
  } else if (evidence.materialContext === 'CONFLICTING') {
    rationale.push('Material PR context conflicts.');
    missingEvidence.push('Resolved PR intent and risk context');
  }

  if (evidence.changedFiles.length === 0) {
    rationale.push('Changed-file evidence is unavailable.');
    missingEvidence.push('Changed-file evidence');
  }

  if (rationale.length > 0) {
    return {
      floor: 'MEDIUM',
      reviewerType: reviewerForTier('MEDIUM'),
      rationale,
      missingEvidence,
    };
  }

  return {
    floor: 'LOW',
    reviewerType: reviewerForTier('LOW'),
    rationale: [
      'Change is localized with passing validation and sufficient intent.',
    ],
    missingEvidence,
  };
}
