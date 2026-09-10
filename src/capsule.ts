import { join } from 'node:path';
import { archiveFiles, MAX_CRATE } from './archive.ts';
import { normalizedMetadata } from './metadata.ts';
import { canonical, DIGEST, digest, NAME, readRegular, record, REPO, requireThat, SHA, strings, TOOLCHAIN, utf8, valid, version } from './common.ts';
import type { Candidate, PayloadName } from './types.ts';

export const SCHEMA = 'zrelease.candidate/v1';
export interface Bindings { repository?: string; commit?: string; package?: string; pipelineRef?: string }
export interface Capsule { candidate: Candidate; crate: Buffer; metadata: Buffer; smoke: Buffer }

export async function load(directory: string, expected: string, bindings: Bindings = {}): Promise<Capsule> {
  valid(DIGEST, expected, 'candidate SHA-256');
  const bytes = readRegular(join(directory, 'candidate.json'), 4 * 1024 * 1024);
  requireThat(digest(bytes) === expected, 'candidate digest mismatch');
  const candidate = record(JSON.parse(utf8(bytes)), 'candidate');
  requireThat(candidate.schema === SCHEMA, 'unsupported candidate schema');
  const ident = record(candidate.package, 'package');
  const name = valid(NAME, ident.name, 'package');
  const vers = version(ident.version);
  const source = record(candidate.source, 'source');
  valid(REPO, source.repository, 'source repository');
  valid(SHA, source.commit, 'source commit');
  requireThat(typeof source.ref === 'string', 'missing source ref');
  const pipeline = record(candidate.pipeline, 'pipeline');
  valid(SHA, pipeline.revision, 'pipeline revision');
  requireThat(pipeline.repository === 'zsumz/zrelease', 'unexpected pipeline repository');
  for (const [want, actual, field] of [
    [bindings.repository, source.repository, 'source repository'], [bindings.commit, source.commit, 'source commit'],
    [bindings.package, name, 'package'], [bindings.pipelineRef, pipeline.revision, 'pipeline revision'],
  ]) requireThat(want === undefined || want === actual, `${field} binding mismatch`);
  const toolchain = record(candidate.toolchain, 'toolchain');
  valid(TOOLCHAIN, toolchain.requested, 'pinned Rust toolchain');
  requireThat(typeof toolchain.rustc === 'string' && typeof toolchain.cargo === 'string', 'invalid recorded toolchain');
  const consumer = record(candidate.consumer, 'consumer');
  strings(consumer.features, 'consumer features');
  requireThat(typeof consumer.default_features === 'boolean', 'invalid consumer default-features');
  const qualification = record(candidate.qualification, 'qualification');
  requireThat(Array.isArray(qualification.checks), 'invalid qualification checks');
  for (const check of qualification.checks) {
    const item = record(check, 'qualification check');
    strings(item.argv, 'qualification argv');
    requireThat(item.exit_code === 0, 'unsuccessful qualification check');
  }
  const manifest = record(candidate.files, 'capsule file manifest');
  requireThat(Object.keys(manifest).sort().join(',') === 'package.crate,publish.json,smoke.rs', 'unexpected capsule file manifest');
  const payloads = {} as Record<PayloadName, Buffer>;
  for (const filename of ['package.crate', 'publish.json', 'smoke.rs'] as const) {
    const entry = record(manifest[filename], 'file identity');
    const data = readRegular(join(directory, filename), MAX_CRATE);
    requireThat(entry.size === data.length && entry.sha256 === digest(data), `digest mismatch: ${filename}`);
    payloads[filename] = data;
  }
  const files = await archiveFiles(payloads['package.crate'], name, vers);
  requireThat(canonical(normalizedMetadata(files, name, vers)).equals(payloads['publish.json']), 'publish metadata does not match the packaged manifest');
  return { candidate: candidate as unknown as Candidate, crate: payloads['package.crate'], metadata: payloads['publish.json'], smoke: payloads['smoke.rs'] };
}
