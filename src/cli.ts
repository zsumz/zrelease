import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { ParseArgsConfig } from 'node:util';
import { load } from './capsule.ts';
import { canonical, record, requireThat, strings, writeJson } from './common.ts';
import { verifyConsumer } from './consumer.ts';
import { Deployments } from './deployment.ts';
import { finish } from './finish.ts';
import { rehearse } from './mock.ts';
import { prepare } from './prepare.ts';
import { Registry } from './registry.ts';
import { bindCandidate, dependencyNames, planRelease, readPlan } from './plan.ts';
import { loadDependencies } from './staging.ts';

const commands = ['plan', 'prepare', 'check', 'upload', 'observe', 'consumer', 'rehearse', 'begin', 'finish'];
type Options = NonNullable<ParseArgsConfig['options']>;
export interface Services {
  registry: () => Pick<Registry, 'publish' | 'observe'>;
  deployments: (repository: string, token: string) => Pick<Deployments, 'begin' | 'status'>;
}
const services: Services = { registry: () => new Registry(), deployments: (repo, token) => new Deployments(repo, token) };

export async function execute(argv: string[], dependencies: Services = services): Promise<void> {
  const [command, ...args] = argv;
  if (command === '--help' || command === '-h') {
    console.log('Qualify, deploy, and verify a Rust library release.\nCommands: ' + commands.join(', ')); return;
  }
  requireThat(command && commands.includes(command), 'a valid command is required; use --help');
  const options: Options = { help: { type: 'boolean', short: 'h' } };
  const required: string[] = [];
  function field(name: string, fallback?: string, mandatory = false): void {
    options[name] = { type: 'string', ...(fallback === undefined ? {} : { default: fallback }) };
    if (mandatory) required.push(name);
  }
  function flag(name: string): void { options[name] = { type: 'boolean', default: false }; }
  if (['plan', 'prepare'].includes(command)) {
    for (const key of ['source', 'toolchain', 'repository', 'commit', 'ref', 'pipeline-ref', 'out']) field(key, undefined, true);
    field('manifest', 'Cargo.toml'); field('tag-prefix', 'v'); field('base-branch', 'main'); field('smoke', ''); field('features-json', '[]');
    flag('publishing'); flag('no-default-features');
    if (command === 'plan') { field('members-json', undefined, true); flag('workspace'); }
    else { field('package', undefined, true); field('dependencies'); field('dependency-shas', '[]'); }
  } else {
    field('capsule', undefined, true); field('candidate-sha', undefined, true);
    field('repository', process.env.GITHUB_REPOSITORY); field('commit', process.env.GITHUB_SHA);
    field('pipeline-ref', process.env.PIPELINE_REF); field('package');
    if (['upload', 'observe', 'rehearse', 'finish', 'consumer'].includes(command)) field('out', undefined, true);
    if (command === 'upload') { flag('confirm-publish'); field('tag-prefix', 'v'); }
    if (['begin', 'finish'].includes(command)) { flag('production'); field('run-url', undefined, true); }
    if (command === 'finish') { field('deployment-id', undefined, true); field('results-json', undefined, true); field('reports'); }
  }
  if (['prepare', 'upload', 'check'].includes(command)) { field('plan'); field('plan-sha'); }
  const { values } = parseArgs({ args, options, strict: true, allowPositionals: false });
  if (values.help) {
    console.log(`zrelease ${command}\n` + Object.keys(options).map(k => `  --${k}${required.includes(k) ? ' (required)' : ''}`).join('\n')); return;
  }
  for (const key of required) requireThat(typeof values[key] === 'string' && values[key] !== '', `--${key} is required`);
  const text = (key: string): string => values[key] as string;
  const maybe = (key: string): string | undefined => values[key] as string | undefined;
  const yes = (key: string): boolean => values[key] === true;
  const bindings = { repository: maybe('repository'), commit: maybe('commit'), pipelineRef: maybe('pipeline-ref') };
  requireThat(Boolean(values.plan) === Boolean(values['plan-sha']), '--plan and --plan-sha must be provided together');
  const release = values.plan ? readPlan(text('plan'), text('plan-sha'), bindings) : undefined;
  if (command === 'plan') {
    const raw: unknown = JSON.parse(text('members-json'));
    requireThat(Array.isArray(raw), 'members-json must be an array');
    await planRelease({ source: text('source'), manifest: text('manifest'), toolchain: text('toolchain'), repository: text('repository'),
      commit: text('commit'), ref: text('ref'), pipelineRef: text('pipeline-ref'), publishing: yes('publishing'), baseBranch: text('base-branch'),
      tagPrefix: text('tag-prefix'), out: text('out'), workspace: yes('workspace'), members: raw.map(value => {
        const p = record(value); requireThat(typeof p.name === 'string', 'member name is required');
        return { name: p.name, needs: strings(p.needs, 'member dependencies') };
      }) });
    return;
  }
  if (command === 'prepare') {
    const hashes = strings(JSON.parse(text('dependency-shas')), 'dependency candidate digests');
    requireThat(values.dependencies || hashes.length === 0, 'dependency artifacts are required');
    const siblings = values.dependencies ? await loadDependencies(text('dependencies'), hashes, bindings) : [];
    if (release) {
      requireThat(canonical(siblings.map(s => s.candidate.package.name).sort()).equals(canonical(dependencyNames(release, text('package')))), 'dependency artifacts differ from the approved release plan');
      for (const sibling of siblings) {
        bindCandidate(release, sibling.candidate);
        requireThat(sibling.candidate.release_plan_sha256 === text('plan-sha'), 'dependency belongs to another release plan');
      }
    }
    await prepare({ source: text('source'), manifest: text('manifest'), package: text('package'), toolchain: text('toolchain'),
      repository: text('repository'), commit: text('commit'), ref: text('ref'), pipelineRef: text('pipeline-ref'), outputDir: text('out'),
      publishing: yes('publishing'), tagPrefix: text('tag-prefix'), baseBranch: text('base-branch'), smoke: text('smoke'),
      features: strings(JSON.parse(text('features-json')), 'features-json array'), defaultFeatures: !yes('no-default-features'), plan: release, dependencies: siblings });
    return;
  }
  const { candidate, crate, metadata } = await load(text('capsule'), text('candidate-sha'), {
    repository: maybe('repository'), commit: maybe('commit'), package: maybe('package'), pipelineRef: maybe('pipeline-ref'),
  });
  if (release) {
    bindCandidate(release, candidate);
    requireThat(candidate.release_plan_sha256 === text('plan-sha'), 'candidate is not bound to this release plan');
  }
  const api = () => dependencies.deployments(candidate.source.repository, process.env.GITHUB_TOKEN ?? '');
  switch (command) {
    case 'check': console.log(JSON.stringify(candidate, null, 2)); break;
    case 'upload': {
      requireThat(yes('confirm-publish'), 'live publishing requires --confirm-publish');
      requireThat(process.env.GITHUB_ACTIONS === 'true', 'live publishing is restricted to GitHub Actions; use rehearse locally');
      requireThat(['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME ?? ''), 'this GitHub event cannot publish');
      requireThat(!candidate.release_plan_sha256 || release, 'approved release plan is required');
      if (release) requireThat(release.publishing && release.source.ref.startsWith('refs/tags/'), 'release plan does not authorize publication');
      const expectedRef = release?.source.ref ?? `refs/tags/${text('tag-prefix')}${candidate.package.version}`;
      requireThat(candidate.source.ref === expectedRef && process.env.GITHUB_REF === expectedRef, 'publishing requires the exact version tag');
      writeJson(text('out'), { ...await dependencies.registry().publish(candidate, crate, metadata, process.env.CARGO_REGISTRY_TOKEN ?? ''), candidate_sha256: text('candidate-sha') });
      break;
    }
    case 'observe': writeJson(text('out'), await dependencies.registry().observe(candidate.package.name, candidate.package.version, candidate.files['package.crate'].sha256)); break;
    case 'consumer': await verifyConsumer(candidate, text('capsule'), text('out'), text('candidate-sha')); break;
    case 'rehearse': writeJson(text('out'), { ...await rehearse(candidate, crate, metadata), candidate_sha256: text('candidate-sha') }); break;
    case 'begin': await api().begin(candidate, text('candidate-sha'), text('run-url'), yes('production')); break;
    case 'finish': await finish(candidate, { candidateSha: text('candidate-sha'), production: yes('production'),
      deploymentId: Number(text('deployment-id')), runUrl: text('run-url'), resultsJson: text('results-json'), reports: maybe('reports'), out: text('out') }, api); break;
  }
}
export async function main(argv = process.argv.slice(2), dependencies = services): Promise<number> {
  try { await execute(argv, dependencies); return 0; }
  catch (error) { console.error(`zrelease: ${error instanceof Error ? error.message : String(error)}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
