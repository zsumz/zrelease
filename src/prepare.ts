import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { archiveFiles, extractFiles } from './archive.ts';
import { SCHEMA } from './capsule.ts';
import { canonical, digest, inside, NAME, output, record, REPO, requireThat, SHA, TOOLCHAIN, utcNow, utf8, valid, version, within, writeJson } from './common.ts';
import { normalizedMetadata } from './metadata.ts';
import { cargoEnvironment, run, temporary } from './process.ts';
import type { Candidate } from './types.ts';
import type { Capsule } from './capsule.ts';
import { bindCandidate } from './plan.ts';
import type { ReleasePlan } from './plan.ts';
import { stagingRegistry } from './staging.ts';
import { runConsumer } from './consumer.ts';

export interface PrepareOptions {
  source: string; manifest?: string; package: string; toolchain: string; repository: string;
  commit: string; ref: string; pipelineRef: string; outputDir: string; publishing?: boolean;
  tagPrefix?: string; baseBranch?: string; smoke?: string; features?: string[]; defaultFeatures?: boolean;
  plan?: ReleasePlan; dependencies?: Capsule[];
}
export async function prepare(options: PrepareOptions): Promise<Candidate> {
  const source = realpathSync(options.source), outputDir = resolve(options.outputDir);
  const { package: name, toolchain, repository, commit, ref, pipelineRef } = options;
  const { manifest = 'Cargo.toml', publishing = false, tagPrefix = 'v', baseBranch = 'main', smoke = '', features = [], defaultFeatures = true } = options;
  valid(NAME, name, 'package'); valid(TOOLCHAIN, toolchain, 'pinned Rust toolchain');
  valid(REPO, repository, 'repository'); valid(SHA, commit, 'commit'); valid(SHA, pipelineRef, 'pipeline revision');
  requireThat(!existsSync(outputDir), 'capsule output directory already exists');
  requireThat(!inside(source, outputDir), 'capsule output must be outside the source checkout');
  const path = within(source, manifest);
  requireThat(basename(path) === 'Cargo.toml', 'manifest path must end in Cargo.toml');
  requireThat(await run(['git', 'rev-parse', 'HEAD'], { cwd: source }) === commit, 'checkout does not match the triggering commit');
  requireThat(!await run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd: source }), 'source checkout is dirty');
  if (baseBranch) {
    await run(['git', 'check-ref-format', `refs/heads/${baseBranch}`], { cwd: source });
    await run(['git', 'merge-base', '--is-ancestor', commit, `refs/remotes/origin/${baseBranch}`], { cwd: source });
  }
  requireThat(Array.isArray(features) && features.every(f => typeof f === 'string' && f && !/[\n\r, ]/.test(f)), 'features must be an array of nonempty individual feature names');
  const staging = await stagingRegistry(publishing ? [] : options.dependencies);
  try {
    const candidate = await temporary('zrelease-prepare-', async work => {
      const env = cargoEnvironment(join(work, 'cargo-home'), join(work, 'target'));
      if (!publishing && options.dependencies?.length) staging.configure(env.CARGO_HOME!);
      const cargo = ['cargo', `+${toolchain}`];
      const rustc = await run(['rustc', `+${toolchain}`, '--version', '--verbose'], { cwd: work, env });
      const cargoVersion = await run([...cargo, '--version'], { cwd: work, env });
      const raw = await run([...cargo, 'metadata', '--no-deps', '--locked', '--format-version', '1', '--manifest-path', path], { cwd: source, env });
      const metadata = record(JSON.parse(raw));
      requireThat(Array.isArray(metadata.workspace_members) && Array.isArray(metadata.packages), 'invalid Cargo workspace metadata');
      const members = new Set(metadata.workspace_members);
      const selected = metadata.packages.map(p => record(p)).filter(p => p.name === name && members.has(p.id));
      requireThat(selected.length === 1, 'package must select exactly one workspace member');
      const pkg = selected[0]!;
      const vers = version(pkg.version);
      requireThat(Array.isArray(pkg.targets) && pkg.targets.some(t => {
        const target = record(t); return Array.isArray(target.kind) && target.kind.some(k => ['lib', 'rlib', 'proc-macro'].includes(k));
      }), 'this pipeline supports library crates, not binary-only packages');
      requireThat(pkg.publish === null || (Array.isArray(pkg.publish) && pkg.publish.length === 1 && pkg.publish[0] === 'crates-io'), 'selected package forbids publication to crates.io');
      if (publishing && !options.plan) {
        requireThat(ref === `refs/tags/${tagPrefix}${vers}`, 'live publication requires a tag that exactly matches the package version');
        requireThat(await run(['git', 'rev-parse', `${ref}^{commit}`], { cwd: source }) === commit, 'release tag does not resolve to the triggering commit');
      }
      const flags = defaultFeatures ? [] : ['--no-default-features'];
      if (features.length) flags.push('--features', features.join(','));
      const checks: Candidate['qualification']['checks'] = [];
      for (const command of ['test', 'package']) {
        const argv = [...cargo, command, '--locked', '--manifest-path', path, '--package', name, ...flags];
        await run(argv, { cwd: source, env }); checks.push({ argv, exit_code: 0 });
      }
      const crate = readFileSync(join(work, 'target', 'package', `${name}-${vers}.crate`));
      const files = await archiveFiles(crate, name, vers);
      const publishMetadata = normalizedMetadata(files, name, vers);
      const vcsBytes = files.get('.cargo_vcs_info.json');
      if (vcsBytes) {
        const git = record(record(JSON.parse(utf8(vcsBytes))).git);
        requireThat(git.sha1 === commit, 'archive VCS revision does not match candidate source');
        requireThat(!git.dirty, 'archive records a dirty source checkout');
      }
      requireThat(canonical(publishMetadata.features).equals(canonical(pkg.features)), 'feature translation disagrees with cargo metadata; stop rather than publish');
      const unpacked = join(work, 'unpacked');
      extractFiles(files, unpacked);
      const archiveEnv = cargoEnvironment(join(work, 'archive-cargo-home'), join(work, 'archive-target'));
      if (!publishing && options.dependencies?.length) staging.configure(archiveEnv.CARGO_HOME!);
      const argv = [...cargo, 'test', '--locked', ...flags];
      await run(argv, { cwd: unpacked, env: archiveEnv });
      checks.push({ argv, scope: 'exact packaged archive', exit_code: 0 });
      requireThat(!await run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd: source }), 'qualification modified the source checkout');
      requireThat(await run(['git', 'rev-parse', 'HEAD'], { cwd: source }) === commit, 'qualification changed the checked-out revision');
      const smokeBytes = smoke ? readFileSync(within(source, smoke)) : Buffer.from('extern crate subject;\nfn main() {}\n');
      requireThat(smokeBytes.length <= 256 * 1024, 'consumer smoke source is too large');
      utf8(smokeBytes);
      mkdirSync(outputDir, { recursive: true });
      const payloads = { 'package.crate': crate, 'publish.json': canonical(publishMetadata), 'smoke.rs': smokeBytes };
      for (const [filename, data] of Object.entries(payloads)) writeFileSync(join(outputDir, filename), data);
      const result: Candidate = {
        schema: SCHEMA, created_at: utcNow(), package: { name, version: vers }, source: { repository, commit, ref },
        ...(options.plan ? { release_plan_sha256: digest(canonical(options.plan)) } : {}),
        pipeline: { repository: 'zsumz/zrelease', revision: pipelineRef },
        toolchain: { requested: toolchain, rustc, cargo: cargoVersion }, consumer: { features, default_features: defaultFeatures },
        qualification: { checks, note: 'The caller must additionally gate its domain-specific canonical CI.' },
        files: Object.fromEntries(Object.entries(payloads).map(([k, v]) => [k, { sha256: digest(v), size: v.length }])) as Candidate['files'],
      };
      if (options.plan) {
        bindCandidate(options.plan, result);
        requireThat(options.plan.publishing === publishing, 'release plan publish mode mismatch');
      }
      staging.add({ candidate: result, crate, metadata: payloads['publish.json'], smoke: smokeBytes });
      await runConsumer(result, outputDir, staging.configure);
      requireThat(!await run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd: source }), 'consumer modified the source checkout');
      requireThat(await run(['git', 'rev-parse', 'HEAD'], { cwd: source }) === commit, 'consumer changed the checked-out revision');
      for (const [filename, data] of Object.entries(payloads)) requireThat(readFileSync(join(outputDir, filename)).equals(data), 'consumer modified a sealed payload');
      for (const command of ['build', 'test', 'run']) checks.push({ argv: [...cargo, command, '--locked'], scope: 'fresh consumer against exact staged archives', exit_code: 0 });
      writeJson(join(outputDir, 'candidate.json'), result);
      return result;
    });
    const sha = digest(readFileSync(join(outputDir, 'candidate.json')));
    output({ candidate_sha256: sha, crate_sha256: candidate.files['package.crate'].sha256, version: candidate.package.version, package: name });
    console.log(`Candidate SHA-256: ${sha}`);
    return candidate;
  } finally { await staging.close(); }
}
