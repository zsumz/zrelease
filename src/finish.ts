import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { canonical, DIGEST, output, readJson, record, requireThat, utcNow, writeJson } from './common.ts';
import { terminalState } from './deployment.ts';
import type { Deployments } from './deployment.ts';
import type { Candidate, JobResult } from './types.ts';

export interface FinishOptions {
  candidateSha: string; production: boolean; deploymentId: number; runUrl: string;
  resultsJson: string; reports?: string; out: string;
}
function verifiedEvidence(candidate: Candidate, candidateSha: string, observations: Record<string, unknown>, production: boolean): boolean {
  try {
    const matchesIdentity = (report: Record<string, unknown>) => canonical(report.package).equals(canonical(candidate.package))
      && canonical(report.source).equals(canonical(candidate.source));
    const matchesRegistry = (value: unknown) => {
      const report = record(value);
      return report.state === 'registry-verified' && report.sha256 === candidate.files['package.crate'].sha256
        && report.bytes === candidate.files['package.crate'].size
        && report.version_url === `https://crates.io/crates/${candidate.package.name}/${candidate.package.version}`;
    };
    if (production) {
      const consumer = record(observations['consumer.json']);
      const checks = consumer.checks;
      return record(observations['registry.json']).candidate_sha256 === candidateSha && matchesRegistry(observations['registry.json'])
        && consumer.candidate_sha256 === candidateSha && consumer.schema === 'zrelease.consumer/v1'
        && consumer.state === 'consumer-verified' && matchesIdentity(consumer) && matchesRegistry(consumer.registry)
        && typeof consumer.cargo_lock_sha256 === 'string' && DIGEST.test(consumer.cargo_lock_sha256)
        && Array.isArray(checks) && ['exact registry resolution', 'build --locked', 'test --locked', 'run --locked'].every(check => checks.includes(check));
    }
    const rehearsal = record(observations['rehearsal.json']);
    return rehearsal.candidate_sha256 === candidateSha && rehearsal.schema === 'zrelease.rehearsal/v1' && rehearsal.state === 'rehearsed' && rehearsal.published === false
      && matchesIdentity(rehearsal) && rehearsal.crate_sha256 === candidate.files['package.crate'].sha256
      && rehearsal.upload_count === 1 && rehearsal.first_upload === 'ambiguous-response-reconciled'
      && rehearsal.retry === 'already-present-identical';
  } catch { return false; }
}
export async function finish(candidate: Candidate, options: FinishOptions, api: () => Pick<Deployments, 'status'>): Promise<void> {
  const { candidateSha, production, deploymentId, runUrl, resultsJson, reports, out } = options;
  requireThat(Number.isSafeInteger(deploymentId) && deploymentId > 0, 'invalid deployment ID');
  const results: Record<string, JobResult> = {};
  for (const [key, value] of Object.entries(record(JSON.parse(resultsJson), 'job results'))) {
    const result = typeof value === 'string' ? value : record(value).result;
    requireThat(typeof result === 'string' && ['success', 'failure', 'cancelled', 'skipped'].includes(result), 'invalid job result');
    results[key] = result as JobResult;
  }
  let [status, phase] = terminalState(results, production);
  const observations: Record<string, unknown> = {};
  if (reports) {
    for (const filename of ['registry.json', 'consumer.json', 'rehearsal.json']) {
      const path = join(reports, filename);
      if (existsSync(path)) {
        try { observations[filename] = readJson(path); }
        catch { observations[filename] = { error: 'Invalid report' }; }
      }
    }
  }
  const needed = production ? ['registry.json', 'consumer.json'] : ['rehearsal.json'];
  if (status === 'success' && !needed.every(k => Object.hasOwn(observations, k))) {
    status = 'failure'; phase = 'missing-verification-evidence';
  } else if (status === 'success' && !verifiedEvidence(candidate, candidateSha, observations, production)) {
    status = 'failure'; phase = 'invalid-verification-evidence';
  }
  const receipt = { schema: 'zrelease.receipt/v1', candidate_sha256: candidateSha, package: candidate.package,
    release_plan_sha256: candidate.release_plan_sha256 ?? null,
    source: candidate.source, pipeline: candidate.pipeline, crate_sha256: candidate.files['package.crate'].sha256,
    phase, deployment_status: status, deployment_id: deploymentId, production, run_url: runUrl, finished_at: utcNow(),
    jobs: results, observations,
    recovery: status === 'success' ? null : 'Do not assume rollback. Inspect crates.io, retain this capsule, and rerun failed jobs with the same candidate.' };
  // Persist evidence before constructing a client or attempting the terminal API write.
  writeJson(out, receipt);
  const { name, version } = candidate.package;
  const url = production ? `https://crates.io/crates/${name}/${version}` : runUrl;
  await api().status(deploymentId, status, runUrl, url, `${name} ${version}: ${phase}` + (production ? '' : '; nothing published'));
  output({ deployment_status: status, phase });
  if (process.env.GITHUB_STEP_SUMMARY) {
    const message = status === 'success' && production ? 'Registry delivery and consumer checks completed.\n'
      : !production ? 'This was a rehearsal; no package was published.\n'
      : 'Delivery needs investigation. A failed workflow does not undo a registry write.\n';
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${name} ${version}\n\n**${phase}**\n\nCandidate: \`${candidateSha}\`\n\nCrate: \`${receipt.crate_sha256}\`\n\n${message}`);
  }
}
