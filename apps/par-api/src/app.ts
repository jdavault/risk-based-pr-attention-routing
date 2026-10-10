import { cookie, createAuth, hasSession, sessionCookie } from './auth.ts';
import { GitHubReader } from './github.ts';
import type { Config } from './config.ts';

export function createApp(config: Config, dependencies: { fetch?: typeof fetch } = {}) {
  const transport = dependencies.fetch ?? fetch;
  const auth = createAuth(config, transport);
  const github = new GitHubReader(config, transport);
  return async (request: Request): Promise<Response> => {
    let response: Response;
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/auth/login' && request.method === 'GET') response = await auth.login();
      else if (url.pathname === '/api/auth/callback' && request.method === 'GET') response = await auth.callback(request);
      else if (!await hasSession(request, config)) response = Response.json({ error: 'Sign in to access the dashboard.' }, { status: 401 });
      else if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        response = request.headers.get('origin') === config.origin
          ? new Response(null, { status: 204, headers: { 'set-cookie': cookie(sessionCookie(config), '', config, 0) } })
          : Response.json({ error: 'Invalid request origin.' }, { status: 403 });
      } else if (request.method !== 'GET') response = Response.json({ error: 'Not found.' }, { status: 404 });
      else if (url.pathname === '/api/session') response = Response.json({ authenticated: true });
      else if (url.pathname === '/api/repositories') response = Response.json({ repositories: config.repositories });
      else if (url.pathname === '/api/pulls') {
        const repository = url.searchParams.get('repository') ?? '';
        response = config.repositories.includes(repository) ? Response.json(await github.listPulls(repository))
          : Response.json({ error: 'Repository is not configured.' }, { status: 403 });
      } else response = Response.json({ error: 'Not found.' }, { status: 404 });
    } catch {
      // Provider responses, tokens and private titles never enter logs or errors.
      response = Response.json({ error: 'Upstream data is unavailable. Check server configuration or retry later.' }, { status: 503 });
    }
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  };
}
