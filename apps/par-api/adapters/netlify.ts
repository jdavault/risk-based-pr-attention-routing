import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
let app: ReturnType<typeof createApp> | undefined;
export default async function handler(request: Request): Promise<Response> {
  try { app ??= createApp(loadConfig()); return await app(request); }
  catch { return Response.json({ error: 'Application is not configured.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } }); }
}
export const config = { path: '/api/*' };
