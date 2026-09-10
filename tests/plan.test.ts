import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { render } from '../scripts/install.ts';
import { bindCandidate, graph, readPlan } from '../src/plan.ts';
import type { ReleasePlan } from '../src/plan.ts';
import { digest, writeJson } from '../src/common.ts';
import { execute } from '../src/cli.ts';
import { environment, makeCapsule, ROOT, temp } from './support.ts';

const pkg = (name: string, needs: string[] = [], extra = {}) => ({ name, id: name, version: '1.2.3', publish: null,
  manifest_path: `/workspace/${name}/Cargo.toml`, targets: [{ kind: ['lib'] }], dependencies: needs.map(name => ({ name, path: `/workspace/${name}` })), ...extra });
const metadata = (...packages: ReturnType<typeof pkg>[]) => ({ workspace_members: packages.map(p => p.id), packages });
const family = () => metadata(pkg('alias', ['facade']), pkg('facade', ['base', 'sync']), pkg('sync'), pkg('base'), pkg('private', [], { publish: [] }));
const members = () => graph(family()).map(({ name, needs }) => ({ name, needs }));

test('workspace graph includes normal, build and development path dependencies in order', () => {
  const result = graph(family());
  assert.deepEqual(result.map(p => p.name), ['base', 'sync', 'facade', 'alias']);
  assert.deepEqual(result.find(p => p.name === 'facade')!.needs, ['base', 'sync']);
});
test('single crate selection leaves already-published dependencies outside the train', () => assert.deepEqual(graph(family(), ['facade']), [{ name: 'facade', version: '1.2.3', needs: [] }]));
for (const [name, value, selection] of [
  ['dependency cycles', metadata(pkg('a', ['b']), pkg('b', ['a'])), undefined],
  ['private crate', family(), ['private']],
  ['duplicate crate', family(), ['base', 'base']],
  ['unknown crate', family(), ['unknown']],
  ['empty release', metadata(), undefined],
  ['binary-only crate', metadata(pkg('bin', [], { targets: [{ kind: ['bin'] }] })), undefined],
] as const) test(`planner rejects ${name}`, () => assert.throws(() => graph(value, selection ? [...selection] : undefined)));
test('renamed, optional and target-specific path dependencies still order the train', () => {
  const result = graph(metadata(pkg('base'), pkg('facade', [], { dependencies: [{ name: 'base', rename: 'engine', optional: true, kind: 'build', target: 'cfg(unix)', path: '/workspace/base' }] })));
  assert.deepEqual(result[1]!.needs, ['base']);
});
test('registry dependencies on another selected crate also order the train', () => {
  const result = graph(metadata(pkg('base'), pkg('facade', [], { dependencies: [{ name: 'base', path: null, source: 'registry+https://github.com/rust-lang/crates.io-index', registry: null }] })));
  assert.deepEqual(result[1]!.needs, ['base']);
});

test('single and multi-crate callers share exactly one approval workflow', () => {
  const approval = parse(readFileSync(join(ROOT, '.github/workflows/plan.yml'), 'utf8'));
  assert.deepEqual(approval.jobs.approve.needs, ['plan']);
  assert.equal(approval.jobs.approve.if, 'inputs.publish');
  assert.equal(approval.jobs.approve.environment.name, 'release');
  assert.deepEqual(approval.jobs.approve.permissions, { contents: 'read', 'id-token': 'write', attestations: 'write' });
  assert.match(approval.on.workflow_call.outputs['artifact-id'].value, /jobs.ready/);
  for (const selection of ['one-crate', members()]) {
    const caller = parse(render('a'.repeat(40), selection, '1.88.0'));
    assert.equal(Object.values(caller.jobs).filter((j: any) => j.uses.includes('/plan.yml@')).length, 1);
    assert.equal(caller.concurrency['cancel-in-progress'], false);
    for (const [name, value] of Object.entries(caller.jobs)) {
      if (name === 'plan') continue;
      const job = value as any;
      assert.ok(job.needs.includes('plan'));
      assert.equal(job.if, undefined); // GitHub's default success() blocks on rejected or failed prerequisites.
      assert.equal(job.with['plan-artifact-id'], '${{ needs.plan.outputs.artifact-id }}');
      assert.equal(job.with['plan-sha256'], '${{ needs.plan.outputs.plan-sha256 }}');
      assert.equal(job.with['approval-artifact-id'], '${{ needs.plan.outputs.approval-artifact-id }}');
    }
  }
});
test('the approval gate fails closed on rejected, cancelled, missing or unsuccessful planning', () => {
  const approval = parse(readFileSync(join(ROOT, '.github/workflows/plan.yml'), 'utf8'));
  const script = approval.jobs.ready.steps[0].run;
  for (const publish of ['true', 'false']) for (const plan of ['success', 'failure', 'cancelled', 'skipped']) {
    for (const approved of ['success', 'failure', 'cancelled', 'skipped', '']) {
      const status = spawnSync('bash', ['-c', script], { env: { PATH: process.env.PATH, PUBLISH: publish, PLAN_RESULT: plan, APPROVAL_RESULT: approved } }).status;
      assert.equal(status === 0, plan === 'success' && approved === (publish === 'true' ? 'success' : 'skipped'), `${publish}/${plan}/${approved}`);
    }
  }
});
test('a consumer failure stops every later crate, including an independent member', () => {
  const caller = parse(render('a'.repeat(40), members(), '1.88.0'));
  const names = Object.keys(caller.jobs).filter(name => name !== 'plan');
  for (let i = 1; i < names.length; i++) {
    const job = caller.jobs[names[i]!];
    assert.ok(job.needs.includes(names[i - 1]!));
    assert.equal(job['continue-on-error'], undefined);
    assert.equal(job.if, undefined);
  }
});
test('dependent jobs wait for complete crate workflows and receive all ancestor artifacts', () => {
  const caller = parse(render('a'.repeat(40), members(), '1.88.0'));
  assert.deepEqual(caller.jobs.crate_2.needs, ['plan', 'crate_0', 'crate_1']);
  assert.deepEqual(caller.jobs.crate_3.needs, ['plan', 'crate_0', 'crate_1', 'crate_2']);
  assert.match(caller.jobs.crate_3.with['dependency-artifact-ids'], /crate_0.*crate_1.*crate_2/);
  const reusable = parse(readFileSync(join(ROOT, '.github/workflows/release.yml'), 'utf8'));
  assert.ok(reusable.jobs.finalize.needs.includes('verify'));
  assert.ok(reusable.jobs.finalize.steps.some((s: any) => s.name === 'Require a successful delivery outcome'));
});
test('installer rejects dependency cycles and missing graph members', () => {
  assert.throws(() => render('a'.repeat(40), [{ name: 'a', needs: ['b'] }, { name: 'b', needs: ['a'] }], '1.88.0'), /cycle/);
  assert.throws(() => render('a'.repeat(40), [{ name: 'a', needs: ['missing'] }], '1.88.0'), /unknown/);
});

