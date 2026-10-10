import { createServer } from 'node:http';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

let app: (request: Request) => Promise<Response>;
let origin = 'http://localhost:5173';
try { const config = loadConfig(); origin = config.origin; app = createApp(config); }
catch { app = async () => Response.json({ error: 'Configure apps/par-api/.env to enable login and GitHub reads.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
createServer(async (req, res) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  const response = await app(new Request(new URL(req.url ?? '/', origin), { method: req.method ?? 'GET', headers }));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => { console.log('P3 API listening on loopback.'); });
