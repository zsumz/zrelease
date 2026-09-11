import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { execute } from '../src/cli.ts';
import type { Services } from '../src/cli.ts';
import { canonical, digest, record, writeJson } from '../src/common.ts';
import { Deployments } from '../src/deployment.ts';
import { finish } from '../src/finish.ts';
import { registryServer, rehearse } from '../src/mock.ts';
import type { Candidate } from '../src/types.ts';
import { environment, makeCapsule, temp } from './support.ts';

function reports(candidate: Candidate): Record<string, Record<string, unknown>> {
  const candidateSha = digest(canonical(candidate));
  const registry = { state: 'registry-verified', candidate_sha256: candidateSha, sha256: candidate.files['package.crate'].sha256,
    bytes: candidate.files['package.crate'].size, version_url: `https://crates.io/crates/${candidate.package.name}/${candidate.package.version}` };
  return { 'registry.json': registry, 'consumer.json': { schema: 'zrelease.consumer/v1', state: 'consumer-verified',
    candidate_sha256: candidateSha,
    package: candidate.package, source: candidate.source, registry: structuredClone(registry), cargo_lock_sha256: digest(Buffer.from('fixture lock')),
    checks: ['exact registry resolution', 'build --locked', 'test --locked', 'run --locked'] } };
}
async function complete(t: TestContext, candidate: Candidate, path: string, production = true) {
  environment(t);
  const statuses: string[] = [];
  await finish(candidate, { candidateSha: digest(canonical(candidate)), production, deploymentId: 42,
    runUrl: 'https://github.com/zsumz/zrelease/actions/runs/1',
    resultsJson: JSON.stringify(production ? { publish: 'success', verify: 'success' } : { rehearse: 'success' }),
    reports: path, out: join(path, 'release.json') }, () => ({ status: async (_id, state) => { statuses.push(state); return {}; } }));
  return { receipt: JSON.parse(readFileSync(join(path, 'release.json'), 'utf8')), statuses };
}

