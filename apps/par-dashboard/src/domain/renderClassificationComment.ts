import type { ReviewerType } from './attention';
import type { FinalClassification } from './sampleClassification';

function reviewerLabel(reviewerType: ReviewerType): string {
  return reviewerType === 'TECH_LEAD_OR_SME'
    ? 'Tech Lead or relevant SME'
    : 'Developer familiar with the affected area';
}

function escapeMarkdown(value: string): string {
  return value
    .replaceAll('@', '@\u200B')
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

export function renderClassificationComment(
  classification: FinalClassification,
): string {
  return `<!-- par:v1 tier=${classification.tier} -->
## PR Attention Review — ${classification.tier}

> Classification only—human review and all merge decisions remain under human control.

${escapeMarkdown(classification.summary)}

**Deterministic floor:** ${classification.deterministicFloor}

**Reviewer:** ${reviewerLabel(classification.reviewerType)}

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
