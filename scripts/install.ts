import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { NAME, relative, requireThat, SHA, TOOLCHAIN, valid } from '../src/common.ts';
import { graph } from '../src/plan.ts';
import type { Member } from '../src/plan.ts';

export function render(sha: string, selected: string | Member[], toolchain: string, manifest = 'Cargo.toml', workspace = false, lockstep = false): string {
  valid(SHA, sha, 'pipeline commit SHA'); valid(TOOLCHAIN, toolchain, 'exact Rust toolchain');
  const members = typeof selected === 'string' ? [{ name: selected, needs: [] }] : selected;
  requireThat(members.length > 0 && members.length <= 200 && new Set(members.map(p => p.name)).size === members.length, 'select 1–200 distinct crates');
  for (const p of members) { valid(NAME, p.name, 'crate name'); for (const dep of p.needs) requireThat(members.some(p => p.name === dep), 'unknown crate dependency'); }
  requireThat(basename(relative(manifest)) === 'Cargo.toml', 'manifest path must end in Cargo.toml');
  valid(/^[A-Za-z0-9_./-]+$/, manifest, 'manifest path (letters, digits, _, ., / and - only)');
  const id = (name: string) => 'crate_' + members.findIndex(p => p.name === name);
  function ancestors(name: string, active = new Set<string>()): string[] {
    requireThat(!active.has(name), 'workspace dependency cycle');
    const next = new Set([...active, name]);
    return [...new Set(members.find(p => p.name === name)!.needs.flatMap(dep => [...ancestors(dep, next), dep]))];
  }
  const ordered = [...new Set(members.flatMap(p => [...ancestors(p.name), p.name]))];
  const jobs = ordered.map((name, position) => {
    const p = members.find(p => p.name === name)!;
    const deps = ancestors(p.name);
    const prerequisites = [...new Set([...deps, ...ordered.slice(Math.max(0, position - 1), position)])];
    return `  ${id(p.name)}:\n    name: ${p.name}\n    needs: [plan${prerequisites.map(dep => ', ' + id(dep)).join('')}]\n` +
      '    permissions:\n      contents: read\n      id-token: write\n      attestations: write\n      deployments: write\n' +
      `    uses: zsumz/zrelease/.github/workflows/release.yml@${sha}\n    with:\n      package: '${p.name}'\n` +
      `      pipeline-ref: '${sha}'\n      toolchain: '${toolchain}'\n      manifest-path: '${manifest}'\n` +
      '      publish: ${{ inputs.publish }}\n      plan-artifact-id: ${{ needs.plan.outputs.artifact-id }}\n      plan-sha256: ${{ needs.plan.outputs.plan-sha256 }}\n      approval-artifact-id: ${{ needs.plan.outputs.approval-artifact-id }}\n' +
      (deps.length ? `      dependency-artifact-ids: '${deps.map(dep => '${{ needs.' + id(dep) + '.outputs.candidate-artifact-id }}').join(',')}'\n` +
        `      dependency-shas: '[${deps.map(dep => '"${{ needs.' + id(dep) + '.outputs.candidate-sha256 }}"').join(',')}]'\n` : '');
  }).join('');
  let text = readFileSync(join(import.meta.dirname, '../templates/release.yml.in'), 'utf8');
  for (const [key, value] of Object.entries({ SHA: sha, MEMBERS: JSON.stringify(members.map(({ name, needs }) => ({ name, needs }))), JOBS: jobs, WORKSPACE: String(workspace), LOCKSTEP: String(lockstep), TOOLCHAIN: toolchain, MANIFEST: manifest })) text = text.replaceAll(`@@${key}@@`, value);
  requireThat(!text.includes('@@'), 'unresolved workflow template placeholder');
  return text;
}
export function renderRehearsal(sha: string, selected: string | Member[], toolchain: string, manifest = 'Cargo.toml', workspace = false, lockstep = false): string {
  render(sha, selected, toolchain, manifest, workspace, lockstep); // Share validation with publishing callers.
  const members = typeof selected === 'string' ? [{ name: selected, needs: [] }] : selected;
  return `# Add your canonical CI to rehearsal.needs. Regenerate when crate dependencies change.
name: Rehearse
'on':
  workflow_dispatch:
permissions:
  contents: read
jobs:
  rehearsal:
    permissions:
      contents: read
      id-token: write
      attestations: write
      deployments: write
    uses: zsumz/zrelease/.github/workflows/rehearse.yml@${sha}
    with:
      members: '${JSON.stringify(members)}'
      workspace: ${workspace}
      lockstep: ${lockstep}
      pipeline-ref: '${sha}'
      toolchain: '${toolchain}'
      manifest-path: '${manifest}'
`;
}
export function main(args = process.argv.slice(2)): number {
  try {
    const { values } = parseArgs({ args, options: { sha: { type: 'string' }, package: { type: 'string', multiple: true }, toolchain: { type: 'string' },
      source: { type: 'string' }, rehearsal: { type: 'boolean' }, workspace: { type: 'boolean' }, lockstep: { type: 'boolean' }, manifest: { type: 'string', default: 'Cargo.toml' }, out: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
    if (values.help) { console.log('install --sha SHA --toolchain VERSION --out FILE (--package NAME | --source DIR --workspace) [--manifest Cargo.toml] [--rehearsal] [--lockstep]\nUse --rehearsal for a compact workspace practice workflow.\nUse --lockstep to require one version, exact internal pins and matching version tags.\nRepeat --package to select several workspace members; use --source to discover their dependencies.'); return 0; }
    requireThat(values.sha && values.toolchain && values.out && (values.package?.length || values.workspace), '--sha, --toolchain, --out and --package or --workspace are required');
    requireThat(!values.workspace || (values.source && !values.package), '--workspace requires --source and cannot be combined with --package');
    requireThat(values.source || values.package?.length === 1, 'multiple crates require --source for dependency discovery');
    let members: string | Member[] = values.package?.[0] ?? '';
    if (values.source) {
      valid(TOOLCHAIN, values.toolchain, 'exact Rust toolchain');
      const result = spawnSync('cargo', ['+' + values.toolchain, 'metadata', '--no-deps', '--locked', '--format-version', '1', '--manifest-path', resolve(values.source, relative(values.manifest!))],
        { cwd: values.source, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      requireThat(result.status === 0, 'cannot discover Cargo workspace: ' + (result.error?.message ?? result.stderr));
      members = graph(JSON.parse(result.stdout), values.workspace ? undefined : values.package, values.lockstep).map(({ name, needs }) => ({ name, needs }));
    }
    const text = (values.rehearsal ? renderRehearsal : render)(values.sha, members, values.toolchain, values.manifest, values.workspace, values.lockstep);
    mkdirSync(dirname(values.out), { recursive: true });
    writeFileSync(values.out, text, { flag: 'wx' });
    console.log(`Created ${values.out}. Rehearsal is the default; nothing was published.`); return 0;
  } catch (error) { console.error(`install: ${error instanceof Error ? error.message : String(error)}`); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
