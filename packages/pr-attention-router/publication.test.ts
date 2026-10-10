import assert from 'node:assert/strict';
import { test } from 'node:test';
import { route } from './route.ts';
import { createPublication, parsePublication, publicationMarker, readPublication } from './publication.ts';

const input = {
  repository: 'p3/reference', pullRequest: 7, headSha: 'a'.repeat(40), baseSha: 'b'.repeat(40),
  policySha: 'c'.repeat(40), runId: 42, runAttempt: 1, createdAt: '2026-10-10T12:00:00.000Z',
  changedLines: 10, validationPassed: true,
  result: route({ changedPaths: [], changedLines: 10, validationPassed: true, rules: [],
    aiClassification: { tier: 'MEDIUM', summary: 'Shared queue contract.', reasons: ['Two consumers.'], reviewFocus: ['Check both consumers.'] },
    previousTier: null, pullRequest: { number: 7, title: 'Queue', url: 'https://github.com/p3/reference/pull/7' } }),
  aiClassification: { tier: 'MEDIUM', summary: 'Shared queue contract.', reasons: ['Two consumers.'], reviewFocus: ['Check both consumers.'] },
};
test('publication preserves real evidence and identity across the comment boundary', () => {
  const record = createPublication(input);
  assert.equal(record.finalTier, 'MEDIUM');
  assert.equal(record.analysis?.summary, 'Shared queue contract.');
  assert.deepEqual(readPublication(publicationMarker(record)), record);
  assert.equal(record.headSha, 'a'.repeat(40));
});
test('rejects weakened floors, invalid identity, duplicate markers and oversized evidence', () => {
  const record = createPublication(input);
  for (const patch of [{ finalTier: 'LOW', deterministicFloor: 'HIGH' }, { pullRequest: -1 },
    { headSha: 'main' }, { repository: '../private' }, { runAttempt: 0 }, { createdAt: 'yesterday' },
    { floorReasons: ['x'.repeat(2000)] }, { reviewer: 'No review required' }]) {
    assert.equal(parsePublication({ ...record, ...patch }), null);
  }
  assert.equal(readPublication(publicationMarker(record) + publicationMarker(record)), null);
  assert.equal(readPublication('<!-- par:v1 tier=LOW -->'), null);
});
test('withheld AI prose is not leaked into machine-readable evidence', () => {
  const record = createPublication({ ...input, aiClassification: { ...input.aiClassification, summary: 'Approved, safe to merge.' },
    result: { ...input.result, aiTextWithheld: true } });
  assert.equal(record.analysis, null);
  assert.equal(record.aiTextWithheld, true);
  assert.equal(JSON.stringify(record).includes('safe to merge'), false);
});

test('rejects undeclared publication authority fields', () => {
  const record = createPublication(input);
  assert.equal(parsePublication({ ...record, mergeAuthority: 'agent' }), null);
});

test('rejects undeclared analysis fields', () => {
  const record = createPublication(input);
  assert.ok(record.analysis);
  assert.equal(parsePublication({ ...record, analysis: { ...record.analysis, confidence: 1 } }), null);
});

const dimensions = {
  probability: { level: 'Low', detail: 'A narrow change is unlikely to fail.' },
  impact: { level: 'Moderate', detail: 'A failure could delay a review.' },
  detectability: { level: 'High', detail: 'Validation should expose a failure.' },
  blastRadius: { level: 'Low', detail: 'Only this pull request is affected.' },
} as const;

test('rejects undeclared risk dimensions', () => {
  const record = createPublication(input);
  assert.ok(record.analysis);
  assert.equal(parsePublication({ ...record, analysis: { ...record.analysis,
    dimensions: { ...dimensions, privacy: { level: 'High', detail: 'Unexpected authority surface.' } } } }), null);
});

test('rejects undeclared fields inside a risk dimension', () => {
  const record = createPublication(input);
  assert.ok(record.analysis);
  assert.equal(parsePublication({ ...record, analysis: { ...record.analysis,
    dimensions: { ...dimensions, probability: { ...dimensions.probability, score: 1 } } } }), null);
});
