/** Synthetic protocol data; never presented as a Cargo-qualified package. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pack } from 'tar-stream';
import type { Header } from 'tar-stream';
import { canonical, digest, writeJson } from '../src/common.ts';
import { SCHEMA } from '../src/capsule.ts';
import { normalizedMetadata } from '../src/metadata.ts';
import type { Candidate } from '../src/types.ts';

export const NAME = 'example-lib';
export const VERSION = '1.2.3';
export const MANIFEST = Buffer.from('[package]\nname = "example-lib"\nversion = "1.2.3"\nedition = "2021"\nlicense = "MIT"\ndescription = "Protocol test fixture; not a published crate"\nreadme = "README.md"\n\n[features]\ndefault = []\n');
export const fixtureFiles = (): Map<string, Buffer> => new Map([
  ['Cargo.toml', MANIFEST], ['README.md', Buffer.from('# Fixture\n')], ['src/lib.rs', Buffer.from('pub fn answer() -> u32 { 44 }\n')],
]);
export async function makeArchive(files = fixtureFiles(), extra: [Partial<Header> & { name: string }, Buffer?][] = []): Promise<Buffer> {
  const archive = pack();
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    archive.on('data', (chunk: unknown) => chunks.push(chunk as Buffer));
    archive.on('error', reject); archive.on('end', () => resolve(gzipSync(Buffer.concat(chunks))));
  });
  for (const [name, data] of files) archive.entry({ name: `${NAME}-${VERSION}/${name}`, mode: 0o644, mtime: new Date(0) }, data);
  for (const [header, data] of extra) archive.entry({ mtime: new Date(0), ...header }, data ?? Buffer.alloc(0));
  archive.finalize();
  return finished;
}
export async function makeCapsule(directory: string): Promise<{ candidate: Candidate; crate: Buffer; metadata: Buffer; sha: string }> {
  const files = fixtureFiles();
  const crate = await makeArchive(files);
  const metadata = canonical(normalizedMetadata(files, NAME, VERSION));
  const payloads = { 'package.crate': crate, 'publish.json': metadata, 'smoke.rs': Buffer.from('extern crate subject; fn main() {}\n') };
  mkdirSync(directory, { recursive: true });
  for (const [name, data] of Object.entries(payloads)) writeFileSync(join(directory, name), data);
  const candidate: Candidate = { schema: SCHEMA, package: { name: NAME, version: VERSION },
    source: { repository: 'zsumz/zrelease', commit: 'a'.repeat(40), ref: 'refs/tags/v1.2.3' },
    pipeline: { repository: 'zsumz/zrelease', revision: 'b'.repeat(40) },
    toolchain: { requested: '1.88.0', rustc: 'NOT RUN: synthetic protocol fixture', cargo: 'NOT RUN' },
    consumer: { features: [], default_features: true }, qualification: { checks: [], note: 'Synthetic protocol test, not Cargo qualification' },
    files: Object.fromEntries(Object.entries(payloads).map(([key, data]) => [key, { sha256: digest(data), size: data.length }])) as Candidate['files'] };
  writeJson(join(directory, 'candidate.json'), candidate);
  return { candidate, crate, metadata, sha: digest(canonical(candidate)) };
}
