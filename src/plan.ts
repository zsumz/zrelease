import { appendFileSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, relative as pathRelative } from 'node:path';
import { canonical, digest, DIGEST, NAME, output, readRegular, record, REPO, requireThat, SHA, strings, TOOLCHAIN, utf8, valid, version, within, writeJson } from './common.ts';
import { cargoEnvironment, run, temporary } from './process.ts';
import type { Candidate, SourceIdentity } from './types.ts';
import { checkVersionPolicy } from './policy.ts';
import type { VersionPolicy } from './policy.ts';

export interface Member { name: string; needs: string[] }
export interface ReleasePlan {
  schema: 'zrelease.plan/v1'; source: SourceIdentity; pipeline_ref: string; toolchain: string;
  manifest: string; publishing: boolean; packages: (Member & { version: string })[];
  version_policy?: VersionPolicy;
}

export function graph(value: unknown, selected?: string[], lockstep = false): ReleasePlan['packages'] {
  const metadata = record(value, 'Cargo metadata');
  const ids = new Set(strings(metadata.workspace_members, 'workspace members'));
  requireThat(Array.isArray(metadata.packages), 'invalid Cargo packages');
  const members = metadata.packages.map(p => record(p)).filter(p => ids.has(String(p.id)));
  const publishable = (p: Record<string, unknown>) => p.publish === null ||
    (Array.isArray(p.publish) && p.publish.length === 1 && p.publish[0] === 'crates-io');
  const names = selected ?? members.filter(publishable).map(p => String(p.name));
  requireThat(names.length > 0 && names.length <= 200 && new Set(names).size === names.length, 'select 1–200 distinct crates');
  const packages = names.map(name => {
    valid(NAME, name, 'crate name');
    const pkg = members.find(p => p.name === name);
    requireThat(pkg && publishable(pkg), `${name} is not a publishable workspace member`);
    requireThat(Array.isArray(pkg.targets) && pkg.targets.some(t => {
      const kinds = record(t).kind; return Array.isArray(kinds) && kinds.some(k => ['lib', 'rlib', 'proc-macro'].includes(k));
    }), `${name}: only library crates are supported`);
    requireThat(Array.isArray(pkg.dependencies), 'invalid package dependencies');
    const needs = new Set<string>();
    for (const raw of pkg.dependencies) {
      const dep = record(raw);
      const sibling = members.find(p => p.name === dep.name && (dep.path
        ? pathRelative(String(dep.path), String(p.manifest_path)) === 'Cargo.toml'
        : !dep.registry && (!dep.source || dep.source === 'registry+https://github.com/rust-lang/crates.io-index')));
      if (sibling && names.includes(String(sibling.name))) {
        needs.add(String(sibling.name));
        if (lockstep) requireThat(dep.req === `=${version(pkg.version)}`, `lockstep dependency ${name} -> ${String(dep.name)} requires an exact =${String(pkg.version)} requirement`);
      }
    }
    return { name, version: version(pkg.version), needs: [...needs].sort() };
  });
  if (lockstep) requireThat(packages.every(p => p.version === packages[0]!.version), 'lockstep release requires one shared package version');
  const sorted: ReleasePlan['packages'] = [], active = new Set<string>(), done = new Set<string>();
  function visit(name: string): void {
    requireThat(!active.has(name), `workspace dependency cycle involving ${name}`);
    if (done.has(name)) return;
    active.add(name);
    const pkg = packages.find(p => p.name === name)!;
    for (const dep of pkg.needs) visit(dep);
    active.delete(name); done.add(name); sorted.push(pkg);
  }
  for (const name of [...names].sort()) visit(name);
  return sorted;
}

export function readPlan(path: string, expected: string, bindings: { repository?: string; commit?: string; pipelineRef?: string } = {}): ReleasePlan {
  valid(DIGEST, expected, 'release plan digest');
  const bytes = readRegular(path, 4 * 1024 * 1024);
  requireThat(digest(bytes) === expected, 'release plan digest mismatch');
  const plan = record(JSON.parse(utf8(bytes)));
  requireThat(plan.schema === 'zrelease.plan/v1', 'unsupported release plan');
  const source = record(plan.source);
  valid(REPO, source.repository, 'source repository'); valid(SHA, source.commit, 'source commit');
  requireThat(typeof source.ref === 'string' && typeof plan.publishing === 'boolean', 'invalid release context');
  valid(SHA, plan.pipeline_ref, 'pipeline revision'); valid(TOOLCHAIN, plan.toolchain, 'toolchain');
  for (const [want, actual] of [[bindings.repository, source.repository], [bindings.commit, source.commit], [bindings.pipelineRef, plan.pipeline_ref]]) {
    requireThat(want === undefined || want === actual, 'release plan context mismatch');
  }
  requireThat(Array.isArray(plan.packages) && plan.packages.length > 0, 'empty release plan');
  const seen = new Set<string>();
  for (const raw of plan.packages) {
    const pkg = record(raw); valid(NAME, pkg.name, 'crate'); version(pkg.version);
    requireThat(!seen.has(String(pkg.name)), 'duplicate release crate');
    requireThat(strings(pkg.needs, 'crate dependencies').every(dep => seen.has(dep)), 'release plan is not dependency ordered');
    seen.add(String(pkg.name));
  }
  const result = plan as unknown as ReleasePlan;
  checkVersionPolicy(result);
  return result;
}

