/** Qualify the real fixture in an existing clean Git checkout, without publishing. */
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { digest, requireThat } from '../src/common.ts';
import { run } from '../src/process.ts';

const root = resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { source: { type: 'string', default: root }, manifest: { type: 'string', default: 'fixtures/smoke/Cargo.toml' }, out: { type: 'string' } } });
const local = join(root, '.local');
mkdirSync(join(local, 'tmp'), { recursive: true });
process.env.TMPDIR = join(local, 'tmp');
const source = resolve(values.source!);
const out = values.out ? resolve(values.out) : mkdtempSync(join(local, 'cargo-fixture-'));
const commit = await run(['git', 'rev-parse', 'HEAD'], { cwd: source });
requireThat(!await run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd: source }), 'Cargo fixture needs a clean committed source checkout');
const cli = [process.execPath, join(root, 'dist/zrelease.mjs')];
// Clear bindings belonging to a surrounding workflow; this script creates its own fixture context.
const env = { ...process.env };
for (const key of ['GITHUB_REPOSITORY', 'GITHUB_SHA', 'PIPELINE_REF', 'GITHUB_OUTPUT', 'CARGO_REGISTRY_TOKEN', 'GITHUB_TOKEN']) delete env[key];
const plan = join(out, 'release-plan.json');
await run([...cli, 'plan', '--source', source, '--manifest', values.manifest!, '--members-json', '[{"name":"zrelease-fixture-do-not-publish","needs":[]}]',
  '--toolchain', '1.88.0', '--repository', 'zsumz/zrelease', '--commit', commit, '--ref', 'refs/heads/main', '--pipeline-ref', commit,
  '--base-branch', '', '--out', plan], { cwd: local, env });
const planSha = digest(readFileSync(plan));
for (const [name, flags] of [['default', []], ['extra', ['--no-default-features', '--features-json', '["extra"]']]] as const) {
  const capsule = join(out, name, 'capsule');
  await run([...cli, 'prepare', '--source', source, '--manifest', values.manifest!, '--package', 'zrelease-fixture-do-not-publish',
    '--toolchain', '1.88.0', '--repository', 'zsumz/zrelease', '--commit', commit, '--ref', 'refs/heads/main',
    '--pipeline-ref', commit, '--base-branch', '', '--out', capsule, '--plan', plan, '--plan-sha', planSha, ...flags], { cwd: local, env });
  const sha = digest(readFileSync(join(capsule, 'candidate.json')));
  await run([...cli, 'check', '--capsule', capsule, '--candidate-sha', sha, '--plan', plan, '--plan-sha', planSha], { cwd: local, env });
  await run([...cli, 'rehearse', '--capsule', capsule, '--candidate-sha', sha, '--out', join(out, name, 'rehearsal.json')], { cwd: local, env });
}
console.log(`Real Cargo fixture passed with default and extra feature configurations. Evidence: ${out}`);
