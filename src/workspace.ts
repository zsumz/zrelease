import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load } from './capsule.ts';
import type { Bindings, Capsule } from './capsule.ts';
import { canonical, digest, inside, output, readRegular, record, requireThat, utf8, writeJson } from './common.ts';
import { bindCandidate, dependencyNames, planRelease, readPlan } from './plan.ts';
import type { PlanOptions, ReleasePlan } from './plan.ts';
import { prepare } from './prepare.ts';
import { checkMetadataPolicy } from './policy.ts';

export interface WorkspaceIndex {
  schema: 'zrelease.workspace/v1';
  plan_sha256: string;
  packages: { name: string; sha256: string }[];
}
export interface WorkspaceBundle {
  index: WorkspaceIndex;
  plan: ReleasePlan;
  capsules: Capsule[];
}
export async function prepareWorkspace(options: Omit<PlanOptions, 'publishing'> & { smokes: Record<string, string> }): Promise<WorkspaceIndex> {
  const root = resolve(options.out);
  requireThat(!existsSync(root), 'workspace output already exists');
  requireThat(!inside(resolve(options.source), root), 'workspace output must be outside the source checkout');
  mkdirSync(root, { recursive: true });
  const plan = await planRelease({ ...options, publishing: false, out: join(root, 'release-plan.json') });
  requireThat(Object.keys(options.smokes).every(name => plan.packages.some(p => p.name === name)), 'smoke source names an unselected crate');
  const index: WorkspaceIndex = { schema: 'zrelease.workspace/v1', plan_sha256: digest(canonical(plan)), packages: [] };
  const capsules = new Map<string, Capsule>();
  for (const pkg of plan.packages) {
    console.log(`::group::Package ${pkg.name} ${pkg.version}`);
    try {
      const directory = join(root, 'candidates', pkg.name);
      await prepare({ ...options, package: pkg.name, plan, publishing: false, outputDir: directory,
        smoke: options.smokes[pkg.name] ?? '', dependencies: dependencyNames(plan, pkg.name).map(name => capsules.get(name)!) });
      const sha256 = digest(readFileSync(join(directory, 'candidate.json')));
      capsules.set(pkg.name, await load(directory, sha256));
      index.packages.push({ name: pkg.name, sha256 });
    } finally { console.log('::endgroup::'); }
  }
  writeJson(join(root, 'workspace.json'), index);
  output({ workspace_sha256: digest(canonical(index)) });
  return index;
}
export async function loadWorkspace(root: string, expected: string, bindings: Bindings = {}): Promise<WorkspaceBundle> {
  const bytes = readRegular(join(root, 'workspace.json'), 4 * 1024 * 1024);
  requireThat(digest(bytes) === expected, 'workspace digest mismatch');
  const raw = record(JSON.parse(utf8(bytes)));
  requireThat(raw.schema === 'zrelease.workspace/v1' && typeof raw.plan_sha256 === 'string', 'invalid workspace bundle');
  const plan = readPlan(join(root, 'release-plan.json'), raw.plan_sha256, bindings);
  requireThat(plan.publishing === false, 'workspace rehearsal cannot use a publishing plan');
  requireThat(Array.isArray(raw.packages) && raw.packages.length === plan.packages.length, 'workspace release set differs from plan');
  const capsules: Capsule[] = [];
  for (let i = 0; i < plan.packages.length; i++) {
    const pkg = record(raw.packages[i]);
    const name = plan.packages[i]!.name;
    requireThat(pkg.name === name && typeof pkg.sha256 === 'string', 'workspace order differs from plan');
    const capsule = await load(join(root, 'candidates', name), pkg.sha256, { ...bindings, package: name });
    bindCandidate(plan, capsule.candidate);
    checkMetadataPolicy(plan, JSON.parse(utf8(capsule.metadata)));
    requireThat(capsule.candidate.release_plan_sha256 === raw.plan_sha256, 'candidate belongs to another release plan');
    capsules.push(capsule);
  }
  return { index: raw as unknown as WorkspaceIndex, plan, capsules };
}
