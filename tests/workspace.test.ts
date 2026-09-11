import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { canonical, digest, writeJson } from '../src/common.ts';
import { loadWorkspace } from '../src/workspace.ts';
import { rehearseWorkspace } from '../src/workspace-rehearsal.ts';
import { main } from '../src/workspace-cli.ts';
import { renderRehearsal } from '../scripts/install.ts';
import { environment, makeCapsule, ROOT, temp } from './support.ts';

async function fixture(root: string) {
  const directory = join(root, 'candidates/example-lib');
  const capsule = await makeCapsule(directory);
  const plan = { schema: 'zrelease.plan/v1', source: capsule.candidate.source, pipeline_ref: capsule.candidate.pipeline.revision,
    toolchain: '1.88.0', manifest: 'Cargo.toml', publishing: false,
    packages: [{ name: 'example-lib', version: '1.2.3', needs: [] }] };
  const planSha = digest(canonical(plan));
  capsule.candidate.release_plan_sha256 = planSha;
  writeJson(join(directory, 'candidate.json'), capsule.candidate);
  writeJson(join(root, 'release-plan.json'), plan);
  const index = { schema: 'zrelease.workspace/v1', plan_sha256: planSha,
    packages: [{ name: 'example-lib', sha256: digest(canonical(capsule.candidate)) }] };
  writeJson(join(root, 'workspace.json'), index);
  return { index, plan, sha: digest(canonical(index)) };
}
test('workspace seal binds plan, source, package payloads and order', async t => {
  const root = temp(t), f = await fixture(root);
  const bundle = await loadWorkspace(root, f.sha, { commit: 'a'.repeat(40) });
  assert.equal(bundle.capsules.length, 1);
  await assert.rejects(loadWorkspace(root, f.sha, { commit: 'c'.repeat(40) }), /context mismatch/);
  writeFileSync(join(root, 'candidates/example-lib/smoke.rs'), 'changed');
  await assert.rejects(loadWorkspace(root, f.sha), /digest mismatch/);
});
for (const mutation of ['publishing', 'order', 'duplicate', 'plan-digest']) test(`workspace rejects ${mutation} drift`, async t => {
  const root = temp(t), f = await fixture(root);
  if (mutation === 'publishing') {
    f.plan.publishing = true;
    writeJson(join(root, 'release-plan.json'), f.plan);
    f.index.plan_sha256 = digest(canonical(f.plan));
  } else if (mutation === 'order') f.index.packages[0]!.name = '../elsewhere';
  else if (mutation === 'duplicate') f.index.packages.push(f.index.packages[0]!);
  else f.index.plan_sha256 = 'f'.repeat(64);
  writeJson(join(root, 'workspace.json'), f.index);
  await assert.rejects(loadWorkspace(root, digest(canonical(f.index))));
});
test('workspace rehearsal runs the real loopback protocol and records no publication', async t => {
  environment(t);
  const root = temp(t), f = await fixture(root);
  await rehearseWorkspace(await loadWorkspace(root, f.sha), join(root, 'reports'), false);
  const report = JSON.parse(readFileSync(join(root, 'reports/example-lib/rehearsal.json'), 'utf8'));
  assert.equal(report.published, false); assert.equal(report.upload_count, 1);
  assert.equal(report.retry, 'already-present-identical');
  const receipt = JSON.parse(readFileSync(join(root, 'reports/workspace-rehearsal.json'), 'utf8'));
  assert.equal(receipt.state, 'rehearsed'); assert.deepEqual(receipt.completed, ['example-lib']);
});
test('a failed rehearsal prevents all later crates and records the partial result', async t => {
  environment(t);
  const root = temp(t), f = await fixture(root);
  const bundle = await loadWorkspace(root, f.sha);
  bundle.capsules.push(structuredClone(bundle.capsules[0]!));
  bundle.capsules[1]!.candidate.package.name = 'later-lib';
  bundle.index.packages.push({ name: 'later-lib', sha256: 'f'.repeat(64) });
  const calls: string[] = [];
  await assert.rejects(rehearseWorkspace(bundle, join(root, 'reports'), false, async candidate => {
    calls.push(candidate.package.name); throw new Error('protocol failed');
  }), /protocol failed/);
  assert.deepEqual(calls, ['example-lib']);
  const receipt = JSON.parse(readFileSync(join(root, 'reports/workspace-rehearsal.json'), 'utf8'));
  assert.equal(receipt.state, 'failed'); assert.deepEqual(receipt.completed, []);
});
test('compact caller uses one workspace workflow with no publish input', () => {
  const caller = parse(renderRehearsal('b'.repeat(40), [{ name: 'one', needs: [] }, { name: 'two', needs: ['one'] }], '1.96.1'));
  assert.deepEqual(Object.keys(caller.jobs), ['rehearsal']);
  assert.match(caller.jobs.rehearsal.uses, /rehearse.yml@b{40}$/);
  assert.equal(caller.jobs.rehearsal.with.publish, undefined);
});
test('compact graph has three stages and credentials never accompany package execution', () => {
  const workflow = parse(readFileSync(join(ROOT, '.github/workflows/rehearse.yml'), 'utf8'));
  assert.deepEqual(Object.keys(workflow.jobs), ['package', 'attest', 'rehearse']);
  assert.deepEqual(workflow.jobs.package.permissions, { contents: 'read' });
  assert.equal(workflow.on.workflow_call.inputs.publish, undefined);
  for (const name of ['attest', 'rehearse']) for (const step of workflow.jobs[name].steps) {
    assert.doesNotMatch(step.run ?? '', /\b(?:cargo|rustup|npm|rustc)\b/);
    if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with.repository, 'zsumz/zrelease');
    assert.ok(!step.uses?.startsWith('rust-lang/crates-io-auth-action@'));
  }
  assert.deepEqual(workflow.jobs.attest.needs, ['package']);
  assert.deepEqual(workflow.jobs.rehearse.needs, ['package', 'attest']);
  const verify = workflow.jobs.rehearse.steps.findIndex((s: any) => s.run?.includes('gh attestation verify'));
  const execute = workflow.jobs.rehearse.steps.findIndex((s: any) => s.run?.includes('workspace.mjs rehearse'));
  assert.ok(verify >= 0 && verify < execute);
});
test('workspace CLI has no publishing command', async t => {
  t.mock.method(console, 'error', () => {});
  for (const command of ['publish', 'upload', 'prepare --publishing']) assert.equal(await main(command.split(' ')), 2);
});
