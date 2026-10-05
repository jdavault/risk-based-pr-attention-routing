import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import type { FinalClassification } from '../lib/enforceClassification.ts';
import { renderClassificationComment } from '../lib/renderClassification.ts';

interface GitHubComment {
  readonly id?: number;
  readonly body: string;
  readonly user: { readonly login: string; readonly type: string };
}

interface PublishArguments {
  readonly github: {
    readonly paginate: (
      method: unknown,
      options: unknown,
    ) => Promise<readonly GitHubComment[]>;
    readonly rest: {
      readonly issues: {
        readonly listComments: unknown;
        readonly createComment: (input: unknown) => Promise<unknown>;
        readonly updateComment: (input: unknown) => Promise<unknown>;
      };
    };
  };
  readonly context: { readonly repo: { readonly owner: string; readonly repo: string } };
  readonly core: { readonly setOutput: (name: string, value: string) => void };
  readonly pullRequestNumber?: number;
  readonly normalized?: {
    readonly commentBody: string;
    readonly classification: FinalClassification;
  };
  readonly dryRun?: boolean;
}

interface PublishAttentionComment {
  (arguments_: PublishArguments): Promise<void>;
  readonly selectAttentionComment: (
    comments: readonly GitHubComment[],
  ) => GitHubComment | null;
}

const require = createRequire(import.meta.url);
const publishAttentionComment = require(
  '../lib/publishAttentionComment.cjs',
) as PublishAttentionComment;

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

function botComment(tier: 'LOW' | 'MEDIUM' | 'HIGH'): GitHubComment {
  return {
    id: 12,
    body: `<!-- par:v1 tier=${tier} -->\nclassification`,
    user: { login: 'github-actions[bot]', type: 'Bot' },
  };
}

describe('publishAttentionComment', () => {
  it('selects the expected bot comment and ignores lookalikes', () => {
    const expected = botComment('MEDIUM');
    assert.equal(
      publishAttentionComment.selectAttentionComment([
        {
          body: '<!-- par:v1 tier=HIGH -->',
          user: { login: 'contributor', type: 'User' },
        },
        expected,
      ]),
      expected,
    );
  });

  it('rejects duplicate bot comments', () => {
    assert.throws(
      () =>
        publishAttentionComment.selectAttentionComment([
          botComment('LOW'),
          botComment('HIGH'),
        ]),
      /Multiple bot-authored PAR comments/u,
    );
  });

  it('suppresses notification when the tier is unchanged', async () => {
    const outputs = new Map<string, string>();
    const existing = botComment('MEDIUM');
    await publishAttentionComment({
      github: {
        async paginate() {
          return [existing];
        },
        rest: {
          issues: {
            listComments: {},
            async createComment() {},
            async updateComment() {},
          },
        },
      },
      context: { repo: { owner: 'owner', repo: 'repository' } },
      core: {
        setOutput(name, value) {
          outputs.set(name, value);
        },
      },
      pullRequestNumber: 17,
      normalized: {
        classification,
        commentBody: renderClassificationComment(classification),
      },
      dryRun: true,
    });

    assert.equal(outputs.get('should-notify'), 'false');
    assert.equal(outputs.get('tier'), 'MEDIUM');
  });
});
