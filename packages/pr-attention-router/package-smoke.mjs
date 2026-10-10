import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const expectedFiles = [
  'LICENSE',
  'README.md',
  'dist/classification-prompt.md',
  'dist/classification.schema.json',
  'dist/context.d.ts',
  'dist/context.js',
  'dist/examples/config/rubric.md',
  'dist/examples/config/rules.json',
  'dist/examples/github-action/README.md',
  'dist/examples/github-action/pr-attention-review.yml',
  'dist/publication.d.ts',
  'dist/publication.js',
  'dist/publish-record.d.ts',
  'dist/publish-record.js',
  'dist/route.d.ts',
  'dist/route.js',
  'package.json',
].sort();

const temporaryRoot = mkdtempSync(join(tmpdir(), 'pr-attention-router-smoke-'));
const failures = [];
const check = async (name, operation) => {
  try {
    await operation();
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

try {
  const staleFile = join(packageDir, 'dist', 'stale-release-file.txt');
  mkdirSync(dirname(staleFile), { recursive: true });
  writeFileSync(staleFile, 'must not ship\n');

  execFileSync('npm', ['run', 'build'], { cwd: packageDir, stdio: 'inherit' });
  const packOutput = execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', temporaryRoot,
  ], { cwd: packageDir, encoding: 'utf8' });
  const [packed] = JSON.parse(packOutput);
  assert.ok(packed?.filename, 'npm pack did not report a tarball filename');

  const inventory = packed.files.map(({ path }) => path).sort();
  await check('tarball inventory', () => assert.deepEqual(inventory, expectedFiles));
  await check('executable mode', () => {
    const route = packed.files.find(({ path }) => path === 'dist/route.js');
    assert.equal(route?.mode, 0o755, 'dist/route.js must be executable');
  });

  const consumerDir = join(temporaryRoot, 'consumer');
  mkdirSync(consumerDir);
  writeFileSync(join(consumerDir, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  const tarball = join(temporaryRoot, packed.filename);
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  const installedManifest = JSON.parse(readFileSync(join(
    consumerDir, 'node_modules', packed.name, 'package.json',
  ), 'utf8'));
  const packageName = installedManifest.name;
  await check('scoped package name', () => assert.equal(packageName, '@p3sg/pr-attention-router'));
  await check('v1 release metadata', () => {
    assert.equal(installedManifest.version, '1.0.0');
    assert.equal(installedManifest.license, 'Apache-2.0');
    assert.equal(installedManifest.author, 'Joe Davault');
    assert.deepEqual(installedManifest.repository, {
      type: 'git',
      url: 'git+https://github.com/p3sg/risk-based-pr-attention-routing.git',
      directory: 'packages/pr-attention-router',
    });
    assert.equal(installedManifest.homepage,
      'https://github.com/p3sg/risk-based-pr-attention-routing/tree/main/packages/pr-attention-router#readme');
    assert.deepEqual(installedManifest.bugs,
      { url: 'https://github.com/p3sg/risk-based-pr-attention-routing/issues' });
    assert.deepEqual(installedManifest.keywords,
      ['pull-request', 'code-review', 'risk-classification', 'automation', 'github-actions']);
    assert.deepEqual(installedManifest.engines, { node: '>=24' });
    assert.deepEqual(installedManifest.publishConfig, { access: 'public' });
    assert.deepEqual(installedManifest.dependencies ?? {}, {});
  });
  await check('packaged Apache license', () => {
    const license = readFileSync(join(consumerDir, 'node_modules', packed.name, 'LICENSE'), 'utf8');
    assert.match(license, /Apache License\s+Version 2\.0, January 2004/u);
    assert.match(license, /http:\/\/www\.apache\.org\/licenses\//u);
  });

  const runtimeSource = `
    import { route } from ${JSON.stringify(packageName)};
    import { parsePublication } from ${JSON.stringify(`${packageName}/publication`)};
    if (typeof route !== 'function' || typeof parsePublication !== 'function') process.exit(1);
  `;
  writeFileSync(join(consumerDir, 'runtime.mjs'), runtimeSource);
  await check('public runtime imports', () => execFileSync(process.execPath, ['runtime.mjs'], {
    cwd: consumerDir,
    stdio: 'pipe',
  }));

  writeFileSync(join(consumerDir, 'consumer.ts'), `
    import { route, type RouteResult } from ${JSON.stringify(packageName)};
    import { parsePublication, type Publication } from ${JSON.stringify(`${packageName}/publication`)};
    void route; void parsePublication; const result: RouteResult | Publication | null = null; void result;
  `);
  writeFileSync(join(consumerDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true,
  }, include: ['consumer.ts'] }));
  await check('public TypeScript imports', () => execFileSync(
    process.execPath,
    [join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'],
    { cwd: consumerDir, stdio: 'pipe' },
  ));

  writeFileSync(join(consumerDir, 'private.mjs'), `import ${JSON.stringify(`${packageName}/context`)};`);
  const privateImport = spawnSync(process.execPath, ['private.mjs'], { cwd: consumerDir, encoding: 'utf8' });
  await check('private subpath is blocked', () => {
    assert.notEqual(privateImport.status, 0, 'internal subpath unexpectedly resolved');
    assert.match(privateImport.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/u);
  });

  const cli = spawnSync(process.execPath, [join(consumerDir, 'node_modules', '.bin', 'pr-attention-router')], {
    cwd: consumerDir,
    encoding: 'utf8',
  });
  await check('installed CLI usage', () => {
    assert.notEqual(cli.status, 0, 'CLI without a command must fail');
    assert.match(cli.stderr, /Usage:\n  pr-attention-router evidence/u);
    assert.match(cli.stderr, /pr-attention-router prompt <adapter-dir> <evidence\.json> <pull-request\.json> \[repo-root\]/u);
  });

  if (failures.length > 0) throw new Error(`Package smoke failed:\n- ${failures.join('\n- ')}`);
  process.stdout.write('Package smoke passed: packed artifact, imports, types, CLI, and private boundaries verified.\n');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
