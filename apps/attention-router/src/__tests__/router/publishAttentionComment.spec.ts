import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import type { FinalClassification } from '../../router/enforceClassification';
import { renderClassificationComment } from '../../router/renderClassification';

interface GitHubComment {
  readonly body: string;
  readonly user: {
    readonly login: string;
    readonly type: string;
  };
}

interface PublishAttentionCommentModule {
  readonly selectAttentionComment: (
    comments: readonly GitHubComment[],
  ) => GitHubComment | null;
}

const require = createRequire(import.meta.url);
const publishAttentionComment = require(
  '../../../../../.github/scripts/publish-attention.comment.js',
) as PublishAttentionCommentModule;

const classification: FinalClassification = {
  tier: 'MEDIUM',
  deterministicFloor: 'MEDIUM',
  summary: 'Shared routing behavior changed.',
  rationale: ['Shared router code changed.'],
  blastRadius: 'The review queue can be affected.',
  reviewFocus: ['Confirm routing behavior.'],
  reviewerType: 'NON_LEAD_DEVELOPER',
  missingEvidence: [],
};

describe('publish-attention comment marker', () => {
  it('recognizes the marker emitted by the classification renderer', () => {
    const comment: GitHubComment = {
      body: renderClassificationComment(classification),
      user: {
        login: 'github-actions[bot]',
        type: 'Bot',
      },
    };

    expect(publishAttentionComment.selectAttentionComment([comment])).toBe(
      comment,
    );
  });
});
