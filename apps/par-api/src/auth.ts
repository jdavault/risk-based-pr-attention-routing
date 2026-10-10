import * as oidc from 'openid-client';
import { EncryptJWT, jwtDecrypt, type JWTPayload } from 'jose';
import type { Config } from './config.ts';

const secure = (config: Config) => config.origin.startsWith('https:');
export const sessionCookie = (config: Config) => secure(config) ? '__Host-par-session' : 'par-session';
const transactionCookie = (config: Config) => secure(config) ? '__Host-par-login' : 'par-login';
export async function seal(payload: JWTPayload, config: Config, seconds: number): Promise<string> {
  return new EncryptJWT(payload).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setAudience(config.origin)
    .setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + seconds).encrypt(config.sessionSecret);
}
export function cookie(name: string, value: string, config: Config, seconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure(config) ? '; Secure' : ''}`;
}
async function openCookie(request: Request, name: string, config: Config): Promise<JWTPayload | null> {
  const values = (request.headers.get('cookie') ?? '').split(';').map((s) => s.trim()).filter((s) => s.startsWith(`${name}=`));
  if (values.length !== 1 || values[0]!.length > 4096) return null;
  try {
    const { payload } = await jwtDecrypt(values[0]!.slice(name.length + 1), config.sessionSecret,
      { audience: config.origin, issuer: config.issuer, keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] });
    return typeof payload.exp === 'number' && typeof payload.iat === 'number' ? payload : null;
  } catch { return null; }
}
export async function hasSession(request: Request, config: Config): Promise<boolean> {
  const data = await openCookie(request, sessionCookie(config), config);
  return data?.kind === 'session' && data.sub === config.subject && Number(data.exp) - Number(data.iat) <= 3600;
}
export function createAuth(config: Config, transport: typeof fetch = fetch) {
  let configuration: Promise<oidc.Configuration> | undefined;
  function client() {
    configuration ??= oidc.discovery(new URL(config.issuer), config.clientId, config.clientSecret, oidc.ClientSecretPost(config.clientSecret),
      { [oidc.customFetch]: (url, options) => transport(url, { ...options,
        body: options.body instanceof Uint8Array ? new Uint8Array(options.body) : options.body,
        signal: AbortSignal.timeout(10_000) }) })
      .then((c) => { oidc.enableNonRepudiationChecks(c); return c; }).catch((error: unknown) => { configuration = undefined; throw error; });
    return configuration;
  }
  return {
    async login(): Promise<Response> {
      const c = await client();
      const verifier = oidc.randomPKCECodeVerifier();
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const url = oidc.buildAuthorizationUrl(c, { scope: 'openid', response_type: 'code',
        redirect_uri: `${config.origin}/api/auth/callback`, code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        code_challenge_method: 'S256', state, nonce });
      const sealed = await seal({ kind: 'login', iss: config.issuer, verifier, state, nonce }, config, 600);
      return new Response(null, { status: 302, headers: { location: url.href,
        'set-cookie': cookie(transactionCookie(config), sealed, config, 600) } });
    },
    async callback(request: Request): Promise<Response> {
      const data = await openCookie(request, transactionCookie(config), config);
      const url = new URL(request.url);
      if (url.origin !== config.origin || data?.kind !== 'login' || typeof data.state !== 'string' ||
        typeof data.nonce !== 'string' || typeof data.verifier !== 'string' || url.searchParams.get('state') !== data.state) {
        return new Response('Login could not be verified.', { status: 401 });
      }
      try {
        const tokens = await oidc.authorizationCodeGrant(await client(), url, {
          pkceCodeVerifier: data.verifier, expectedState: data.state, expectedNonce: data.nonce, idTokenExpected: true });
        const claims = tokens.claims();
        if (claims?.iss !== config.issuer || claims.sub !== config.subject) return new Response('Access denied.', { status: 403 });
        const token = await seal({ kind: 'session', iss: claims.iss, sub: claims.sub }, config, 3600);
        const headers = new Headers({ location: '/' });
        headers.append('set-cookie', cookie(sessionCookie(config), token, config, 3600));
        headers.append('set-cookie', cookie(transactionCookie(config), '', config, 0));
        return new Response(null, { status: 302, headers });
      } catch { return new Response('Login could not be verified.', { status: 401 }); }
    },
  };
}
