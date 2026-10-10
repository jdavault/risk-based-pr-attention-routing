import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';

const config = loadConfig({ PAR_ORIGIN: 'https://demo.example', PAR_REPOSITORIES: 'p3/reference', PAR_GITHUB_TOKEN: 'github-secret',
  PAR_SESSION_SECRET: 'b'.repeat(64), PAR_OIDC_ISSUER: 'https://accounts.google.com', PAR_OIDC_CLIENT_ID: 'p3-client',
  PAR_OIDC_CLIENT_SECRET: 'oauth-secret', PAR_OIDC_SUBJECT: 'owner-123' });
async function setup(overrides: Record<string, unknown> = {}) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', use: 'sig', alg: 'RS256' };
  let nonce = ''; let grants = 0;
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/.well-known/openid-configuration')) return Response.json({ issuer: config.issuer,
      authorization_endpoint: `${config.issuer}/authorize`, token_endpoint: `${config.issuer}/token`, jwks_uri: `${config.issuer}/jwks`,
      response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'] });
    if (url.endsWith('/jwks')) return Response.json({ keys: [jwk] });
    assert.equal(url, `${config.issuer}/token`); grants++;
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get('redirect_uri'), `${config.origin}/api/auth/callback`);
    assert.ok((body.get('code_verifier') ?? '').length >= 43);
    assert.match(new Headers(init?.headers).get('authorization') ?? '', /^Basic /u);
    const claims = { iss: config.issuer, sub: config.subject, aud: config.clientId, nonce,
      exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000), ...overrides };
    const idToken = await new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(privateKey);
    return Response.json({ access_token: 'provider-secret', token_type: 'Bearer', expires_in: 300, id_token: idToken });
  };
  const app = createApp(config, { fetch: transport });
  const login = await app(new Request(`${config.origin}/api/auth/login`));
  assert.equal(login.status, 302);
  const url = new URL(login.headers.get('location')!);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), 'openid');
  nonce = url.searchParams.get('nonce')!;
  const cookie = login.headers.getSetCookie()[0]!.split(';')[0]!;
  const callback = `${config.origin}/api/auth/callback?code=code-from-provider&state=${url.searchParams.get('state')}`;
  return { app, callback, cookie, grants: () => grants };
}
test('real signed OIDC response establishes secure owner session without exposing credentials', async () => {
  const { app, callback, cookie } = await setup();
  const response = await app(new Request(callback, { headers: { cookie } }));
  assert.equal(response.status, 302);
  const session = response.headers.getSetCookie().find((c) => c.startsWith('__Host-par-session='))!;
  assert.match(session, /HttpOnly; SameSite=Lax; Max-Age=3600; Secure/u);
  const signedIn = await app(new Request(`${config.origin}/api/session`, { headers: { cookie: session.split(';')[0]! } }));
  assert.deepEqual(await signedIn.json(), { authenticated: true });
  assert.equal(session.includes('provider-secret'), false);
  assert.equal(session.includes('oauth-secret'), false);
});
test('wrong state and missing login cookie fail before token exchange', async () => {
  const { app, callback, cookie, grants } = await setup();
  assert.equal((await app(new Request(`${callback}wrong`, { headers: { cookie } }))).status, 401);
  assert.equal((await app(new Request(callback))).status, 401);
  assert.equal(grants(), 0);
});
test('wrong owner cannot authorize even with matching email/domain; invalid nonce/issuer/audience/expiry fail', async () => {
  for (const overrides of [{ sub: 'other', email: 'owner@p3.example', hd: 'p3.example' },
    { nonce: 'wrong' }, { iss: 'https://other.example' }, { aud: 'other-client' }, { exp: 1 }]) {
    const { app, callback, cookie } = await setup(overrides);
    const response = await app(new Request(callback, { headers: { cookie } }));
    assert.ok([401, 403].includes(response.status));
    assert.equal(response.headers.has('set-cookie'), false);
  }
});