test('a release plan binds candidate versions, source commit, pipeline and toolchain', async t => {
  const path = temp(t), { candidate } = await makeCapsule(join(path, 'capsule'));
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: candidate.source, pipeline_ref: candidate.pipeline.revision,
    toolchain: candidate.toolchain.requested, manifest: 'Cargo.toml', publishing: true, packages: [{ ...candidate.package, needs: [] }] };
  const file = join(path, 'plan.json'); writeJson(file, plan);
  const sha = digest(readFileSync(file));
  bindCandidate(readPlan(file, sha), candidate);
  assert.throws(() => readPlan(file, '0'.repeat(64)), /digest/);
  assert.throws(() => readPlan(file, sha, { commit: 'c'.repeat(40) }), /context/);
  for (const changed of [
    { ...candidate, package: { ...candidate.package, version: '9.0.0' } },
    { ...candidate, source: { ...candidate.source, ref: 'refs/tags/different' } },
    { ...candidate, pipeline: { ...candidate.pipeline, revision: 'c'.repeat(40) } },
    { ...candidate, toolchain: { ...candidate.toolchain, requested: '1.90.0' } },
  ]) assert.throws(() => bindCandidate(plan, changed), /approved release plan/);
});
test('planned candidates cannot publish by omitting the plan or switching to rehearsal', async t => {
  environment(t, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/tags/v1.2.3' });
  const path = temp(t), { candidate } = await makeCapsule(path);
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: candidate.source, pipeline_ref: candidate.pipeline.revision,
    toolchain: candidate.toolchain.requested, manifest: 'Cargo.toml', publishing: false, packages: [{ ...candidate.package, needs: [] }] };
  const file = join(path, 'plan.json'); writeJson(file, plan);
  const sha = digest(readFileSync(file)); candidate.release_plan_sha256 = sha; writeJson(join(path, 'candidate.json'), candidate);
  const args = ['upload', '--capsule', path, '--candidate-sha', digest(readFileSync(join(path, 'candidate.json'))), '--out', join(path, 'report'), '--confirm-publish'];
  const services = { registry: () => assert.fail('registry must not be called'), deployments: () => assert.fail() };
  await assert.rejects(execute(args, services), /approved release plan is required/);
  await assert.rejects(execute([...args, '--plan', file, '--plan-sha', sha], services), /does not authorize/);
});
test('an approved workspace can publish differently versioned crates under one train tag', async t => {
  environment(t, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/tags/vtrain-2026' });
  const path = temp(t), { candidate } = await makeCapsule(path);
  candidate.source.ref = 'refs/tags/vtrain-2026';
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: candidate.source, pipeline_ref: candidate.pipeline.revision,
    toolchain: candidate.toolchain.requested, manifest: 'Cargo.toml', publishing: true,
    packages: [{ name: 'base', version: '0.4.0', needs: [] }, { ...candidate.package, needs: ['base'] }] };
  const file = join(path, 'plan.json'); writeJson(file, plan);
  const sha = digest(readFileSync(file)); candidate.release_plan_sha256 = sha; writeJson(join(path, 'candidate.json'), candidate);
  let uploads = 0;
  await execute(['upload', '--capsule', path, '--candidate-sha', digest(readFileSync(join(path, 'candidate.json'))), '--out', join(path, 'report'),
    '--confirm-publish', '--plan', file, '--plan-sha', sha], { deployments: () => assert.fail(), registry: () => ({
      observe: async () => assert.fail(), publish: async () => { uploads++; return { state: 'registry-verified', sha256: candidate.files['package.crate'].sha256,
        bytes: candidate.files['package.crate'].size, version_url: 'https://crates.io/crates/example-lib/1.2.3', observed_at: 'now' }; },
    }) });
  assert.equal(uploads, 1);
});
