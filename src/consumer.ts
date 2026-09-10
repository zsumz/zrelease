import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest, record, requireThat, utcNow, writeJson } from './common.ts';
import { cargoEnvironment, run, temporary } from './process.ts';
import { Registry } from './registry.ts';
import type { Candidate } from './types.ts';

export function checkResolution(value: unknown, name: string, version: string): void {
  const metadata = record(value), resolution = record(metadata.resolve);
  requireThat(Array.isArray(resolution.nodes) && Array.isArray(metadata.packages), 'invalid Cargo resolution');
  const node = resolution.nodes.map(n => record(n)).find(n => n.id === resolution.root);
  requireThat(node && Array.isArray(node.deps), 'consumer resolution has no root');
  const matches = node.deps.map(d => record(d)).filter(d => d.name === 'subject');
  requireThat(matches.length === 1, 'consumer did not resolve the subject dependency exactly once');
  const selected = metadata.packages.map(p => record(p)).find(p => p.id === matches[0]!.pkg);
  requireThat(selected?.name === name && selected.version === version, 'consumer resolved a different package/version');
  requireThat(selected.source === 'registry+https://github.com/rust-lang/crates.io-index', 'consumer used a path, Git, or alternate-registry dependency');
}
export async function runConsumer(candidate: Candidate, capsule: string, configure?: (home: string) => void): Promise<Buffer> {
  const { name, version } = candidate.package;
  return temporary('zrelease-consumer-', async work => {
    const project = join(work, 'consumer');
    mkdirSync(join(project, 'src'), { recursive: true });
    const config = candidate.consumer;
    const manifest = '[package]\nname = "zrelease-consumer"\nversion = "0.0.0"\nedition = "2021"\npublish = false\n\n' +
      `[dependencies]\nsubject = { package = ${JSON.stringify(name)}, version = ${JSON.stringify('=' + version)}, ` +
      `default-features = ${config.default_features}, features = ${JSON.stringify(config.features)} }\n`;
    writeFileSync(join(project, 'Cargo.toml'), manifest);
    writeFileSync(join(project, 'src', 'main.rs'), readFileSync(join(capsule, 'smoke.rs')));
    const env = cargoEnvironment(join(work, 'cargo-home'), join(work, 'target'));
    configure?.(env.CARGO_HOME!);
    const cargo = ['cargo', '+' + candidate.toolchain.requested];
    await run([...cargo, 'generate-lockfile'], { cwd: project, env });
    const metadata = JSON.parse(await run([...cargo, 'metadata', '--locked', '--format-version', '1'], { cwd: project, env }));
    checkResolution(metadata, name, version);
    for (const command of ['build', 'test', 'run']) await run([...cargo, command, '--locked'], { cwd: project, env });
    return readFileSync(join(project, 'Cargo.lock'));
  });
}
export async function verifyConsumer(candidate: Candidate, capsule: string, reportDir: string, candidateSha: string): Promise<Record<string, unknown>> {
  const { name, version } = candidate.package;
  const observed = await new Registry().observe(name, version, candidate.files['package.crate'].sha256);
  const lockfile = await runConsumer(candidate, capsule);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'consumer.Cargo.lock'), lockfile);
  const result = { schema: 'zrelease.consumer/v1', state: 'consumer-verified', candidate_sha256: candidateSha, package: candidate.package,
    source: candidate.source, registry: observed, verified_at: utcNow(), cargo_lock_sha256: digest(lockfile),
    checks: ['exact registry resolution', 'build --locked', 'test --locked', 'run --locked'] };
  writeJson(join(reportDir, 'consumer.json'), result);
  return result;
}
