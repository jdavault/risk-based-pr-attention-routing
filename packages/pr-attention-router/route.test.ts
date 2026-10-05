import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildPrompt,
  countChangedLines,
  evaluateFloor,
  parseAiOutput,
  parsePaths,
  route,
  validateConfig,
  type Rule,
} from './route.ts';

// Generic fixture only: this file ships unchanged to every adopting repository.
const rules: readonly Rule[] = [
  { id: 'payments', tier: 'HIGH', paths: ['src/payments/**'], why: 'Money movement.' },
  { id: 'shared-ui', tier: 'MEDIUM', paths: ['src/ui/**', 'src/payments/**'], why: 'Shared UI.' },
];
const pullRequest = { number: 7, title: 'Update @team footer', url: 'https://example.test/pr/7' };
const quiet = { changedLines: 10, validationPassed: true };
const ai = (tier: string, extra: Record<string, unknown> = {}) => ({
  tier,
  summary: 'Adds a footer link.',
  reasons: ['Localized change.'],
  reviewFocus: ['Check the link.'],
  ...extra,
});
const base = { ...quiet, rules, previousTier: null, pullRequest };

test('deterministic floor', async (t) => {
  const cases = [
    { name: 'HIGH path', paths: ['src/payments/charge.ts'], tier: 'HIGH', reasons: 1 },
    { name: 'MEDIUM path', paths: ['src/ui/Button.tsx'], tier: 'MEDIUM', reasons: 1 },
    { name: 'unmatched path is LOW', paths: ['README.md'], tier: 'LOW', reasons: 0 },
    { name: 'anchored lookalike is LOW', paths: ['notes/src/payments/x.ts'], tier: 'LOW', reasons: 0 },
    { name: 'old side of a move still matches', paths: ['src/payments/old.ts', 'lib/new.ts'], tier: 'HIGH', reasons: 1 },
    { name: 'failed validation is MEDIUM', paths: ['README.md'], validationPassed: false, tier: 'MEDIUM', reasons: 1 },
    { name: '250 changed lines is MEDIUM', paths: ['README.md'], changedLines: 250, tier: 'MEDIUM', reasons: 1 },
    { name: '249 changed lines stays LOW', paths: ['README.md'], changedLines: 249, tier: 'LOW', reasons: 0 },
    { name: 'dotfile inside a ** directory matches', paths: ['src/payments/.npmrc'], tier: 'HIGH', reasons: 1 },
    { name: 'nested dot directory matches', paths: ['src/payments/.cache/x.ts'], tier: 'HIGH', reasons: 1 },
  ] as const;

  for (const c of cases) {
    await t.test(c.name, () => {
      const floor = evaluateFloor({ ...quiet, ...c, changedPaths: c.paths }, rules);
      assert.equal(floor.tier, c.tier);
      assert.equal(floor.reasons.length, c.reasons);
    });
  }
});

test('HIGH wins and lists only HIGH reasons', () => {
  const floor = evaluateFloor(
    { ...quiet, changedPaths: ['src/payments/charge.ts', 'src/ui/Button.tsx'] },
    rules,
  );
  assert.equal(floor.tier, 'HIGH');
  assert.deepEqual(floor.reasons, ['Money movement. [payments: src/payments/charge.ts]']);
});

test('final tier is max(floor, AI)', async (t) => {
  const cases = [
    { name: 'AI raises a MEDIUM path floor to HIGH', paths: ['src/ui/Footer.tsx'], ai: ai('HIGH'), floor: 'MEDIUM', final: 'HIGH', aiUsed: true },
    { name: 'AI below the floor cannot lower it', paths: ['src/payments/charge.ts'], ai: ai('LOW'), floor: 'HIGH', final: 'HIGH', aiUsed: true },
    { name: 'AI agrees with a LOW floor', paths: ['README.md'], ai: ai('LOW'), floor: 'LOW', final: 'LOW', aiUsed: true },
    { name: 'Codex failed: floor only', paths: ['src/ui/Footer.tsx'], ai: null, floor: 'MEDIUM', final: 'MEDIUM', aiUsed: false },
    { name: 'invalid tier: floor only', paths: ['README.md'], ai: ai('URGENT'), floor: 'LOW', final: 'LOW', aiUsed: false },
    { name: 'missing fields: floor only', paths: ['README.md'], ai: { tier: 'HIGH' }, floor: 'LOW', final: 'LOW', aiUsed: false },
  ] as const;

  for (const c of cases) {
    await t.test(c.name, () => {
      const result = route({ ...base, changedPaths: c.paths, aiClassification: c.ai });
      assert.equal(result.deterministicFloor, c.floor);
      assert.equal(result.finalTier, c.final);
      assert.equal(result.aiUsed, c.aiUsed);
    });
  }

  await t.test('malformed JSON from Codex: floor only, AI unavailable', () => {
    const result = route({ ...base, changedPaths: ['README.md'], aiClassification: parseAiOutput('{"tier": "HIGH"') });
    assert.equal(result.finalTier, 'LOW');
    assert.equal(result.aiUsed, false);
    assert.equal(result.aiTextWithheld, false);
    assert.match(result.comment, /AI unavailable; using deterministic floor\./u);
  });
});

