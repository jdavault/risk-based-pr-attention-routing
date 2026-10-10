import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { publicationMarker, type Publication } from '@p3sg/pr-attention-router/publication';
import { GitHubReader } from '../src/github.ts';
import { loadConfig } from '../src/config.ts';

const config = loadConfig({ PAR_ORIGIN: 'https://demo.example', PAR_REPOSITORIES: 'p3/reference',
  PAR_GITHUB_TOKEN: 'test-pat', PAR_SESSION_SECRET: 'a'.repeat(64), PAR_OIDC_ISSUER: 'https://issuer.example',
  PAR_OIDC_CLIENT_ID: 'client', PAR_OIDC_CLIENT_SECRET: 'secret', PAR_OIDC_SUBJECT: 'owner' });
const record: Publication = { version: 1, repository: 'p3/reference', pullRequest: 7, headSha: 'a'.repeat(40), baseSha: 'b'.repeat(40),
  policySha: 'c'.repeat(40), runId: 42, runAttempt: 1, createdAt: '2026-10-10T12:00:00.000Z', changedLines: 10,
  validationPassed: true, deterministicFloor: 'LOW', floorReasons: [], finalTier: 'MEDIUM',
  reviewer: 'Developer familiar with the affected area', aiUsed: true, aiTextWithheld: false,
  analysis: { summary: 'Shared contract.', reasons: ['Two callers.'], reviewFocus: ['Check callers.'], dimensions: null, missingEvidence: null } };
function fixture(options: { workflowId?: number; artifactRecord?: Publication; head?: string; digest?: string; publicationSuccess?: boolean; repository?: string } = {}) {
  const archive = zipSync({ 'classification.json': strToU8(JSON.stringify(options.artifactRecord ?? record)) });
  const calls: string[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input); calls.push(url);
    assert.equal(init?.method ?? 'GET', 'GET');
    if (url.startsWith('https://storage.blob.core.windows.net/')) {
      assert.equal(new Headers(init?.headers).has('authorization'), false);
      return new Response(archive);
    }
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-pat');
    const path = new URL(url).pathname;
    const data = path.endsWith('/pulls') ? [{ number: 7, title: 'Real queue change', html_url: 'https://github.com/p3/reference/pull/7', head: { sha: options.head ?? record.headSha }, draft: false }] :
      path.endsWith('/comments') ? [{ id: 9, body: publicationMarker(record), user: { type: 'Bot', login: 'github-actions[bot]' } }] :
      path.endsWith('/pr-attention-review.yml') ? { id: 5, path: config.workflow } :
      path.endsWith('/attempts/1') ? { id: 42, run_attempt: 1, workflow_id: options.workflowId ?? 5, path: config.workflow, event: 'workflow_run',
        head_branch: 'main', head_sha: record.policySha, repository: { full_name: options.repository ?? 'p3/reference' }, head_repository: { full_name: 'p3/reference' } } :
      path.endsWith('/jobs') ? { jobs: [{ name: 'Publish attention result', conclusion: options.publicationSuccess === false ? 'failure' : 'success' }] } :
      path.endsWith('/artifacts') ? { artifacts: [{ id: 60, name: `par-result-7-${record.headSha}-1`, expired: false, size_in_bytes: archive.length,
        digest: options.digest ?? `sha256:${createHash('sha256').update(archive).digest('hex')}`, workflow_run: { id: 42 } }] } :
      path.endsWith('/check-runs') ? { check_runs: [{ name: 'Validate', status: 'completed', conclusion: 'success' }] } :
      path.endsWith('/status') ? { statuses: [], state: 'pending' } :
      path === '/repos/p3/reference' ? { default_branch: 'main', full_name: 'p3/reference' } : null;
    if (path.endsWith('/60/zip')) return new Response(null, { status: 302, headers: { location: 'https://storage.blob.core.windows.net/result.zip' } });
    assert.notEqual(data, null, `Unexpected request: ${url}`);
    return Response.json(data);
  };
  return { transport, calls };
}
test('reads live PR metadata and verifies artifact, workflow and published evidence using GET only', async () => {
  const { transport, calls } = fixture();
  const queue = await new GitHubReader(config, transport).listPulls('p3/reference');
  assert.equal(queue.pulls[0]?.title, 'Real queue change');
  assert.equal(queue.pulls[0]?.classification.status, 'current');
  assert.equal(queue.pulls[0]?.classification.result?.analysis?.summary, 'Shared contract.');
  assert.equal(calls.some((url) => !url.startsWith('https://api.github.com/') && !url.startsWith('https://storage.blob.core.windows.net/')), false);
});
test('bot identity cannot substitute for workflow provenance, archive integrity or matching payload', async () => {
  for (const options of [{ workflowId: 999 }, { digest: `sha256:${'0'.repeat(64)}` },
    { artifactRecord: { ...record, pullRequest: 8 } }, { publicationSuccess: false }, { repository: 'other/repo' }]) {
    const queue = await new GitHubReader(config, fixture(options).transport).listPulls('p3/reference');
    assert.equal(queue.pulls[0]?.classification.status, 'unavailable');
    assert.equal(queue.pulls[0]?.classification.result, null);
  }
});
test('older head evidence is shown as stale, never as a current tier', async () => {
  const queue = await new GitHubReader(config, fixture({ head: 'd'.repeat(40) }).transport).listPulls('p3/reference');
  assert.equal(queue.pulls[0]?.classification.status, 'stale');
});
test('reader enforces allowlist even when called without the HTTP layer', async () => {
  const { transport, calls } = fixture();
  await assert.rejects(new GitHubReader(config, transport).listPulls('p3/other'));
  assert.equal(calls.length, 0);
});
