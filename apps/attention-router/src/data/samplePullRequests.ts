import type { SamplePullRequest } from '../domain/attention';

export const samplePullRequests: readonly SamplePullRequest[] = [
  {
    id: 'refine-tier-card-guidance',
    number: 17,
    title: 'Refine tier card guidance',
    repository: 'risk-based-pr-attention-routing',
    tier: 'LOW',
    reviewerType: 'NON_LEAD_DEVELOPER',
    reviewerLabel: 'Non-lead developer',
    summary:
      'Clarifies isolated dashboard copy without changing shared behavior.',
    evidence: ['Copy only', '1 file', 'Tests passing'],
    probability: {
      level: 'Low',
      detail: 'The change is localized and mechanically verifiable.',
    },
    impact: {
      level: 'Low',
      detail: 'Only explanatory text in this synthetic dashboard is affected.',
    },
    detectability: {
      level: 'High',
      detail: 'Component tests and visible copy expose regressions quickly.',
    },
    blastRadius: {
      level: 'Low',
      detail: 'One presentational card in the POC is affected.',
    },
    reviewFocus: 'Confirm the copy is accurate and remains understandable.',
    missingEvidence: [],
  },
  {
    id: 'share-queue-filtering-state',
    number: 18,
    title: 'Share queue filtering state',
    repository: 'risk-based-pr-attention-routing',
    tier: 'MEDIUM',
    reviewerType: 'NON_LEAD_DEVELOPER',
    reviewerLabel: 'Non-lead developer',
    summary:
      'Changes shared filtering behavior used by the tier cards and review queue.',
    evidence: ['Shared state', '4 files', 'Behavior change'],
    probability: {
      level: 'Moderate',
      detail: 'Several components depend on the same selection state.',
    },
    impact: {
      level: 'Moderate',
      detail: 'Incorrect state could hide pull requests from the review queue.',
    },
    detectability: {
      level: 'Moderate',
      detail: 'Interaction tests cover expected filters but not every sequence.',
    },
    blastRadius: {
      level: 'Moderate',
      detail: 'All dashboard tier and queue interactions are affected.',
    },
    reviewFocus:
      'Verify filter changes preserve selection and never hide eligible work.',
    missingEvidence: ['Cross-browser interaction results'],
  },
  {
    id: 'protect-reviewer-authorization-policy',
    number: 19,
    title: 'Protect reviewer authorization policy',
    repository: 'risk-based-pr-attention-routing',
    tier: 'HIGH',
    reviewerType: 'TECH_LEAD_OR_SME',
    reviewerLabel: 'Tech Lead or relevant SME',
    summary:
      'Changes the policy boundary that determines who may review sensitive work.',
    evidence: ['Authorization', 'Policy boundary', 'Difficult to detect'],
    probability: {
      level: 'Moderate',
      detail: 'Policy changes are compact but easy to misinterpret.',
    },
    impact: {
      level: 'High',
      detail: 'A mistake could route sensitive work to an inappropriate reviewer.',
    },
    detectability: {
      level: 'Low',
      detail: 'The incorrect reviewer may look valid in ordinary UI testing.',
    },
    blastRadius: {
      level: 'High',
      detail: 'The policy can affect every sensitive pull request in scope.',
    },
    reviewFocus:
      'Confirm authorization boundaries, fallback behavior, and human ownership.',
    missingEvidence: ['Independent policy-owner approval'],
  },
] as const;
