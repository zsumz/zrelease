import { record, requireThat, version } from './common.ts';
import type { ReleasePlan } from './plan.ts';
import type { PublishMetadata } from './types.ts';

export interface VersionPolicy { mode: 'lockstep'; version: string; tag_prefix: string }

export function checkVersionPolicy(plan: ReleasePlan): void {
  if (plan.version_policy === undefined) return;
  const policy = record(plan.version_policy, 'version policy');
  requireThat(policy.mode === 'lockstep' && typeof policy.tag_prefix === 'string', 'unsupported version policy');
  const expected = version(policy.version);
  requireThat(plan.packages.every(p => p.version === expected), 'lockstep release requires one shared package version');
  if (plan.publishing || plan.source.ref.startsWith('refs/tags/')) {
    requireThat(plan.source.ref === `refs/tags/${policy.tag_prefix}${expected}`, 'lockstep release requires an exact version tag');
  }
}

export function checkMetadataPolicy(plan: ReleasePlan, metadata: PublishMetadata): void {
  checkVersionPolicy(plan);
  if (!plan.version_policy) return;
  const expected = plan.version_policy.version;
  requireThat(metadata.vers === expected, 'lockstep archive version differs from the release plan');
  for (const dep of metadata.deps) {
    if (plan.packages.some(p => p.name === dep.name)) {
      requireThat(dep.version_req === `=${expected}`, `lockstep archive dependency ${dep.name} requires exact =${expected}`);
    }
  }
}
