import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/** Only the trusted policy checkout calls this. PR files never supply policy. */
export function loadEngineeringContext(rubric: string, repositoryRoot: string): string {
  const section = /^## Engineering context\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(rubric)?.[1];
  if (!section) return '';
  const paths = [...section.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]!);
  if (paths.length > 8) throw new Error('At most eight engineering context documents are allowed.');
  const root = realpathSync(repositoryRoot);
  let bytes = 0;
  return [...new Set(paths)].map((path) => {
    if (!/^docs\/(?:[\w-]+\/)*[\w.-]+\.md$/.test(path) || path.includes('..')) {
      throw new Error('Engineering context must reference explicit Markdown files under docs/.');
    }
    const file = resolve(root, path);
    if (realpathSync(file) !== file || !file.startsWith(root + sep)) throw new Error('Symlinked context is not allowed.');
    const size = statSync(file).size;
    bytes += size;
    if (bytes > 32_000) throw new Error('Engineering context exceeds 32 KB.');
    return `## ${path}\n\n${readFileSync(file, 'utf8')}`;
  }).join('\n\n');
}
