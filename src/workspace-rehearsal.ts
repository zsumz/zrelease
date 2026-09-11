import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Deployments } from './deployment.ts';
import { finish } from './finish.ts';
import { rehearse } from './mock.ts';
import { writeJson } from './common.ts';
import type { WorkspaceBundle } from './workspace.ts';

export async function rehearseWorkspace(bundle: WorkspaceBundle, out: string, track: boolean, protocol = rehearse): Promise<void> {
  mkdirSync(out, { recursive: true });
  const completed: string[] = [];
  const api = () => new Deployments(bundle.plan.source.repository, process.env.GITHUB_TOKEN ?? '');
  const runUrl = `https://github.com/${bundle.plan.source.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '## Workspace rehearsal\n\nNothing is published to crates.io.\n\n| Crate | Version | Outcome |\n| --- | --- | --- |\n');
  for (let i = 0; i < bundle.capsules.length; i++) {
    const capsule = bundle.capsules[i]!;
    const { candidate, crate, metadata } = capsule;
    const candidateSha = bundle.index.packages[i]!.sha256;
    const name = candidate.package.name;
    const reports = join(out, name);
    mkdirSync(reports, { recursive: true });
    console.log(`::group::Rehearse ${name} ${candidate.package.version}`);
    let deploymentId: number | undefined;
    try {
      if (track) deploymentId = await api().begin(candidate, candidateSha, runUrl, false);
      writeJson(join(reports, 'rehearsal.json'), { ...await protocol(candidate, crate, metadata), candidate_sha256: candidateSha });
      if (deploymentId) await finish(candidate, { candidateSha, production: false, deploymentId, runUrl, reports, summary: false,
        resultsJson: JSON.stringify({ qualify: 'success', track: 'success', rehearse: 'success' }), out: join(reports, 'release.json') }, api);
      completed.push(name);
      writeJson(join(out, 'workspace-rehearsal.json'), { schema: 'zrelease.workspace-rehearsal/v1', published: false,
        source: bundle.plan.source, completed, state: completed.length === bundle.capsules.length ? 'rehearsed' : 'in-progress' });
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `| ${name} | ${candidate.package.version} | Rehearsed |\n`);
    } catch (error) {
      writeJson(join(out, 'workspace-rehearsal.json'), { schema: 'zrelease.workspace-rehearsal/v1', published: false,
        source: bundle.plan.source, completed, failed: name, state: 'failed' });
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `| ${name} | ${candidate.package.version} | Failed; later crates stopped |\n`);
      if (deploymentId) await finish(candidate, { candidateSha, production: false, deploymentId, runUrl, reports, summary: false,
        resultsJson: JSON.stringify({ qualify: 'success', track: 'success', rehearse: 'failure' }), out: join(reports, 'release.json') }, api);
      throw error;
    } finally { console.log('::endgroup::'); }
  }
}
