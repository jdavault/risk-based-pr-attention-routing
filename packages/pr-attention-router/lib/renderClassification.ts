import type { ReviewerType } from './attention.ts';
import type { FinalClassification } from './enforceClassification.ts';

export type { FinalClassification } from './enforceClassification.ts';

export interface NotificationPullRequest {
  readonly number: number;
  readonly title: string;
  readonly url: string;
}

function reviewerLabel(reviewerType: ReviewerType): string {
  return reviewerType === 'TECH_LEAD_OR_SME'
    ? 'Tech Lead or relevant SME'
    : 'Non-lead developer';
}

function neutralizeMentions(value: string): string {
  return value.replaceAll('@', '@\u200B');
}

function escapeMarkdown(value: string): string {
  return neutralizeMentions(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/([\\`*_{}[\]()#+.!])/gu, '\\$1');
}

function markdownList(items: readonly string[]): string {
  return items.length === 0
    ? 'None identified.'
    : items.map((item) => `- ${escapeMarkdown(item)}`).join('\n');
}

function lowTierGuidance(classification: FinalClassification): string {
  return classification.tier === 'LOW'
    ? '\n> Human review is required in V1; this is a candidate for future agent-only approval.\n'
    : '';
}

export function renderClassificationComment(
  classification: FinalClassification,
): string {
  return `<!-- par:v1 tier=${classification.tier} -->
## PR Attention Review — ${classification.tier}

> Classification only—human review and all merge decisions remain under human control.

${escapeMarkdown(classification.summary)}

**Deterministic floor:** ${classification.deterministicFloor}

**Reviewer:** ${reviewerLabel(classification.reviewerType)}
${lowTierGuidance(classification)}
### Rationale

${markdownList(classification.rationale)}

### Blast radius

${escapeMarkdown(classification.blastRadius)}

### Review focus

${markdownList(classification.reviewFocus)}

### Missing evidence

${markdownList(classification.missingEvidence)}
`;
}

export function renderNotificationSummary(
  classification: FinalClassification,
  pullRequest: NotificationPullRequest,
): string {
  return [
    `[${classification.tier}] PR #${pullRequest.number}: ${neutralizeMentions(pullRequest.title)}`,
    `Reviewer: ${reviewerLabel(classification.reviewerType)} · Floor: ${classification.deterministicFloor}`,
    pullRequest.url,
  ].join('\n');
}
