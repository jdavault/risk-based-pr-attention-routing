import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  renderClassificationComment,
  renderNotificationSummary,
  type FinalClassification,
} from '../lib/renderClassification.ts';

const classification: FinalClassification = {
  tier: 'MEDIUM',
  deterministicFloor: 'LOW',
  summary: 'The footer wording changed.',
  rationale: ['The change is localized.'],
  blastRadius: 'One page footer.',
  reviewFocus: ['Confirm the visible wording.'],
  reviewerType: 'NON_LEAD_DEVELOPER',
  missingEvidence: [],
};

describe('renderNotificationSummary', () => {
  it('renders the stable three-line notification contract', () => {
    assert.equal(
      renderNotificationSummary(classification, {
        number: 7,
        title: 'Tidy the footer',
        url: 'https://github.com/owner/repository/pull/7',
      }),
      [
        '[MEDIUM] PR #7: Tidy the footer',
        'Reviewer: Non-lead developer · Floor: LOW',
        'https://github.com/owner/repository/pull/7',
      ].join('\n'),
    );
  });

  it('neutralizes mentions supplied through the pull request title', () => {
    const result = renderNotificationSummary(classification, {
      number: 8,
      title: 'Ping @channel',
      url: 'https://github.com/owner/repository/pull/8',
    });

    assert.match(result, /@\u200Bchannel/u);
  });

  it('keeps detailed rationale in the persistent comment only', () => {
    const pullRequest = {
      number: 7,
      title: 'Tidy the footer',
      url: 'https://github.com/owner/repository/pull/7',
    };

    assert.doesNotMatch(
      renderNotificationSummary(classification, pullRequest),
      /The change is localized\./u,
    );
    assert.ok(
      renderClassificationComment(classification).includes(
        'The change is localized\\.',
      ),
    );
  });
});
