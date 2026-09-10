import { canonical, DIGEST, output, REPO, requireThat, utf8, valid } from './common.ts';
import { Http } from './http.ts';
import type { Transport } from './http.ts';
import type { Candidate, DeploymentStatus, JobResult, Phase } from './types.ts';

export class Deployments {
  readonly base: string;
  readonly token: string;
  readonly http: Transport;
  constructor(repository: string, token: string, http: Transport = new Http()) {
    valid(REPO, repository, 'GitHub repository'); requireThat(token, 'GITHUB_TOKEN is required for deployment tracking');
    this.base = `https://api.github.com/repos/${repository}`; this.token = token; this.http = http;
  }
  async post(path: string, payload: unknown): Promise<Record<string, unknown>> {
    return JSON.parse(utf8(await this.http.request('POST', this.base + path, { body: canonical(payload), token: this.token, github: true, limit: 4 * 1024 * 1024 }))) as Record<string, unknown>;
  }
  async begin(candidate: Candidate, sha: string, runUrl: string, production: boolean): Promise<number> {
    valid(DIGEST, sha, 'candidate digest');
    const { name, version } = candidate.package;
    const response = await this.post('/deployments', { ref: candidate.source.commit, task: 'deploy:crate', auto_merge: false,
      required_contexts: [], environment: `${production ? 'crates.io' : 'rehearsal'}/${name}`,
      description: `${name} ${version}` + (production ? '' : ' (no-publish rehearsal)'), transient_environment: false,
      production_environment: production, payload: { schema: 'zrelease.deployment/v1', package: candidate.package,
        candidate_sha256: sha, release_plan_sha256: candidate.release_plan_sha256 ?? null, run_url: runUrl, production } });
    const id = response.id;
    requireThat(typeof id === 'number' && Number.isSafeInteger(id) && id > 0, 'GitHub did not return a deployment ID');
    output({ deployment_id: id });
    await this.status(id, 'in_progress', runUrl, runUrl, 'Qualified; waiting for publishing or rehearsal');
    return id;
  }
  async status(id: number, state: DeploymentStatus | 'in_progress', runUrl: string, environmentUrl: string, description: string): Promise<Record<string, unknown>> {
    requireThat(Number.isSafeInteger(id) && id > 0 && ['in_progress', 'success', 'failure', 'error'].includes(state), 'invalid deployment status');
    requireThat(runUrl.startsWith('https://github.com/') && environmentUrl.startsWith('https://'), 'deployment URLs must use HTTPS');
    return this.post(`/deployments/${id}/statuses`, { state, auto_inactive: false, log_url: runUrl,
      environment_url: environmentUrl, description: description.slice(0, 140) });
  }
}
export function terminalState(results: Record<string, JobResult>, production: boolean): [DeploymentStatus, Phase] {
  const keys = production ? ['publish', 'verify'] : ['rehearse'];
  const relevant = keys.map(k => results[k] ?? 'skipped');
  if (relevant.every(r => r === 'success')) return ['success', production ? 'consumer-verified' : 'rehearsed'];
  if (relevant.includes('cancelled')) return ['error', 'interrupted'];
  if (production && results.publish === 'success') return ['failure', 'published-but-unverified'];
  return ['failure', production ? 'delivery-unconfirmed' : 'rehearsal-failed'];
}
