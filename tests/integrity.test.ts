import assert from 'node:assert/strict';
import { readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { archiveFiles, extractFiles, MAX_CRATE, MAX_EXPANDED, MAX_FILES } from '../src/archive.ts';
import { load } from '../src/capsule.ts';
import { canonical, digest, relative, version, writeJson } from '../src/common.ts';
import { normalizedMetadata } from '../src/metadata.ts';
import { fixtureFiles, makeArchive, makeCapsule, MANIFEST, NAME, temp, VERSION } from './support.ts';
import type { Header } from 'tar-stream';

test('normal archive contains Cargo.toml', async () => assert.ok((await archiveFiles(await makeArchive(), NAME, VERSION)).has('Cargo.toml')));
const root = `${NAME}-${VERSION}`;
const badEntries: [string, Partial<Header> & { name: string }][] = [
  ['parent traversal', { name: `${root}/../../escape` }], ['absolute path', { name: '/etc/passwd' }],
  ['wrong root', { name: 'other-1.2.3/a' }], ['symlink', { name: `${root}/link`, type: 'symlink', linkname: '../../elsewhere' }],
  ['hardlink', { name: `${root}/link`, type: 'link', linkname: `${root}/Cargo.toml` }],
  ['device', { name: `${root}/device`, type: 'character-device' }], ['fifo', { name: `${root}/fifo`, type: 'fifo' }],
  ['duplicate', { name: `${root}/Cargo.toml` }], ['normalized duplicate', { name: `${root}/./Cargo.toml` }],
  ['windows path', { name: `${root}/C:\\escape` }], ['root file', { name: root }],
];
for (const [name, header] of badEntries) test(`archive rejects ${name}`, async () => {
  await assert.rejects(archiveFiles(await makeArchive(undefined, [[header]]), NAME, VERSION));
});
test('archive rejects shadowed parent', async () => {
  const files = new Map([['Cargo.toml', MANIFEST], ['src', Buffer.from('a')], ['src/lib.rs', Buffer.from('b')]]);
  await assert.rejects(archiveFiles(await makeArchive(files), NAME, VERSION), /shadows a directory/);
});
test('archive rejects invalid gzip', async () => assert.rejects(archiveFiles(Buffer.from('not gzip'), NAME, VERSION)));
test('archive rejects truncated gzip', async () => assert.rejects(archiveFiles((await makeArchive()).subarray(0, -8), NAME, VERSION)));
test('archive compressed-size ceiling is enforced', async () => assert.rejects(archiveFiles(Buffer.alloc(MAX_CRATE + 1), NAME, VERSION), /32 MiB/));
test('gzip expansion including metadata is bounded', async () => {
  const compressed = gzipSync(Buffer.alloc(MAX_EXPANDED + 512));
  await assert.rejects(archiveFiles(compressed, NAME, VERSION), /invalid gzip\/tar/);
});
test('archive entry-count ceiling is enforced', async () => {
  const extra = Array.from({ length: MAX_FILES }, (_, i) => [{ name: `${root}/empty-${i}` }] as [Partial<Header> & { name: string }]);
  await assert.rejects(archiveFiles(await makeArchive(undefined, extra), NAME, VERSION), /too many entries/);
});
test('long Cargo archive paths are supported', async () => {
  const files = fixtureFiles(), path = 'src/' + 'a'.repeat(180) + '/lib.rs'; files.set(path, Buffer.from('long path'));
  assert.equal((await archiveFiles(await makeArchive(files), NAME, VERSION)).get(path)!.toString(), 'long path');
});
test('extended-header traversal is rejected', async () => {
  const extra: Partial<Header> & { name: string } = { name: `${root}/safe`, pax: { path: `${root}/../../escape` } };
  await assert.rejects(archiveFiles(await makeArchive(undefined, [[extra]]), NAME, VERSION), /unsafe path/);
});
test('archive requires Cargo.toml', async () => assert.rejects(archiveFiles(await makeArchive(new Map([['file', Buffer.from('x')]])), NAME, VERSION)));
test('extraction requires new directory', t => assert.throws(() => extractFiles(fixtureFiles(), temp(t))));
test('extraction creates regular files', async t => {
  const out = join(temp(t), 'unpacked'); extractFiles(await archiveFiles(await makeArchive(), NAME, VERSION), out);
  assert.deepEqual(readFileSync(join(out, 'Cargo.toml')), MANIFEST);
});

function meta(addition = '', manifest = MANIFEST.toString()) {
  return normalizedMetadata(new Map([['Cargo.toml', Buffer.from(manifest + addition)], ['README.md', Buffer.from('# Fixture')]]), NAME, VERSION);
}
test('metadata preserves identity', () => assert.equal(meta().vers, VERSION));
test('metadata includes README contents', () => assert.equal(meta().readme, '# Fixture'));
test('metadata translates renamed dependencies', () => {
  const d = meta('\n[dependencies.ser]\npackage="serde"\nversion="1"\nfeatures=["derive"]\ndefault-features=false\n').deps[0]!;
  assert.equal(d.name, 'serde'); assert.equal(d.explicit_name_in_toml, 'ser'); assert.equal(d.default_features, false);
});
test('metadata translates target build dependencies', () => {
  const d = meta('\n[target.\'cfg(windows)\'.build-dependencies]\ncc="1"\n').deps[0]!;
  assert.equal(d.target, 'cfg(windows)'); assert.equal(d.kind, 'build');
});
test('metadata translates dev dependencies', () => assert.equal(meta('\n[dev-dependencies]\nthing="1"\n').deps[0]!.kind, 'dev'));
test('metadata creates implicit optional feature', () => assert.deepEqual(meta('\n[dependencies]\nserde={version="1",optional=true}\n').features.serde, ['dep:serde']));
test('namespaced feature suppresses implicit optional feature', () => {
  const m = meta('\n[dependencies]\nserde={version="1",optional=true}\n', MANIFEST.toString().replace('default = []', 'default = []\nserialize = ["dep:serde"]'));
  assert.equal(Object.hasOwn(m.features, 'serde'), false);
});
test('weak dependency feature is preserved', () => {
  const m = meta('\n[dependencies]\nserde={version="1",optional=true}\n', MANIFEST.toString().replace('default = []', 'default = []\nstd = ["serde?/std"]'));
  assert.deepEqual(m.features.std, ['serde?/std']); assert.ok(m.features.serde);
});
for (const [name, spec] of [
  ['path', '{path="../thing",version="1"}'], ['git', '{git="https://example.test/x",version="1"}'],
  ['alternate registry', '{version="1",registry="private"}'], ['missing version', '{}'],
  ['invalid optional flag', '{version="1",optional="true"}'], ['invalid features', '{version="1",features=[3]}'],
]) test(`metadata rejects ${name} dependency`, () => assert.throws(() => meta(`\n[dependencies]\nthing=${spec}\n`)));
for (const [name, from, to] of [
  ['unresolved workspace', 'version = "1.2.3"', 'version.workspace=true'], ['publish false', 'edition =', 'publish=false\nedition ='],
  ['identity mismatch', '1.2.3', '1.2.4'], ['missing license file', 'license = "MIT"', 'license-file="LICENSE"'],
  ['unresolved description', 'description = "Protocol test fixture; not a published crate"', 'description.workspace=true'],
]) test(`metadata rejects ${name}`, () => assert.throws(() => meta('', MANIFEST.toString().replace(from!, to!))));
test('metadata rejects missing README', () => assert.throws(() => normalizedMetadata(new Map([['Cargo.toml', MANIFEST]]), NAME, VERSION)));
test('metadata accepts no README', () => assert.equal(meta('', MANIFEST.toString().replace('readme = "README.md"', 'readme = false')).readme, null));
test('metadata rejects invalid UTF-8 README', () => assert.throws(() => normalizedMetadata(new Map([['Cargo.toml', MANIFEST], ['README.md', Buffer.from([0xff])]]), NAME, VERSION)));
test('metadata safely preserves prototype-named features', () => {
  const m = meta('', MANIFEST.toString().replace('default = []', 'default = []\n__proto__ = []\nconstructor = []'));
  assert.ok(Object.hasOwn(m.features, '__proto__')); assert.deepEqual(m.features.constructor, []);
});

test('capsule round trip', async t => {
  const path = temp(t), { candidate, sha } = await makeCapsule(path);
  assert.deepEqual((await load(path, sha)).candidate, candidate);
});
test('wrong candidate digest fails', async t => { const path = temp(t); await makeCapsule(path); await assert.rejects(load(path, '0'.repeat(64))); });
for (const name of ['package.crate', 'smoke.rs', 'publish.json']) test(`changed ${name} fails`, async t => {
  const path = temp(t), { sha } = await makeCapsule(path); writeFileSync(join(path, name), 'changed'); await assert.rejects(load(path, sha));
});
for (const [key, value] of [['commit', 'f'.repeat(40)], ['repository', 'other/repo'], ['pipelineRef', 'f'.repeat(40)], ['package', 'other']]) {
  test(`capsule enforces ${key} binding`, async t => { const path = temp(t), { sha } = await makeCapsule(path); await assert.rejects(load(path, sha, { [key!]: value })); });
}
test('metadata cannot diverge even with updated hash', async t => {
  const path = temp(t), { candidate } = await makeCapsule(path);
  const changed = Buffer.from(readFileSync(join(path, 'publish.json'), 'utf8').replace('"vers":"1.2.3"', '"vers":"2.0.0"'));
  writeFileSync(join(path, 'publish.json'), changed); candidate.files['publish.json'] = { size: changed.length, sha256: digest(changed) };
  writeJson(join(path, 'candidate.json'), candidate); await assert.rejects(load(path, digest(canonical(candidate))), /metadata does not match/);
});
for (const name of ['candidate.json', 'package.crate']) test(`linked ${name} fails`, async t => {
  const path = temp(t), { sha } = await makeCapsule(path), target = join(path, name);
  const bytes = readFileSync(target); unlinkSync(target); writeFileSync(join(path, 'elsewhere'), bytes); symlinkSync(join(path, 'elsewhere'), target);
  await assert.rejects(load(path, sha));
});
for (const mutation of ['schema', 'pipeline', 'files', 'toolchain', 'consumer']) test(`capsule rejects invalid ${mutation}`, async t => {
  const path = temp(t), { candidate } = await makeCapsule(path);
  const raw = JSON.parse(JSON.stringify(candidate)) as Record<string, unknown>;
  raw[mutation] = mutation === 'schema' ? 'v999' : {};
  writeJson(join(path, 'candidate.json'), raw); await assert.rejects(load(path, digest(canonical(raw))));
});
for (const value of ['1.2.3', '0.1.0-rc.1']) test(`version accepts ${value}`, () => assert.equal(version(value), value));
for (const value of ['01.2.3', '1.2', 'v1.2.3', '1.2.3-01', '1.2.3+build', '1.2.3;echo unsafe', '1.2.3\n']) test(`version rejects ${JSON.stringify(value)}`, () => assert.throws(() => version(value)));
for (const value of ['../escape', '/etc/passwd', 'C:/path', 'a\\b', '.', 'a/../b', 'a\0b']) test(`relative path rejects ${JSON.stringify(value)}`, () => assert.throws(() => relative(value)));
test('canonical JSON sorts numeric and Unicode keys deterministically', () => {
  assert.equal(canonical({ '2': 'two', '10': 'ten', '\u{10000}': 'outside', '\ue000': 'inside' }).toString(), '{"10":"ten","2":"two","":"inside","𐀀":"outside"}\n');
});
