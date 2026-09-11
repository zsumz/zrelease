import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { digest, writeJson } from '../src/common.ts';
import { execute } from '../src/cli.ts';
import { HttpError, TransportError } from '../src/http.ts';
import { graph, readPlan } from '../src/plan.ts';
import type { ReleasePlan } from '../src/plan.ts';
import { Registry } from '../src/registry.ts';
import { checkMetadataPolicy } from '../src/policy.ts';
import { render, renderRehearsal } from '../scripts/install.ts';
import { parse } from 'yaml';
import { environment, makeCapsule, temp } from './support.ts';

const pkg = (name: string, version = '1.2.3-rc.1', dependencies: unknown[] = []) => ({
  id: name, name, version, publish: null, manifest_path: `/workspace/${name}/Cargo.toml`,
  targets: [{ kind: ['lib'] }], dependencies,
});
const metadata = (...packages: ReturnType<typeof pkg>[]) => ({ workspace_members: packages.map(p => p.id), packages });
const dep = (req: string) => ({ name: 'base', path: '/workspace/base', req });

test('lockstep rejects mixed versions but leaves generic workspace releases available', () => {
  const input = metadata(pkg('base'), pkg('facade', '2.0.0'));
  assert.equal(graph(input).length, 2);
  assert.throws(() => graph(input, undefined, true), /lockstep.*version/);
});
for (const req of ['^1.2.3-rc.1', '*', '=1.2.3', undefined]) {
  test(`lockstep rejects internal requirement ${req}`, () => {
    const input = metadata(pkg('base'), pkg('facade', undefined, [{ ...dep(''), req, rename: 'engine', optional: true, kind: 'build', target: 'cfg(unix)' }]));
    assert.throws(() => graph(input, undefined, true), /lockstep.*exact/);
  });
}
test('lockstep permits exact selected dependencies and ignores unrelated registry versions', () => {
  const input = metadata(pkg('base'), pkg('facade', undefined, [dep('=1.2.3-rc.1'), { name: 'external', req: '^8' }]));
  assert.equal(graph(input, undefined, true).length, 2);
});
test('installer carries opt-in lockstep through both caller formats', () => {
  for (const renderer of [render, renderRehearsal]) for (const lockstep of [false, true]) {
    const workflow = parse(renderer('a'.repeat(40), 'base', '1.88.0', 'Cargo.toml', true, lockstep));
    assert.equal(Object.values<any>(workflow.jobs)[0].with.lockstep, lockstep);
  }
});
test('archive policy catches altered internal requirements independently of source metadata', async t => {
  const { candidate, metadata } = await makeCapsule(temp(t));
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: candidate.source, pipeline_ref: candidate.pipeline.revision,
    toolchain: candidate.toolchain.requested, manifest: 'Cargo.toml', publishing: true,
    version_policy: { mode: 'lockstep', version: '1.2.3', tag_prefix: 'v' },
    packages: [{ name: 'base', version: '1.2.3', needs: [] }, { ...candidate.package, needs: ['base'] }] };
  const payload = JSON.parse(metadata.toString());
  payload.deps = [{ name: 'base', version_req: '^1.2.3' }];
  assert.throws(() => checkMetadataPolicy(plan, payload), /lockstep archive dependency.*exact/);
  payload.deps[0].version_req = '=1.2.3'; checkMetadataPolicy(plan, payload);
});
test('sealed lockstep plans reject stable-looking tags over RC packages, including rehearsals', t => {
  const root = temp(t), path = join(root, 'plan.json');
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: { repository: 'zsumz/example', commit: 'a'.repeat(40), ref: 'refs/tags/v1.2.3' },
    pipeline_ref: 'b'.repeat(40), toolchain: '1.88.0', manifest: 'Cargo.toml', publishing: false,
    version_policy: { mode: 'lockstep', version: '1.2.3-rc.1', tag_prefix: 'v' },
    packages: [{ name: 'base', version: '1.2.3-rc.1', needs: [] }, { name: 'facade', version: '1.2.3-rc.1', needs: ['base'] }] };
  const read = () => { writeJson(path, plan); return readPlan(path, digest(readFileSync(path))); };
  assert.throws(read, /lockstep.*tag/);
  plan.source.ref = 'refs/tags/v1.2.3-rc.1'; read();
  plan.source.ref = 'refs/heads/release/1.2.3-rc.1'; read();
  plan.publishing = true; assert.throws(read, /lockstep.*tag/);
  plan.source.ref = 'refs/tags/v1.2.3-rc.1';
  plan.packages[1]!.version = '1.2.3'; assert.throws(read, /lockstep.*version/);
});

test('preflight checks the entire release and names every crate requiring bootstrap', async () => {
  const checked: string[] = [];
  const registry = new Registry({ request: async (method, url, options) => {
    assert.equal(method, 'GET'); assert.equal(options?.token, undefined);
    const name = url.split('/').at(-1)!; checked.push(name);
    if (name !== 'base') throw new HttpError(404, method, url);
    return Buffer.from(JSON.stringify({ name, vers: '0.1.0', yanked: false }) + '\n');
  } });
  await assert.rejects(registry.requireExisting(['base', 'new-core', 'new-alias']), /new-core, new-alias.*API token.*Trusted Publishing/s);
  assert.deepEqual(checked, ['base', 'new-core', 'new-alias']);
});
for (const failure of [new HttpError(403, 'GET', 'index'), new HttpError(503, 'GET', 'index'), new TransportError('offline'), Buffer.from('bad json'), Buffer.from('')]) {
  test(`preflight fails closed on ${String(failure)}`, async () => {
    const registry = new Registry({ request: async () => { if (failure instanceof Error) throw failure; return failure; } });
    await assert.rejects(registry.requireExisting(['base']));
  });
}
test('preflight accepts an existing crate even when the planned version is new', async () => {
  const registry = new Registry({ request: async () => Buffer.from('{"name":"base","vers":"0.0.1","yanked":true}\n') });
  await registry.requireExisting(['base']);
});
test('upload checks every planned name before the first PUT', async t => {
  environment(t, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/tags/v1.2.3' });
  const root = temp(t), { candidate } = await makeCapsule(root);
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: candidate.source, pipeline_ref: candidate.pipeline.revision,
    toolchain: candidate.toolchain.requested, manifest: 'Cargo.toml', publishing: true,
    packages: [{ ...candidate.package, needs: [] }, { name: 'missing-later', version: '1.2.3', needs: [] }] };
  const path = join(root, 'plan.json'); writeJson(path, plan);
  const sha = digest(readFileSync(path)); candidate.release_plan_sha256 = sha; writeJson(join(root, 'candidate.json'), candidate);
  await assert.rejects(execute(['upload', '--capsule', root, '--candidate-sha', digest(readFileSync(join(root, 'candidate.json'))),
    '--out', join(root, 'report'), '--confirm-publish', '--plan', path, '--plan-sha', sha], {
    deployments: () => assert.fail(), registry: () => ({
      requireExisting: async names => { assert.deepEqual(names, [candidate.package.name, 'missing-later']); throw new Error('bootstrap needed'); },
      publish: async () => assert.fail('no crate may upload'), observe: async () => assert.fail(),
    }),
  }), /bootstrap needed/);
});
