/** Real Cargo release train, using only a local registry and a clean fixture checkout. */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { load } from '../src/capsule.ts';
import { digest, requireThat, writeJson } from '../src/common.ts';
import { runConsumer } from '../src/consumer.ts';
import { registryServer } from '../src/mock.ts';
import { graph } from '../src/plan.ts';
import { run } from '../src/process.ts';
import { render } from './install.ts';
import { fixtureSource } from './fixture-source.ts';

const root = resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { source: { type: 'string', default: root }, out: { type: 'string' } } });
const local = join(root, '.local'); mkdirSync(join(local, 'tmp'), { recursive: true }); process.env.TMPDIR = join(local, 'tmp');
const out = values.out ? resolve(values.out) : mkdtempSync(join(local, 'workspace-fixture-'));
const manifest = 'fixtures/workspace/Cargo.toml';
await fixtureSource(resolve(values.source!), local, async (source, commit) => {
  const cli = [process.execPath, join(root, 'dist/zrelease.mjs')];
  const env = { ...process.env };
  for (const key of ['GITHUB_REPOSITORY', 'GITHUB_SHA', 'PIPELINE_REF', 'GITHUB_OUTPUT', 'CARGO_REGISTRY_TOKEN', 'GITHUB_TOKEN']) delete env[key];
  const packages = graph(JSON.parse(await run(['cargo', '+1.88.0', 'metadata', '--no-deps', '--locked', '--format-version', '1', '--manifest-path', join(source, manifest)], { cwd: local, env })));
  requireThat(packages.length === 4 && !packages.some(p => p.name.endsWith('private')), 'workspace selection includes the wrong crates');
  const plan = join(out, 'release-plan.json');
  const members = packages.map(({ name, needs }) => ({ name, needs }));
  const context = ['--source', source, '--manifest', manifest, '--toolchain', '1.88.0', '--repository', 'zsumz/zrelease', '--commit', commit,
    '--ref', 'refs/heads/main', '--pipeline-ref', commit, '--base-branch', ''];
  await run([...cli, 'plan', ...context, '--members-json', JSON.stringify(members), '--workspace', '--out', plan], { cwd: local, env });
  const planSha = digest(readFileSync(plan));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'release.yml'), render(commit, members, '1.88.0', manifest, true));
  const registry = await registryServer();
  const completed: string[] = [];
  try {
    for (const pkg of packages) {
      const ancestors = new Set<string>();
      function walk(name: string): void { for (const dep of packages.find(p => p.name === name)!.needs) { ancestors.add(dep); walk(dep); } }
      walk(pkg.name);
      const dependencyDir = join(out, 'dependencies', pkg.name), hashes: string[] = [];
      for (const name of ancestors) {
        requireThat(completed.includes(name), 'dependent started before its consumer passed');
        const prior = join(out, 'candidates', name);
        cpSync(prior, join(dependencyDir, name), { recursive: true }); hashes.push(digest(readFileSync(join(prior, 'candidate.json'))));
      }
      const capsule = join(out, 'candidates', pkg.name);
      const flags = hashes.length ? ['--dependencies', dependencyDir, '--dependency-shas', JSON.stringify(hashes)] : [];
      if (pkg.name.endsWith('facade') || pkg.name.endsWith('alias')) flags.push('--smoke', 'fixtures/workspace/smoke.rs');
      await run([...cli, 'prepare', ...context, '--package', pkg.name, '--out', capsule, '--plan', plan, '--plan-sha', planSha, ...flags], { cwd: local, env });
      const sha = digest(readFileSync(join(capsule, 'candidate.json')));
      await run([...cli, 'check', '--capsule', capsule, '--candidate-sha', sha, '--plan', plan, '--plan-sha', planSha], { cwd: local, env });
      const item = await load(capsule, sha);
      registry.state.failAfterAccept = true;
      const first = await registry.registry.publish(item.candidate, item.crate, item.metadata, 'rehearsal-only');
      requireThat(first.upload === 'ambiguous-response-reconciled', 'ambiguous upload was not reconciled');
      const second = await registry.registry.publish(item.candidate, item.crate, item.metadata, 'rehearsal-only');
      requireThat(second.upload === 'already-present-identical', 'retry attempted another upload');
      await runConsumer(item.candidate, capsule, registry.configure);
      completed.push(pkg.name);
      writeJson(join(out, 'result.json'), { state: 'running', completed, uploads: registry.state.puts, published: false });
    }
    requireThat(registry.state.puts === packages.length, 'duplicate workspace upload');
    writeJson(join(out, 'result.json'), { state: 'passed', completed, uploads: registry.state.puts, published: false });
  } finally { await registry.close(); }
  console.log(`Workspace packaged, rehearsed, retried, and consumed in dependency order. Evidence: ${out}`);
});