export function bindCandidate(plan: ReleasePlan, candidate: Candidate): void {
  const pkg = plan.packages.find(p => p.name === candidate.package.name);
  requireThat(pkg?.version === candidate.package.version && canonical(plan.source).equals(canonical(candidate.source))
    && plan.pipeline_ref === candidate.pipeline.revision && plan.toolchain === candidate.toolchain.requested,
  'candidate differs from the approved release plan');
}

export function dependencyNames(plan: ReleasePlan, name: string): string[] {
  const names = new Set<string>();
  function visit(name: string): void {
    const pkg = plan.packages.find(p => p.name === name);
    requireThat(pkg, 'package is absent from the release plan');
    for (const dep of pkg.needs) if (!names.has(dep)) { names.add(dep); visit(dep); }
  }
  visit(name); return [...names].sort();
}

export interface PlanOptions {
  source: string; manifest: string; members: Member[]; toolchain: string; repository: string; commit: string;
  ref: string; pipelineRef: string; publishing: boolean; baseBranch: string; tagPrefix: string; out: string; workspace?: boolean; lockstep?: boolean;
}
export async function planRelease(options: PlanOptions): Promise<ReleasePlan> {
  const source = realpathSync(options.source);
  valid(REPO, options.repository, 'repository'); valid(SHA, options.commit, 'commit');
  valid(SHA, options.pipelineRef, 'pipeline revision'); valid(TOOLCHAIN, options.toolchain, 'toolchain');
  const manifest = within(source, options.manifest);
  requireThat(basename(manifest) === 'Cargo.toml', 'manifest must end in Cargo.toml');
  requireThat(await run(['git', 'rev-parse', 'HEAD'], { cwd: source }) === options.commit, 'checkout differs from release commit');
  requireThat(!await run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd: source }), 'source checkout is dirty');
  if (options.baseBranch) {
    await run(['git', 'check-ref-format', `refs/heads/${options.baseBranch}`], { cwd: source });
    await run(['git', 'merge-base', '--is-ancestor', options.commit, `refs/remotes/origin/${options.baseBranch}`], { cwd: source });
  }
  const packages = await temporary('zrelease-plan-', async work => {
    const env = cargoEnvironment(join(work, 'cargo-home'), join(work, 'target'));
    const raw = await run(['cargo', `+${options.toolchain}`, 'metadata', '--no-deps', '--locked', '--format-version', '1', '--manifest-path', manifest], { cwd: source, env });
    return graph(JSON.parse(raw), options.workspace ? undefined : options.members.map(p => p.name), options.lockstep);
  });
  const expected = options.members.map(p => ({ name: p.name, needs: [...p.needs].sort() })).sort((a, b) => a.name.localeCompare(b.name));
  const actual = packages.map(({ name, needs }) => ({ name, needs })).sort((a, b) => a.name.localeCompare(b.name));
  requireThat(canonical(expected).equals(canonical(actual)), 'workspace dependencies changed; regenerate the release workflow');
  if (options.publishing) {
    requireThat(options.ref.startsWith(`refs/tags/${options.tagPrefix}`), 'publication requires a release tag');
    if (packages.length === 1) requireThat(options.ref === `refs/tags/${options.tagPrefix}${packages[0]!.version}`, 'single-crate release requires an exact version tag');
    await run(['git', 'check-ref-format', options.ref], { cwd: source });
    requireThat(await run(['git', 'rev-parse', `${options.ref}^{commit}`], { cwd: source }) === options.commit, 'release tag differs from source commit');
  }
  const plan: ReleasePlan = { schema: 'zrelease.plan/v1', source: { repository: options.repository, commit: options.commit, ref: options.ref },
    pipeline_ref: options.pipelineRef, toolchain: options.toolchain, manifest: options.manifest, publishing: options.publishing, packages,
    ...(options.lockstep ? { version_policy: { mode: 'lockstep' as const, version: packages[0]!.version, tag_prefix: options.tagPrefix } } : {}) };
  checkVersionPolicy(plan);
  // Check every name before approval, so a later new crate cannot cause a partial release.
  if (options.publishing) {
    const { Registry } = await import('./registry.ts');
    await new Registry().requireExisting(packages.map(p => p.name));
  }
  writeJson(options.out, plan);
  const sha = digest(readFileSync(options.out));
  output({ plan_sha256: sha });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## Release\n\nCommit: \`${options.commit}\`\n\nRef: \`${options.ref}\`\n\nVersion policy: ${options.lockstep ? 'lockstep (exact internal pins and version tag)' : 'independent versions'}\n\nPlan: \`${sha}\`\n\n| Crate | Version | After |\n| --- | --- | --- |\n` +
    packages.map(p => `| ${p.name} | ${p.version} | ${p.needs.join(', ') || '—'} |`).join('\n') + '\n\n' +
    (options.publishing ? 'Approve this release once in the release environment. Crates publish and verify in dependency order.\n' : 'Rehearsal only; nothing will be published.\n'));
  return plan;
}
