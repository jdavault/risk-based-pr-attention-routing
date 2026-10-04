import type { ReviewerType } from '../domain/attention';
import type { FinalClassification } from './enforceClassification';

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

function plainTextList(items: readonly string[]): string {
  return items.length === 0
    ? 'None identified.'
    : items.map((item) => `- ${neutralizeMentions(item)}`).join('\n');
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

export function renderNotificationText(
  classification: FinalClassification,
): string {
  return `PR Attention Review: ${classification.tier}

Classification only—human review and all merge decisions remain under human control.

${neutralizeMentions(classification.summary)}

Deterministic floor: ${classification.deterministicFloor}
Reviewer: ${reviewerLabel(classification.reviewerType)}

Rationale:
${plainTextList(classification.rationale)}

Blast radius:
${neutralizeMentions(classification.blastRadius)}

Review focus:
${plainTextList(classification.reviewFocus)}

Missing evidence:
${plainTextList(classification.missingEvidence)}
`;
}
