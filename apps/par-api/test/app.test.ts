import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.ts';
import { seal, cookie, sessionCookie } from '../src/auth.ts';
import { createApp } from '../src/app.ts';

export const env = { PAR_ORIGIN: 'http://localhost:3001', PAR_REPOSITORIES: 'p3/reference',
  PAR_GITHUB_TOKEN: 'test-pat', PAR_SESSION_SECRET: 'a'.repeat(64),
  PAR_OIDC_ISSUER: 'https://issuer.example', PAR_OIDC_CLIENT_ID: 'p3-demo',
  PAR_OIDC_CLIENT_SECRET: 'test-client', PAR_OIDC_SUBJECT: 'owner-id' };
const config = loadConfig(env);
const authHeader = async (patch = {}) => cookie(sessionCookie(config), await seal({
  kind: 'session', sub: config.subject, iss: config.issuer, ...patch }, config, 3600), config, 3600).split(';')[0]!;
const request = (path: string, headers = {}, method = 'GET') => new Request(`${config.origin}${path}`, { headers, method });

test('private routes reject missing, wrong-owner and tampered sessions before GitHub', async () => {
  let reads = 0;
  const app = createApp(config, { fetch: async () => { reads++; throw new Error('must not reach GitHub'); } });
  for (const value of ['', await authHeader({ sub: 'someone-else' }), `${await authHeader()}tamper`]) {
    const response = await app(request('/api/repositories', { cookie: value }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  assert.equal(reads, 0);
});
test('signed-in owner sees configured repositories and cannot query arbitrary ones', async () => {
  const app = createApp(config, { fetch: async () => { throw new Error('must not reach GitHub'); } });
  const headers = { cookie: await authHeader() };
  assert.deepEqual(await (await app(request('/api/repositories', headers))).json(), { repositories: ['p3/reference'] });
  assert.equal((await app(request('/api/pulls?repository=p3/secret', headers))).status, 403);
  assert.equal((await app(request('/api/classify', headers, 'POST'))).status, 404);
});
test('logout requires the configured origin and clears session', async () => {
  const app = createApp(config);
  const headers = { cookie: await authHeader() };
  assert.equal((await app(request('/api/auth/logout', headers, 'POST'))).status, 403);
  const response = await app(request('/api/auth/logout', { ...headers, origin: config.origin }, 'POST'));
  assert.equal(response.status, 204);
  assert.match(response.headers.get('set-cookie')!, /Max-Age=0/u);
});
test('invalid and insecure production configuration fails closed', () => {
  for (const patch of [{ PAR_SESSION_SECRET: '' }, { PAR_ORIGIN: 'http://demo.example' },
    { PAR_REPOSITORIES: 'https://evil.example' }, { PAR_OIDC_ISSUER: 'http://issuer.example' },
    { PAR_OIDC_SUBJECT: '' }]) assert.throws(() => loadConfig({ ...env, ...patch }));
});
test('expired sessions are rejected', async () => {
  const token = await seal({ kind: 'session', sub: config.subject, iss: config.issuer }, config, -1);
  assert.equal((await createApp(config)(request('/api/session', { cookie: `${sessionCookie(config)}=${token}` }))).status, 401);
});
