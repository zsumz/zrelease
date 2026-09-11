import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { record, requireThat, strings } from './common.ts';
import { loadWorkspace, prepareWorkspace } from './workspace.ts';
import { rehearseWorkspace } from './workspace-rehearsal.ts';

export async function main(args = process.argv.slice(2)): Promise<number> {
  try {
    const [command, ...rest] = args;
    requireThat(['prepare', 'check', 'rehearse'].includes(command ?? ''), 'workspace supports prepare, check and rehearse only');
    const { values } = parseArgs({ args: rest, options: {
      source: { type: 'string' }, out: { type: 'string' }, bundle: { type: 'string' }, sha: { type: 'string' },
      toolchain: { type: 'string' }, repository: { type: 'string', default: process.env.GITHUB_REPOSITORY },
      commit: { type: 'string', default: process.env.GITHUB_SHA }, ref: { type: 'string', default: process.env.GITHUB_REF },
      'pipeline-ref': { type: 'string', default: process.env.PIPELINE_REF }, 'base-branch': { type: 'string', default: 'main' },
      manifest: { type: 'string', default: 'Cargo.toml' }, 'tag-prefix': { type: 'string', default: 'v' },
      'members-json': { type: 'string' }, workspace: { type: 'boolean' },
      'smokes-json': { type: 'string', default: '{}' }, track: { type: 'boolean', default: false },
    } });
    const text = (key: keyof typeof values): string => {
      const value = values[key]; requireThat(typeof value === 'string' && value !== '', `--${key} is required`); return value;
    };
    if (command === 'prepare') {
      const members: unknown = JSON.parse(text('members-json'));
      requireThat(Array.isArray(members), 'members-json must be an array');
      const rawSmokes = record(JSON.parse(text('smokes-json')));
      const smokes = Object.fromEntries(Object.entries(rawSmokes).map(([name, value]) => {
        requireThat(typeof value === 'string', 'smoke sources must be paths'); return [name, value];
      }));
      await prepareWorkspace({ source: text('source'), out: text('out'), toolchain: text('toolchain'),
        repository: text('repository'), commit: text('commit'), ref: text('ref'), pipelineRef: text('pipeline-ref'),
        baseBranch: values['base-branch'] ?? 'main', manifest: text('manifest'), tagPrefix: text('tag-prefix'), workspace: values.workspace, smokes,
        members: members.map(value => { const pkg = record(value); requireThat(typeof pkg.name === 'string', 'member name required');
          return { name: pkg.name, needs: strings(pkg.needs, 'dependencies') }; }) });
    } else {
      const bundle = await loadWorkspace(text('bundle'), text('sha'), {
        repository: values.repository, commit: values.commit, pipelineRef: values['pipeline-ref'],
      });
      if (command === 'rehearse') await rehearseWorkspace(bundle, text('out'), values.track === true);
      else console.log(`Verified ${bundle.capsules.length} workspace candidates.`);
    }
    return 0;
  } catch (error) { console.error(`workspace: ${error instanceof Error ? error.message : String(error)}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