test('authority language withholds AI text but keeps the AI tier', async (t) => {
  const cases = [
    { name: 'LOW floor + AI HIGH + "Not yet safe to merge"', paths: ['README.md'], ai: ai('HIGH', { summary: 'Not yet safe to merge.' }), final: 'HIGH' },
    { name: 'MEDIUM floor + AI LOW + "Approved"', paths: ['src/ui/Footer.tsx'], ai: ai('LOW', { summary: 'Approved.' }), final: 'MEDIUM' },
    { name: 'LOW floor + AI LOW + "LGTM"', paths: ['README.md'], ai: ai('LOW', { reasons: ['LGTM.'] }), final: 'LOW' },
    { name: 'domain vocabulary still withholds but keeps the tier', paths: ['README.md'], ai: ai('MEDIUM', { reasons: ['Changes how approved consulting requests are listed.'] }), final: 'MEDIUM' },
    { name: 'no-review claim in review focus', paths: ['README.md'], ai: ai('LOW', { reviewFocus: ['Does not need review.'] }), final: 'LOW' },
  ] as const;

  for (const c of cases) {
    await t.test(c.name, () => {
      const result = route({ ...base, changedPaths: c.paths, aiClassification: c.ai });
      assert.equal(result.finalTier, c.final);
      assert.equal(result.aiUsed, true);
      assert.equal(result.aiTextWithheld, true);
      assert.match(result.comment, /AI text withheld \(authority language\)\./u);
      assert.doesNotMatch(result.comment, /AI unavailable/u);
    });
  }
});

test('withheld AI text never appears in the comment or Slack alert', () => {
  const result = route({
    ...base,
    changedPaths: ['src/ui/Footer.tsx'],
    aiClassification: {
      tier: 'HIGH',
      summary: 'LGTM, ready to merge. SECRET-SUMMARY',
      reasons: ['SECRET-REASON'],
      reviewFocus: ['SECRET-FOCUS'],
    },
  });
  assert.equal(result.finalTier, 'HIGH');
  assert.equal(result.reviewer, 'Tech Lead or relevant SME');
  assert.equal(result.shouldNotify, true);
  for (const text of ['SECRET-SUMMARY', 'SECRET-REASON', 'SECRET-FOCUS', 'LGTM', 'ready to merge']) {
    assert.ok(!result.comment.includes(text), `comment leaked ${text}`);
    assert.ok(!result.notificationSummary.includes(text), `Slack leaked ${text}`);
  }
});

test('fallback comment says the AI was unavailable', () => {
  const result = route({ ...base, changedPaths: ['README.md'], aiClassification: null });
  assert.match(result.comment, /AI unavailable; using deterministic floor\./u);
});

test('reviewer comes from the final tier', () => {
  const reviewer = (changedPaths: readonly string[], aiClassification: unknown) =>
    route({ ...base, changedPaths, aiClassification }).reviewer;
  assert.equal(reviewer(['src/payments/a.ts'], null), 'Tech Lead or relevant SME');
  assert.equal(reviewer(['src/ui/a.tsx'], null), 'Developer familiar with the affected area');
  assert.equal(reviewer(['README.md'], ai('HIGH')), 'Tech Lead or relevant SME');
});

test('notify only on the first result or a tier change', async (t) => {
  for (const [previousTier, expected] of [[null, true], ['HIGH', false], ['MEDIUM', true]] as const) {
    await t.test(`previous ${previousTier ?? 'none'}`, () => {
      const result = route({ ...base, changedPaths: ['src/payments/a.ts'], aiClassification: null, previousTier });
      assert.equal(result.shouldNotify, expected);
    });
  }
});

