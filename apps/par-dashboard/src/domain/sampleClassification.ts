import type {
  AiClassification,
  Floor,
  RouteResult,
  Rule,
} from '@p3sg/pr-attention-router';

import type { SamplePullRequest } from './attention';

// This browser-only dashboard demonstrates the public result contract. The
// canonical route() implementation is Node-only and runs in GitHub Actions.
function sampleRules(pullRequest: SamplePullRequest): readonly Rule[] {
  if (pullRequest.tier === 'LOW') return [];

  return [{
    id: `sample-${pullRequest.tier.toLowerCase()}`,
    tier: pullRequest.tier,
    paths: [`samples/${pullRequest.id}.ts`],
    why: pullRequest.summary,
  }];
}

function reviewerFor(tier: SamplePullRequest['tier']): string {
  return tier === 'HIGH'
    ? 'Tech Lead or relevant SME'
    : 'Developer familiar with the affected area';
}

function sampleComment(
  pullRequest: SamplePullRequest,
  floor: Floor,
  aiClassification: AiClassification,
): string {
  const floorReasons = floor.reasons.length > 0
    ? floor.reasons.map((reason) => `- ${reason}`).join('\n')
    : '- No deterministic signals.';
  const reasons = aiClassification.reasons.map((reason) => `- ${reason}`).join('\n');
  const reviewFocus = aiClassification.reviewFocus.map((focus) => `- ${focus}`).join('\n');

  return `<!-- par:v1 tier=${pullRequest.tier} -->
## PR Attention Review: ${pullRequest.tier}

> Classification only. Human review and every merge decision stay with people.

**Reviewer:** ${reviewerFor(pullRequest.tier)}

**Deterministic floor:** ${floor.tier}

${floorReasons}

${aiClassification.summary}

### Reasons

${reasons}

### Review focus

${reviewFocus}
`;
}

export function toSampleClassification(
  pullRequest: SamplePullRequest,
): RouteResult {
  const changedPaths = [`samples/${pullRequest.id}.ts`];
  const rules = sampleRules(pullRequest);
  const floor: Floor = {
    tier: pullRequest.tier,
    reasons: rules.map((rule) => `${rule.why} [${rule.id}: ${changedPaths[0]}]`),
  };
  const aiClassification: AiClassification = {
    tier: pullRequest.tier,
    summary: pullRequest.summary,
    reasons: pullRequest.evidence,
    reviewFocus: [pullRequest.reviewFocus],
  };

  return {
    deterministicFloor: floor.tier,
    floorReasons: floor.reasons,
    finalTier: pullRequest.tier,
    reviewer: reviewerFor(pullRequest.tier),
    aiUsed: true,
    aiTextWithheld: false,
    comment: sampleComment(pullRequest, floor, aiClassification),
    notificationSummary: [
      `[${pullRequest.tier}] PR #${pullRequest.number}: ${pullRequest.title}`,
      `Reviewer: ${reviewerFor(pullRequest.tier)} · Floor: ${floor.tier}`,
      `https://github.com/p3sg/risk-based-pr-attention-routing/pull/${pullRequest.number}`,
    ].join('\n'),
    shouldNotify: true,
  };
}
