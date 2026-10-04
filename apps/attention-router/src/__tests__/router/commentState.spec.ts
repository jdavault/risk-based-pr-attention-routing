import { describe, expect, it } from 'vitest';

import { parseCommentState, shouldNotify } from '../../router/commentState';

describe('commentState', () => {
  it('reads the versioned attention marker', () => {
    expect(parseCommentState('<!-- par:v1 tier=HIGH -->\nReview details')).toEqual({
      tier: 'HIGH',
      version: 1,
    });
  });

  it('notifies only for an initial classification or tier change', () => {
    expect(shouldNotify(null, 'LOW')).toBe(true);
    expect(shouldNotify('LOW', 'LOW')).toBe(false);
    expect(shouldNotify('LOW', 'MEDIUM')).toBe(true);
  });
});
