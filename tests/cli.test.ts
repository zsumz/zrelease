import assert from 'node:assert/strict';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { execute, main } from '../src/cli.ts';
import type { Services } from '../src/cli.ts';
import { ReleaseError } from '../src/common.ts';
import { main as install, render } from '../scripts/install.ts';
import { environment, makeCapsule, ROOT, temp } from './support.ts';

test('installer uses the same literal pin twice', () => {
  const text = render('a'.repeat(40), 'test-crate', '1.96.0');
  assert.ok(text.includes('zsumz/zrelease/.github/workflows/release.yml@' + 'a'.repeat(40)));
  assert.ok(text.includes("pipeline-ref: '" + 'a'.repeat(40) + "'")); assert.ok(!text.includes('@@'));
});
for (const [name, sha, pkg, rust, manifest] of [
  ['floating pin', 'main', 'test-crate', '1.96.0', 'Cargo.toml'],
  ['floating toolchain', 'a'.repeat(40), 'test-crate', 'stable', 'Cargo.toml'],
  ['package injection', 'a'.repeat(40), 'x\nmalicious: true', '1.96.0', 'Cargo.toml'],
  ['manifest traversal', 'a'.repeat(40), 'test-crate', '1.96.0', '../Cargo.toml'],
  ['manifest injection', 'a'.repeat(40), 'test-crate', '1.96.0', "x'\n/Cargo.toml"],
]) test(`installer rejects ${name}`, () => assert.throws(() => render(sha!, pkg!, rust!, manifest!), ReleaseError));
test('installer supports workspace members', () => assert.ok(render('a'.repeat(40), 'test-crate', '1.96.0', 'crates/library/Cargo.toml').includes("manifest-path: 'crates/library/Cargo.toml'")));
test('installer refuses overwrite', t => {
  const out = join(temp(t), 'release.yml'); writeFileSync(out, 'keep me'); t.mock.method(console, 'error', () => {});
  assert.equal(install(['--sha', 'a'.repeat(40), '--package', 'test-crate', '--toolchain', '1.96.0', '--out', out]), 2);
  assert.equal(readFileSync(out, 'utf8'), 'keep me');
});
test('installer creates a usable workflow', t => {
  const out = join(temp(t), 'workflows/release.yml'); t.mock.method(console, 'log', () => {});
  assert.equal(install(['--sha', 'a'.repeat(40), '--package', 'test-crate', '--toolchain', '1.96.0', '--out', out]), 0);
  assert.ok(readFileSync(out, 'utf8').includes('default: false'));
});
test('CLI checks a valid capsule', async t => {
  environment(t); const path = temp(t), { sha } = await makeCapsule(path); t.mock.method(console, 'log', () => {});
  assert.equal(await main(['check', '--capsule', path, '--candidate-sha', sha]), 0);
});
const guardCases: [string, string[], Record<string, string>, RegExp][] = [
  ['explicit confirmation', [], {}, /confirm-publish/],
  ['GitHub context', ['--confirm-publish'], {}, /restricted to GitHub/],
  ['permitted event', ['--confirm-publish'], { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/tags/v1.2.3' }, /event cannot publish/],
  ['exact version tag', ['--confirm-publish'], { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main' }, /exact version tag/],
];
for (const [name, flags, env, message] of guardCases) test(`live upload requires ${name}`, async t => {
  environment(t, env); const path = temp(t), { sha } = await makeCapsule(path);
  const dependencies: Services = { registry: () => assert.fail('registry must not be constructed'), deployments: () => assert.fail('deployment client must not be constructed') };
  await assert.rejects(execute(['upload', '--capsule', path, '--candidate-sha', sha, '--out', join(path, 'report'), ...flags], dependencies), message);
});
for (const args of [[], ['unknown'], ['check'], ['check', '--no-such-option'], ['prepare', '--features-json', '{}']]) {
  test(`CLI rejects invalid arguments ${JSON.stringify(args)}`, async t => { t.mock.method(console, 'error', () => {}); assert.equal(await main(args), 2); });
}
test('CLI supports command help', async t => {
  t.mock.method(console, 'log', () => {});
  for (const command of ['prepare', 'check', 'upload', 'observe', 'consumer', 'rehearse', 'begin', 'finish']) assert.equal(await main([command, '--help']), 0);
});
test('missing evidence cannot close deployment green', async t => {
  environment(t); const path = temp(t), { sha } = await makeCapsule(path), out = join(path, 'release.json');
  const statuses: string[] = [];
  const dependencies: Services = { registry: () => assert.fail(), deployments: () => ({ begin: async () => 42, status: async (_id, state) => { statuses.push(state); return {}; } }) };
  assert.equal(await main(['finish', '--capsule', path, '--candidate-sha', sha, '--out', out, '--production', '--deployment-id', '42',
    '--run-url', 'https://github.com/zsumz/zrelease/actions/runs/1', '--results-json', '{"publish":"success","verify":"success"}'], dependencies), 0);
  const data = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(data.phase, 'missing-verification-evidence'); assert.equal(data.deployment_status, 'failure'); assert.deepEqual(statuses, ['failure']);
});
test('receipt survives a failed deployment status write', async t => {
  environment(t); const path = temp(t), { sha } = await makeCapsule(path), out = join(path, 'release.json'); t.mock.method(console, 'error', () => {});
  const dependencies: Services = { registry: () => assert.fail(), deployments: () => ({ begin: async () => 42, status: async () => { throw new ReleaseError('GitHub unavailable'); } }) };
  assert.equal(await main(['finish', '--capsule', path, '--candidate-sha', sha, '--out', out, '--production', '--deployment-id', '42',
    '--run-url', 'https://github.com/zsumz/zrelease/actions/runs/1', '--results-json', '{"publish":"success","verify":"failure"}'], dependencies), 2);
  assert.ok(existsSync(out)); assert.equal(JSON.parse(readFileSync(out, 'utf8')).phase, 'published-but-unverified');
});
test('standalone bundles run without node_modules or TypeScript source', async t => {
  environment(t); const path = temp(t); cpSync(join(ROOT, 'dist'), join(path, 'dist'), { recursive: true });
  cpSync(join(ROOT, 'templates'), join(path, 'templates'), { recursive: true });
  // Node's file permission boundary prevents loading this repository's source or node_modules.
  writeFileSync(join(path, 'package.json'), '{"type":"module"}');
  const { sha } = await makeCapsule(join(path, 'capsule'));
  const result = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${path}`, join(path, 'dist/zrelease.mjs'), 'check', '--capsule', join(path, 'capsule'), '--candidate-sha', sha], { cwd: path, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(result.status, 0, result.stderr);
  const installer = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${path}`, `--allow-fs-write=${path}`, join(path, 'dist/install.mjs'), '--sha', 'a'.repeat(40), '--package', 'example-lib', '--toolchain', '1.96.0', '--out', join(path, 'release.yml')], { cwd: path, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(installer.status, 0, installer.stderr);
});
test('bundled rehearsal completes without source imports', async t => {
  environment(t); const path = temp(t); cpSync(join(ROOT, 'dist'), join(path, 'dist'), { recursive: true });
  const { sha } = await makeCapsule(join(path, 'capsule'));
  const result = spawnSync(process.execPath, [join(path, 'dist/zrelease.mjs'), 'rehearse', '--capsule', join(path, 'capsule'), '--candidate-sha', sha, '--out', join(path, 'rehearsal.json')], { cwd: path, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(join(path, 'rehearsal.json'), 'utf8')).upload_count, 1);
});
