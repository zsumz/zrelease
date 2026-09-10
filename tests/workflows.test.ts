import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { parse } from 'yaml';
import { ROOT } from './support.ts';

interface Step { uses?: string; run?: string; name?: string; env?: Record<string, string>; with?: Record<string, unknown> }
interface Job { steps: Step[]; needs?: string[]; permissions?: Record<string, string>; if?: string; environment?: Record<string, unknown>; outputs?: Record<string, string> }
interface Workflow { jobs: Record<string, Job>; on: { workflow_call: { inputs: Record<string, { default?: unknown }> } }; concurrency: Record<string, unknown> }
const raw = readFileSync(join(ROOT, '.github/workflows/release.yml'), 'utf8');
const workflow = parse(raw) as Workflow;
const jobs = workflow.jobs;
test('all external actions are pinned to the lock file', () => {
  const { pins } = JSON.parse(readFileSync(join(ROOT, 'actions.lock.json'), 'utf8')) as { pins: Record<string, string> };
  for (const file of readdirSync(join(ROOT, '.github/workflows'))) {
    const { jobs } = parse(readFileSync(join(ROOT, '.github/workflows', file), 'utf8')) as Workflow;
    for (const job of Object.values(jobs)) for (const step of job.steps) if (step.uses) {
      const [repo, sha] = step.uses.split('@'); assert.match(sha!, /^[0-9a-f]{40}$/); assert.equal(pins[repo!], sha);
    }
  }
});
for (const name of ['qualify', 'verify', 'rehearse']) test(`${name} has no publish identity`, () => assert.deepEqual(jobs[name]!.permissions, { contents: 'read' }));
for (const name of ['attest', 'track', 'publish', 'finalize']) test(`${name} runs only bundled helpers without package installation or caller source`, () => {
  for (const step of jobs[name]!.steps) {
    assert.doesNotMatch(step.run ?? '', /\b(?:npm|npx|pnpm|yarn|cargo|rustup|rustc|tsc|pip|python3)\b/);
    if (step.uses?.startsWith('actions/checkout@')) {
      assert.equal(step.with!.repository, 'zsumz/zrelease'); assert.equal(step.with!['persist-credentials'], false);
    }
  }
});
test('every release job selects a pinned Node runtime with automatic caching disabled', () => {
  for (const job of Object.values(jobs)) {
    const setup = job.steps.find(s => s.uses?.startsWith('actions/setup-node@'));
    assert.ok(setup); assert.equal(setup.with!['node-version'], '24.19.0'); assert.equal(setup.with!['package-manager-cache'], false);
  }
});
test('rehearsal remains the default', () => assert.equal(workflow.on.workflow_call.inputs.publish!.default, false));
test('logical deployment success waits for consumer verification', () => { assert.equal(jobs.publish!.environment!.deployment, false); assert.ok(jobs.finalize!.needs!.includes('verify')); });
test('finalization uses always', () => assert.ok(jobs.finalize!.if!.includes('always()')));
test('concurrency never cancels active release', () => assert.equal(workflow.concurrency['cancel-in-progress'], false));
test('shell commands contain no interpolated expressions', () => {
  for (const job of Object.values(jobs)) for (const step of job.steps) assert.ok(!(step.run ?? '').includes('${{'));
});
test('every workflow shell step passes bash -n', () => {
  for (const file of readdirSync(join(ROOT, '.github/workflows'))) {
    const workflow = parse(readFileSync(join(ROOT, '.github/workflows', file), 'utf8')) as Workflow;
    for (const job of Object.values(workflow.jobs)) for (const step of job.steps) if (step.run) {
      const result = spawnSync('bash', ['-n'], { input: step.run, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr);
    }
  }
});
test('job graph is acyclic', () => {
  const visited = new Set<string>(), active = new Set<string>();
  function walk(name: string): void {
    assert.ok(!active.has(name)); if (visited.has(name)) return; active.add(name);
    for (const dependency of jobs[name]!.needs ?? []) walk(dependency);
    active.delete(name); visited.add(name);
  }
  for (const name of Object.keys(jobs)) walk(name);
});
test('workflow inputs and needs references are declared', () => {
  for (const [, name] of raw.matchAll(/inputs\.([\w-]+)/g)) assert.ok(Object.hasOwn(workflow.on.workflow_call.inputs, name!));
  for (const job of Object.values(jobs)) for (const [, dependency] of JSON.stringify(job).matchAll(/needs\.([\w-]+)\./g)) assert.ok(job.needs?.includes(dependency!));
});
test('provenance verification happens before registry credential exchange', () => {
  const steps = jobs.publish!.steps;
  const verify = steps.findIndex(s => s.run?.includes('gh attestation verify'));
  const auth = steps.findIndex(s => s.uses?.startsWith('rust-lang/crates-io-auth-action@'));
  assert.ok(verify >= 0 && verify < auth);
  for (const flag of ['--signer-workflow', '--signer-digest', '--source-digest', '--source-ref', '--deny-self-hosted-runners']) assert.ok(steps[verify]!.run!.includes(flag));
});
test('qualification and publishing download the exact plan before using it', () => {
  for (const name of ['qualify', 'publish']) {
    const steps = jobs[name]!.steps;
    const downloads = steps.filter(s => s.with?.['artifact-ids'] === '${{ inputs.plan-artifact-id }}');
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0]!.with!.path, '${{ runner.temp }}/plan');
    assert.ok(steps.indexOf(downloads[0]!) < steps.findIndex(s => s.run?.includes('--plan ')));
  }
});
test('publishing verifies both the approval signature and candidate provenance before requesting a token', () => {
  const steps = jobs.publish!.steps;
  const auth = steps.findIndex(s => s.uses?.startsWith('rust-lang/crates-io-auth-action@'));
  const approval = steps.findIndex(s => s.run?.includes('--signer-workflow zsumz/zrelease/.github/workflows/plan.yml'));
  const candidate = steps.findIndex(s => s.run?.includes('--signer-workflow zsumz/zrelease/.github/workflows/release.yml'));
  assert.ok(approval >= 0 && candidate >= 0 && approval < auth && candidate < auth);
  assert.ok(steps.slice(0, approval).some(s => s.with?.['artifact-ids'] === '${{ inputs.approval-artifact-id }}'));
  assert.ok(steps.slice(0, approval).some(s => s.run?.includes('APPROVAL_ID')));
  const plan = parse(readFileSync(join(ROOT, '.github/workflows/plan.yml'), 'utf8')) as Workflow;
  assert.equal(plan.jobs.plan!.permissions?.['id-token'], undefined);
  assert.equal(plan.jobs.approve!.environment!.name, 'release');
  assert.equal(plan.jobs.approve!.permissions!['id-token'], 'write');
  for (const step of plan.jobs.approve!.steps) assert.doesNotMatch(step.run ?? '', /\b(?:node|cargo|npm|rustup|rustc)\b/);
});
test('CI verifies committed bundles before tests', () => {
  const ci = parse(readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8')) as Workflow;
  assert.ok(ci.jobs.unit!.steps.some(s => s.run === 'npm ci --ignore-scripts'));
  assert.ok(ci.jobs.unit!.steps.some(s => s.run === 'npm run verify'));
});
