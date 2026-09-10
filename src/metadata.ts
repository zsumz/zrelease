import { parse } from 'smol-toml';
import { NAME, ReleaseError, record, relative, requireThat, strings, utf8, valid } from './common.ts';
import type { ArchiveFiles } from './archive.ts';
import type { Dependency, PublishMetadata } from './types.ts';

export function normalizedMetadata(files: ArchiveFiles, name: string, vers: string): PublishMetadata {
  let manifest: Record<string, unknown>;
  try { manifest = record(parse(utf8(files.get('Cargo.toml')!))); }
  catch { throw new ReleaseError('invalid packaged Cargo.toml'); }
  const pkg = record(manifest.package, 'package');
  requireThat(pkg.name === name && pkg.version === vers, 'manifest identity disagrees with the release candidate');
  requireThat(pkg.publish === undefined || (Array.isArray(pkg.publish) && pkg.publish.length === 1 && pkg.publish[0] === 'crates-io'), 'package must permit publishing to crates.io only (or omit publish)');
  requireThat(!['workspace', 'patch', 'replace'].some(k => Object.hasOwn(manifest, k)), 'manifest was not normalized by Cargo');
  requireThat(typeof pkg.description === 'string' && pkg.description.trim(), 'package description is required');
  requireThat(pkg.license || pkg['license-file'], 'license or license-file is required');
  const deps: Dependency[] = [];
  const optional = new Set<string>();
  const sections: [Record<string, unknown>, string | null][] = [[manifest, null]];
  for (const [target, values] of Object.entries(record(manifest.target ?? {}, 'target dependencies'))) {
    sections.push([record(values, 'target dependency table'), target]);
  }
  const allowed = new Set(['version', 'features', 'optional', 'default-features', 'package']);
  const headings = [['dependencies', 'normal'], ['dev-dependencies', 'dev'], ['build-dependencies', 'build']] as const;
  for (const [table, target] of sections) {
    for (const [heading, kind] of headings) {
      for (const [alias, value] of Object.entries(record(table[heading] ?? {}, heading))) {
        const spec = typeof value === 'string' ? { version: value } : record(value, `dependency ${alias}`);
        requireThat(Object.keys(spec).every(key => allowed.has(key)), `unsupported dependency fields for ${alias}; only crates.io dependencies are supported`);
        requireThat(typeof spec.version === 'string' && spec.version, `dependency ${alias} lacks a registry version`);
        const flags = strings(spec.features ?? [], 'dependency features');
        const isOptional = spec.optional ?? false;
        const defaults = spec['default-features'] ?? true;
        requireThat(typeof isOptional === 'boolean' && typeof defaults === 'boolean', 'dependency flags must be booleans');
        const original = valid(NAME, spec.package ?? alias, 'dependency package');
        if (isOptional) optional.add(alias);
        deps.push({ name: original, version_req: spec.version, features: flags, optional: isOptional,
          default_features: defaults, target, kind, registry: null,
          explicit_name_in_toml: Object.hasOwn(spec, 'package') ? alias : null });
      }
    }
  }
  const features: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
  for (const [key, value] of Object.entries(record(manifest.features ?? {}, 'package features'))) {
    features[key] = strings(value, 'package features');
  }
  const explicit = new Set(Object.values(features).flat().filter(x => x.startsWith('dep:')).map(x => x.slice(4)));
  for (const alias of [...optional].sort()) {
    if (!explicit.has(alias) && !Object.hasOwn(features, alias)) features[alias] = [`dep:${alias}`];
  }
  const metadata: PublishMetadata = { name, vers, deps, features };
  for (const field of ['authors', 'keywords', 'categories']) metadata[field] = strings(pkg[field] ?? [], field);
  for (const field of ['description', 'documentation', 'homepage', 'license', 'repository', 'links', 'license-file', 'rust-version']) {
    const value = pkg[field] ?? null;
    requireThat(value === null || typeof value === 'string', `unresolved or invalid package.${field}`);
    metadata[field.replaceAll('-', '_')] = value;
  }
  metadata.badges = manifest.badges ?? {};
  const readme = pkg.readme;
  requireThat(readme === undefined || readme === false || typeof readme === 'string', 'packaged readme must be a path or false');
  metadata.readme_file = typeof readme === 'string' ? readme : null;
  metadata.readme = null;
  if (typeof readme === 'string') {
    const content = files.get(relative(readme));
    requireThat(content, 'packaged README is missing');
    metadata.readme = utf8(content);
  }
  if (pkg['license-file']) requireThat(files.has(relative(pkg['license-file'])), 'packaged license file is missing');
  return metadata;
}
