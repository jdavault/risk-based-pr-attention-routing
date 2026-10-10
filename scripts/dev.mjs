import { spawn } from 'node:child_process';
const build = spawn('npm', ['run', 'build', '--workspace', '@p3sg/pr-attention-router'], { stdio: 'inherit' });
build.on('exit', (code) => {
  if (code !== 0) { process.exitCode = code ?? 1; return; }
  const children = ['par-api', 'par-dashboard'].map((name) => spawn('npm', ['run', 'dev', '--workspace', name], { stdio: 'inherit' }));
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true; process.exitCode = code;
    for (const child of children) child.kill('SIGTERM');
  }
  for (const child of children) child.on('exit', (code) => stop(code ?? 0));
  process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
});
