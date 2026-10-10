import * as oidc from 'openid-client';

export const setupRedirect = 'http://localhost:3002/callback';
/** Local operator helper only. Never mounted in the API or included by its adapters. */
export async function beginOwnerSetup(settings: { issuer: string; clientId: string; clientSecret: string }, transport: typeof fetch = fetch) {
  const issuer = new URL(settings.issuer);
  if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash) throw new Error('Invalid issuer');
  const client = await oidc.discovery(issuer, settings.clientId, settings.clientSecret, oidc.ClientSecretPost(settings.clientSecret),
    { [oidc.customFetch]: (url, options) => transport(url, { ...options,
      body: options.body instanceof Uint8Array ? new Uint8Array(options.body) : options.body, signal: AbortSignal.timeout(10_000) }) });
  oidc.enableNonRepudiationChecks(client);
  const verifier = oidc.randomPKCECodeVerifier(); const state = oidc.randomState(); const nonce = oidc.randomNonce();
  const expires = Date.now() + 300_000; let used = false;
  const url = oidc.buildAuthorizationUrl(client, { scope: 'openid', response_type: 'code', redirect_uri: setupRedirect,
    state, nonce, code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256' });
  return { url, async complete(callback: URL): Promise<{ issuer: string; subject: string }> {
    if (used || Date.now() > expires || callback.origin + callback.pathname !== setupRedirect || callback.searchParams.get('state') !== state) throw new Error('Invalid setup callback');
    used = true;
    const tokens = await oidc.authorizationCodeGrant(client, callback, { pkceCodeVerifier: verifier, expectedState: state, expectedNonce: nonce, idTokenExpected: true });
    const claims = tokens.claims();
    if (claims?.iss !== settings.issuer || !claims.sub) throw new Error('Invalid identity');
    return { issuer: claims.iss, subject: claims.sub };
  } };
}