test('matching successful reports complete production delivery', async t => {
  const path = temp(t), { candidate } = await makeCapsule(path);
  for (const [name, report] of Object.entries(reports(candidate))) writeJson(join(path, name), report);
  const result = await complete(t, candidate, path);
  assert.equal(result.receipt.phase, 'consumer-verified'); assert.deepEqual(result.statuses, ['success']);
});
const mutations: [string, (reports: Record<string, Record<string, unknown>>) => void][] = [
  ['empty reports', r => { r['registry.json'] = {}; r['consumer.json'] = {}; }],
  ['registry checksum', r => { r['registry.json']!.sha256 = '0'.repeat(64); }],
  ['registry candidate', r => { r['registry.json']!.candidate_sha256 = '0'.repeat(64); }],
  ['registry byte count', r => { r['registry.json']!.bytes = 0; }],
  ['registry version', r => { r['registry.json']!.version_url = 'https://crates.io/crates/example-lib/2.0.0'; }],
  ['registry state', r => { r['registry.json']!.state = 'unconfirmed'; }],
  ['consumer state', r => { r['consumer.json']!.state = 'failed'; }],
  ['consumer candidate', r => { r['consumer.json']!.candidate_sha256 = '0'.repeat(64); }],
  ['consumer package', r => { r['consumer.json']!.package = { name: 'other', version: '1.2.3' }; }],
  ['consumer source', r => { r['consumer.json']!.source = { repository: 'other/repo', commit: 'c'.repeat(40), ref: 'refs/tags/v1.2.3' }; }],
  ['consumer registry', r => { record(r['consumer.json']!.registry).sha256 = '0'.repeat(64); }],
  ['consumer lock digest', r => { r['consumer.json']!.cargo_lock_sha256 = ''; }],
  ['consumer checks', r => { r['consumer.json']!.checks = ['build --locked']; }],
];
for (const [name, mutate] of mutations) test(`delivery fails closed for invalid ${name}`, async t => {
  const path = temp(t), { candidate } = await makeCapsule(path), observations = reports(candidate);
  mutate(observations);
  for (const [name, report] of Object.entries(observations)) writeJson(join(path, name), report);
  const result = await complete(t, candidate, path);
  assert.equal(result.receipt.phase, 'invalid-verification-evidence'); assert.deepEqual(result.statuses, ['failure']);
});
test('malformed report still produces a failed receipt', async t => {
  const path = temp(t), { candidate } = await makeCapsule(path);
  for (const [name, report] of Object.entries(reports(candidate))) writeJson(join(path, name), report);
  writeFileSync(join(path, 'consumer.json'), 'not json');
  const result = await complete(t, candidate, path);
  assert.equal(result.receipt.phase, 'invalid-verification-evidence'); assert.deepEqual(result.statuses, ['failure']);
});
test('real rehearsal report completes non-production delivery', async t => {
  const path = temp(t), { candidate, crate, metadata } = await makeCapsule(path);
  writeJson(join(path, 'rehearsal.json'), await rehearse(candidate, crate, metadata));
  const result = await complete(t, candidate, path, false);
  assert.equal(result.receipt.phase, 'rehearsed'); assert.equal(result.receipt.production, false); assert.deepEqual(result.statuses, ['success']);
});
test('rehearsal evidence from another archive cannot complete delivery', async t => {
  const path = temp(t), { candidate, crate, metadata } = await makeCapsule(path);
  const report = await rehearse(candidate, crate, metadata); report.crate_sha256 = '0'.repeat(64);
  writeJson(join(path, 'rehearsal.json'), report);
  const result = await complete(t, candidate, path, false);
  assert.equal(result.receipt.phase, 'invalid-verification-evidence'); assert.deepEqual(result.statuses, ['failure']);
});
test('CLI release resumes an accepted upload and finalizes only with matching consumer evidence', async t => {
  const path = temp(t), { candidate, sha, crate, metadata } = await makeCapsule(path);
  environment(t, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: candidate.source.ref,
    CARGO_REGISTRY_TOKEN: 'rehearsal-only', GITHUB_TOKEN: 'fixture-only', GITHUB_OUTPUT: join(path, 'outputs') });
  const { registry, state, close } = await registryServer(); t.after(close); state.failAfterAccept = true;
  // Trusted publishing starts with an existing crate, but a new target version.
  state.versions.set(`${candidate.package.name}@0.1.0`, { metadata: { ...JSON.parse(metadata.toString()), vers: '0.1.0' }, crate });
  const deploymentWrites: Record<string, unknown>[] = [];
  const dependencies: Services = { registry: () => registry, deployments: (repository, token) => new Deployments(repository, token, {
    request: async (_method, _url, options) => { deploymentWrites.push(JSON.parse(options!.body!.toString())); return Buffer.from('{"id":42}'); },
  }) };
  const base = ['--capsule', path, '--candidate-sha', sha];
  const runUrl = 'https://github.com/zsumz/zrelease/actions/runs/1';
  await execute(['begin', ...base, '--production', '--run-url', runUrl], dependencies);
  assert.equal(deploymentWrites.at(-1)!.state, 'in_progress');
  for (let attempt = 0; attempt < 2; attempt++) await execute(['upload', ...base, '--confirm-publish', '--out', join(path, 'registry.json')], dependencies);
  assert.equal(state.puts, 1);
  assert.equal(JSON.parse(readFileSync(join(path, 'registry.json'), 'utf8')).upload, 'already-present-identical');
  writeJson(join(path, 'consumer.json'), reports(candidate)['consumer.json']);
  await execute(['finish', ...base, '--production', '--deployment-id', '42', '--run-url', runUrl,
    '--results-json', '{"publish":{"result":"success"},"verify":{"result":"success"}}', '--reports', path, '--out', join(path, 'release.json')], dependencies);
  assert.equal(deploymentWrites.at(-1)!.state, 'success');
  assert.equal(JSON.parse(readFileSync(join(path, 'release.json'), 'utf8')).phase, 'consumer-verified');
});
