export interface Config {
  origin: string; repositories: readonly string[]; token: string; sessionSecret: Uint8Array;
  issuer: string; clientId: string; clientSecret: string; subject: string; workflow: string;
}
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const required = (name: string) => { const value = env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value; };
  const origin = new URL(required('PAR_ORIGIN'));
  if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) ||
    origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid PAR_ORIGIN');
  const issuer = new URL(required('PAR_OIDC_ISSUER'));
  if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash) throw new Error('Invalid OIDC issuer');
  const secret = required('PAR_SESSION_SECRET');
  if (!/^[a-fA-F0-9]{64}$/u.test(secret)) throw new Error('Session secret must be 32 random bytes encoded as hex');
  const repositories = [...new Set(required('PAR_REPOSITORIES').split(',').map((r) => r.trim()))];
  if (repositories.length > 10 || repositories.some((r) => !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(r) || r.split('/').some((p) => p === '.' || p === '..'))) throw new Error('Invalid repositories');
  return { origin: origin.origin, repositories, token: required('PAR_GITHUB_TOKEN'), sessionSecret: Buffer.from(secret, 'hex'),
    issuer: required('PAR_OIDC_ISSUER'), clientId: required('PAR_OIDC_CLIENT_ID'), clientSecret: required('PAR_OIDC_CLIENT_SECRET'),
    subject: required('PAR_OIDC_SUBJECT'), workflow: '.github/workflows/pr-attention-review.yml' };
}
