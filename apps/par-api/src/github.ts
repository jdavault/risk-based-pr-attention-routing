import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import { parsePublication, readPublication, publicationLimit, type Publication } from '@p3sg/pr-attention-router/publication';
import type { Config } from './config.ts';
import type { PullView, Queue } from './types.ts';

interface Pull { number: number; title: string; head: { sha: string }; draft: boolean }
interface Comment { id: number; body: string; user: { type: string; login: string } }
interface Run { id: number; run_attempt: number; workflow_id: number; path: string; event: string; head_branch: string; head_sha: string; repository: { full_name: string }; head_repository: { full_name: string } }
interface Artifact { id: number; name: string; expired: boolean; size_in_bytes: number; digest: string; workflow_run: { id: number } }

async function bytes(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error('GitHub request failed');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length; if (length > limit) throw new Error('Response too large'); chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
export class GitHubReader {
  constructor(privateConfig: Config, transport: typeof fetch = fetch) { this.config = privateConfig; this.transport = transport; }
  private readonly config: Config;
  private readonly transport: typeof fetch;
  private async response(path: string, signal: AbortSignal): Promise<Response> {
    return this.transport(`https://api.github.com${path}`, { method: 'GET', redirect: 'manual', signal,
      headers: { authorization: `Bearer ${this.config.token}`, accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'p3-par-dashboard' } });
  }
  private async get<T>(path: string, signal: AbortSignal): Promise<T> {
    return JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(await bytes(await this.response(path, signal), 2_000_000))) as T;
  }
  private async comments(prefix: string, pr: number, signal: AbortSignal): Promise<Comment[]> {
    const all: Comment[] = [];
    for (let page = 1; page <= 3; page++) {
      const values = await this.get<Comment[]>(`${prefix}/issues/${pr}/comments?per_page=100&page=${page}`, signal);
      if (!Array.isArray(values)) throw new Error('Invalid comments'); all.push(...values);
      if (values.length < 100) return all;
    }
    throw new Error('Comment history exceeds bounded scan');
  }
  private async verify(prefix: string, repository: string, pr: number, record: Publication, workflow: { id: number; path: string }, defaultBranch: string, signal: AbortSignal): Promise<void> {
    if (record.repository.toLowerCase() !== repository.toLowerCase() || record.pullRequest !== pr || workflow.path !== this.config.workflow) throw new Error('Identity mismatch');
    const runPath = `${prefix}/actions/runs/${record.runId}`;
    const run = await this.get<Run>(`${runPath}/attempts/${record.runAttempt}`, signal);
    if (run.id !== record.runId || run.run_attempt !== record.runAttempt || run.workflow_id !== workflow.id || run.path !== workflow.path ||
      run.event !== 'workflow_run' || run.head_branch !== defaultBranch || run.head_sha !== record.policySha ||
      run.repository.full_name.toLowerCase() !== repository.toLowerCase() || run.head_repository.full_name.toLowerCase() !== repository.toLowerCase()) throw new Error('Untrusted run');
    const jobs = await this.get<{ jobs: { name: string; conclusion: string }[] }>(`${runPath}/attempts/${record.runAttempt}/jobs?per_page=100`, signal);
    if (!jobs.jobs.some((job) => job.name === 'Publish attention result' && job.conclusion === 'success')) throw new Error('Publication not completed');
    const artifacts = await this.get<{ artifacts: Artifact[] }>(`${runPath}/artifacts?per_page=100`, signal);
    const matches = artifacts.artifacts.filter((a) => a.name === `par-result-${pr}-${record.headSha}-${record.runAttempt}`);
    const artifact = matches[0];
    if (matches.length !== 1 || !artifact || artifact.expired || artifact.size_in_bytes > 128_000 || artifact.workflow_run.id !== run.id ||
      !/^sha256:[a-f0-9]{64}$/u.test(artifact.digest)) throw new Error('No verifiable artifact');
    const redirect = await this.response(`${prefix}/actions/artifacts/${artifact.id}/zip`, signal);
    if (redirect.status !== 302) throw new Error('Artifact unavailable');
    const location = new URL(redirect.headers.get('location') ?? '');
    if (location.protocol !== 'https:' || location.username || location.password ||
      !(location.hostname.endsWith('.blob.core.windows.net') || location.hostname.endsWith('.githubusercontent.com'))) throw new Error('Unexpected artifact host');
    // The signed download URL is short-lived. Never forward the GitHub PAT.
    const archive = await bytes(await this.transport(location.href, { method: 'GET', redirect: 'error', signal }), 128_000);
    if (`sha256:${createHash('sha256').update(archive).digest('hex')}` !== artifact.digest) throw new Error('Artifact digest mismatch');
    const files = unzipSync(archive, { filter: (file) => file.name === 'classification.json' && file.originalSize <= publicationLimit });
    const content = files['classification.json'];
    if (!content) throw new Error('Missing artifact record');
    const stored = parsePublication(JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(content)));
    if (!stored || JSON.stringify(stored) !== JSON.stringify(record)) throw new Error('Published evidence differs from artifact');
  }
  private async classification(prefix: string, repository: string, pull: Pull, workflow: { id: number; path: string }, branch: string, signal: AbortSignal): Promise<PullView['classification']> {
    let commentUrl: string | null = null;
    try {
      const comments = await this.comments(prefix, pull.number, signal);
      const comment = comments.filter((c) => c.user?.type === 'Bot' && c.user.login === 'github-actions[bot]' &&
        typeof c.body === 'string' && /<!--\s*par:/u.test(c.body)).sort((a, b) => b.id - a.id)[0];
      if (!comment) throw new Error('No publication');
      commentUrl = `https://github.com/${repository}/pull/${pull.number}#issuecomment-${comment.id}`;
      const record = readPublication(comment.body); if (!record) throw new Error('Legacy or invalid record');
      await this.verify(prefix, repository, pull.number, record, workflow, branch, signal);
      return { status: record.headSha === pull.head.sha ? 'current' : 'stale', result: record, commentUrl, reason: null };
    } catch {
      return { status: 'unavailable', result: null, commentUrl,
        reason: 'No verified publication is available. The workflow may be pending, legacy, expired or unverifiable.' };
    }
  }
  private async checks(prefix: string, sha: string, signal: AbortSignal): Promise<string> {
    try {
      const [checks, statuses] = await Promise.all([
        this.get<{ total_count?: number; check_runs: { status: string; conclusion: string | null }[] }>(`${prefix}/commits/${sha}/check-runs?per_page=100`, signal),
        this.get<{ total_count?: number; statuses: { state: string }[]; state: string }>(`${prefix}/commits/${sha}/status?per_page=100`, signal),
      ]);
      if ((checks.total_count ?? checks.check_runs.length) > 100 || (statuses.total_count ?? statuses.statuses.length) > 100) return 'Checks: partial';
      if (checks.check_runs.length + statuses.statuses.length === 0) return 'No checks reported';
      if (checks.check_runs.some((c) => ['failure', 'timed_out', 'cancelled', 'action_required', 'stale'].includes(c.conclusion ?? '')) ||
        statuses.statuses.some((s) => ['error', 'failure'].includes(s.state))) return 'Checks: failing';
      if (checks.check_runs.some((c) => c.status !== 'completed') || statuses.statuses.some((s) => s.state === 'pending')) return 'Checks: pending';
      return 'Reported checks complete';
    } catch { return 'Checks unavailable'; }
  }
  async listPulls(repository: string): Promise<Queue> {
    if (!this.config.repositories.includes(repository)) throw new Error('Repository not allowed');
    const signal = AbortSignal.timeout(22_000);
    const prefix = `/repos/${repository}`;
    const [pulls, repo, workflow] = await Promise.all([
      this.get<Pull[]>(`${prefix}/pulls?state=open&sort=updated&direction=desc&per_page=21`, signal),
      this.get<{ default_branch: string }>(prefix, signal),
      this.get<{ id: number; path: string }>(`${prefix}/actions/workflows/pr-attention-review.yml`, signal).catch(() => ({ id: 0, path: '' })),
    ]);
    if (!Array.isArray(pulls)) throw new Error('Invalid PR response');
    const views: PullView[] = [];
    for (let i = 0; i < Math.min(pulls.length, 20); i += 4) {
      views.push(...await Promise.all(pulls.slice(i, Math.min(i + 4, 20)).map(async (pull) => {
        if (!Number.isSafeInteger(pull.number) || pull.number < 1 || typeof pull.title !== 'string' || !/^[a-f0-9]{40}$/u.test(pull.head.sha)) throw new Error('Invalid PR');
        const [classification, checks] = await Promise.all([
          this.classification(prefix, repository, pull, workflow, repo.default_branch, signal), this.checks(prefix, pull.head.sha, signal),
        ]);
        return { number: pull.number, title: pull.title, repository, url: `https://github.com/${repository}/pull/${pull.number}`,
          headSha: pull.head.sha, draft: pull.draft, checks, classification };
      })));
    }
    return { pulls: views, truncated: pulls.length > 20, fetchedAt: new Date().toISOString() };
  }
}