test('comment and Slack summary', () => {
  const result = route({ ...base, changedPaths: ['src/payments/a.ts'], aiClassification: ai('HIGH') });
  assert.ok(result.comment.startsWith('<!-- par:v1 tier=HIGH -->\n'));
  assert.match(result.comment, /Money movement\./u);
  assert.doesNotMatch(result.comment, /Shared UI/u);
  assert.match(result.comment, /### Review focus\n\n- Check the link\./u);
  assert.deepEqual(result.notificationSummary.split('\n'), [
    '[HIGH] PR #7: Update @​team footer',
    'Reviewer: Tech Lead or relevant SME · Floor: HIGH',
    'https://example.test/pr/7',
  ]);
});

test('diff and AI output parsing', () => {
  assert.equal(countChangedLines('10\t5\ta.ts\n-\t-\timage.png\n3\t0\tb.ts\n'), 18);
  assert.deepEqual(parsePaths('a.ts\0dir/b c.ts\0é.md\0'), ['a.ts', 'dir/b c.ts', 'é.md']);
  assert.equal(parseAiOutput(''), null);
  assert.equal(parseAiOutput('Here is the JSON: {"tier":"LOW"}'), null);
  assert.deepEqual(parseAiOutput('{"tier":"LOW"}'), { tier: 'LOW' });
});

test('host config check', async (t) => {
  const rubric = '## LOW\nLow.\n\n## MEDIUM\nMedium.\n\n## HIGH\nHigh.\n';
  const tracked = ['src/payments/charge.ts', 'src/ui/Button.tsx'];
  const config = (value: unknown) => JSON.stringify({ rules: value });
  const cases = [
    { name: 'valid config', rules: config(rules), rubric, failures: [] },
    { name: 'invalid JSON', rules: '{', rubric, failures: ['rules.json is not valid JSON.'] },
    { name: 'no rules array', rules: '{}', rubric, failures: ['rules.json must have a "rules" array.'] },
    {
      name: 'missing fields',
      rules: config([{ id: 'x', tier: 'LOW', paths: [] }]),
      rubric,
      failures: ['x: tier must be HIGH or MEDIUM.', 'x: missing why.', 'x: paths must be a non-empty list of globs.'],
    },
    { name: 'duplicate id', rules: config([rules[0], rules[0]]), rubric, failures: ['payments: duplicate id.'] },
    {
      name: 'a stale glob is reported even beside a valid one',
      rules: config([{ id: 'payments', tier: 'HIGH', paths: ['src/payments/**', 'src/billing/**'], why: 'Money.' }]),
      rubric,
      failures: ['payments: no tracked file matches src/billing/**'],
    },
    { name: 'rubric heading missing', rules: config(rules), rubric: '## LOW\n## HIGH\n', failures: ['rubric.md: missing "## MEDIUM" heading.'] },
  ] as const;

  for (const c of cases) {
    await t.test(c.name, () => {
      assert.deepEqual(validateConfig(c.rules, c.rubric, tracked), c.failures);
    });
  }

  await t.test('a glob missing its leading dot does not validate', () => {
    assert.deepEqual(
      validateConfig(config([{ id: 'ci', tier: 'HIGH', paths: ['github/**'], why: 'CI.' }]), rubric, ['.github/workflows/verify.yml']),
      ['ci: no tracked file matches github/**'],
    );
  });

  await t.test('a glob that states the dot validates', () => {
    assert.deepEqual(
      validateConfig(config([{ id: 'ci', tier: 'HIGH', paths: ['.github/**'], why: 'CI.' }]), rubric, ['.github/workflows/verify.yml']),
      [],
    );
  });

  await t.test('null tracked files skips the glob check', () => {
    assert.deepEqual(validateConfig(config([{ id: 'a', tier: 'HIGH', paths: ['nowhere/**'], why: 'A.' }]), rubric, null), []);
  });
});

test('prompt carries the rubric, diff range, PR text, and floor', () => {
  const prompt = buildPrompt({
    genericPrompt: 'GENERIC PROCESS',
    rubric: '## LOW\nlow\n\n## MEDIUM\nmedium\n\n## HIGH\nhigh',
    evidence: { base: 'aaa', head: 'bbb', changedPaths: ['src/payments/a.ts'], changedLines: 1, validationPassed: true },
    floor: evaluateFloor({ changedPaths: ['src/payments/a.ts'], changedLines: 1, validationPassed: true }, rules),
    title: 'Add a payment retry',
    body: '',
  });

  for (const part of [
    'GENERIC PROCESS',
    'git diff aaa...bbb',
    'Title: Add a payment retry',
    '(No description.)',
    '# Repository rubric',
    '## HIGH',
    'Floor: HIGH',
    '- Money movement. [payments: src/payments/a.ts]',
  ]) {
    assert.ok(prompt.includes(part), `prompt is missing: ${part}`);
  }
});

test('comment neutralizes Markdown links and images', () => {
  const result = route({
    ...base,
    changedPaths: ['src/payments/[x](http://e.test).ts'],
    aiClassification: ai('HIGH', { summary: 'See [here](http://e.test) and ![](http://t.test/p.gif).' }),
  });
  assert.doesNotMatch(result.comment, /(?<!\\)\[[^\]]*(?<!\\)\]\(/u);
  assert.match(result.comment, /\\\[here\\\]\(http:\/\/e\.test\)/u);
  assert.ok(!result.notificationSummary.includes('\\['));
});
