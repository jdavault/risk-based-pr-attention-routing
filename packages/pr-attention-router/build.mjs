import { copyFileSync, cpSync, chmodSync } from 'node:fs';
for (const name of ['classification-prompt.md', 'classification.schema.json']) {
  copyFileSync(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url));
}
cpSync(new URL('../../examples/', import.meta.url), new URL('dist/examples/', import.meta.url), { recursive: true });
chmodSync(new URL('dist/route.js', import.meta.url), 0o755);
