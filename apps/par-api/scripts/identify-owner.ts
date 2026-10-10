import { createServer } from 'node:http';
import { beginOwnerSetup, setupRedirect } from '../src/owner-setup.ts';

const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`Set ${name} in your server-only environment first.`); return value; };
const safeIdentifier = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/u.test(value) ? value : undefined;
const setup = await beginOwnerSetup({ issuer: required('PAR_OIDC_ISSUER'), clientId: required('PAR_OIDC_CLIENT_ID'), clientSecret: required('PAR_OIDC_CLIENT_SECRET') });
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store'); response.setHeader('Content-Type', 'text/plain');
  response.setHeader('Referrer-Policy', 'no-referrer');
  const url = new URL(request.url ?? '/', setupRedirect);
  if (url.pathname !== '/callback') { response.writeHead(404).end('Not found.'); return; }
  void setup.complete(url).then((identity) => {
    console.log(`Validated identity (confirm this is the intended owner):\nPAR_OIDC_ISSUER=${identity.issuer}\nPAR_OIDC_SUBJECT=${identity.subject}`);
    response.end('Identity verified. Return to your local terminal. No application access has been granted.');
    server.close();
  }).catch((error: unknown) => {
    const { name, code, error: oauthError } = (error ?? {}) as Record<string, unknown>;
    console.error('Identity verification failed. Restart the local setup helper.', {
      name: safeIdentifier(name), code: safeIdentifier(code), oauthError: safeIdentifier(oauthError),
    });
    response.writeHead(401).end('Identity could not be verified. Restart the local setup helper.'); server.close(); });
});
server.listen(3002, '127.0.0.1', () => console.log(`Open this URL in your own browser, and select the intended P3 owner account:\n${setup.url.href}\nThis local setup expires after five minutes.`));
server.on('error', () => { console.error('Could not start local identity setup. Check port 3002.'); process.exitCode = 1; });
const timer = setTimeout(() => server.close(), 300_000); timer.unref();
