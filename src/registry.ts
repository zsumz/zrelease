import { setTimeout as sleep } from 'node:timers/promises';
import { MAX_CRATE } from './archive.ts';
import { digest, NAME, record, ReleaseError, requireThat, utcNow, utf8, valid } from './common.ts';
import { Http, HttpError, TransportError } from './http.ts';
import type { Transport } from './http.ts';
import type { Candidate, RegistryObservation } from './types.ts';

export function indexPath(input: string): string {
  const name = input.toLowerCase();
  if (name.length <= 2) return `${name.length}/${name}`;
  if (name.length === 3) return `3/${name[0]}/${name}`;
  return `${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`;
}
export function publishBody(metadata: Buffer, crate: Buffer): Buffer {
  requireThat(metadata.length < 2 ** 32 && crate.length < 2 ** 32, 'registry framing overflow');
  const lengths = [Buffer.alloc(4), Buffer.alloc(4)];
  lengths[0]!.writeUInt32LE(metadata.length);
  lengths[1]!.writeUInt32LE(crate.length);
  return Buffer.concat([lengths[0]!, metadata, lengths[1]!, crate]);
}
export interface RegistryOptions { api?: string; index?: string; download?: string; timeout?: number; interval?: number }
export class Registry {
  readonly http: Transport;
  readonly api: string;
  readonly index: string;
  readonly download: string;
  timeout: number;
  interval: number;
  constructor(http: Transport = new Http(), options: RegistryOptions = {}) {
    this.http = http;
    this.api = options.api ?? 'https://crates.io';
    this.index = options.index ?? 'https://index.crates.io';
    this.download = options.download ?? 'https://static.crates.io/crates';
    this.timeout = options.timeout ?? 180_000;
    this.interval = options.interval ?? 5_000;
  }
  async lookup(name: string, version: string): Promise<Record<string, unknown> | null> {
    const records = await this.entries(name);
    if (!records) return null;
    const matches = records.filter(r => r.vers === version);
    requireThat(matches.length <= 1, 'registry index contains duplicate versions');
    return matches[0] ?? null;
  }
  private async entries(name: string): Promise<Record<string, unknown>[] | null> {
    valid(NAME, name, 'crate name');
    let body: Buffer;
    try { body = await this.http.request('GET', `${this.index}/${indexPath(name)}`, { limit: 16 * 1024 * 1024 }); }
    catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
    let records: Record<string, unknown>[];
    try { records = utf8(body).split(/\r?\n/).filter(x => x.trim()).map(line => record(JSON.parse(line))); }
    catch { throw new ReleaseError('registry returned an invalid sparse-index entry'); }
    requireThat(records.length > 0, 'registry returned an empty sparse-index entry');
    return records;
  }
  async requireExisting(names: string[]): Promise<void> {
    requireThat(names.length > 0, 'registry preflight requires selected crates');
    const missing: string[] = [];
    for (const name of new Set(names)) {
      const entries = await this.entries(name);
      if (entries === null) missing.push(name);
      else requireThat(entries.every(entry => typeof entry.name === 'string' && entry.name.toLowerCase() === name.toLowerCase()
        && typeof entry.vers === 'string'), `registry returned an invalid crate entry for ${name}`);
    }
    requireThat(missing.length === 0, `Unpublished crates require bootstrap: ${missing.join(', ')}. Publish each first version with an API token, then configure Trusted Publishing before retrying the entire release. No crates were uploaded by this preflight.`);
  }
  checkRecord(record: Record<string, unknown>, expected: string): void {
    requireThat(record.cksum === expected, 'immutable version conflict: registry checksum differs; choose a NEW version');
    requireThat(record.yanked === false, 'version is yanked; refusing to publish or mark it healthy');
  }
  async observe(name: string, version: string, expected: string): Promise<RegistryObservation> {
    const deadline = performance.now() + this.timeout;
    let last = 'version is not visible';
    for (;;) {
      try {
        const entry = await this.lookup(name, version);
        if (entry) {
          this.checkRecord(entry, expected);
          const data = await this.http.request('GET', `${this.download}/${name}/${name}-${version}.crate`, { limit: MAX_CRATE });
          requireThat(digest(data) === expected, 'downloaded registry bytes differ from the qualified crate');
          return { state: 'registry-verified', sha256: expected, bytes: data.length,
            version_url: `https://crates.io/crates/${name}/${version}`, observed_at: utcNow() };
        }
      } catch (error) {
        if (error instanceof HttpError && [404, 408, 429, 500, 502, 503, 504].includes(error.status)) last = error.message;
        else if (error instanceof TransportError) last = error.message;
        else throw error;
      }
      if (performance.now() >= deadline) throw new ReleaseError(`registry observation timed out (${last}); this does NOT prove the upload failed; rerun the SAME capsule`);
      await sleep(Math.min(this.interval, Math.max(0, deadline - performance.now())));
    }
  }
  async publish(candidate: Candidate, crate: Buffer, metadata: Buffer, token: string): Promise<RegistryObservation> {
    requireThat(token, 'missing crates.io credential');
    const { name, version } = candidate.package;
    const expected = digest(crate);
    const previous = await this.lookup(name, version);
    if (previous) {
      this.checkRecord(previous, expected);
      return { ...await this.observe(name, version, expected), upload: 'already-present-identical' };
    }
    let outcome: RegistryObservation['upload'] = 'submitted';
    // Exactly one PUT per invocation: a timeout or 5xx can follow a successful write.
    try {
      const raw = await this.http.request('PUT', `${this.api}/api/v1/crates/new`, {
        body: publishBody(metadata, crate), token, limit: 1024 * 1024,
      });
      try {
        const response = record(JSON.parse(utf8(raw)));
        if (response.errors && (!Array.isArray(response.errors) || response.errors.length > 0)) outcome = 'ambiguous-response-reconciled';
      } catch { outcome = 'ambiguous-response-reconciled'; }
    } catch (error) {
      if (error instanceof HttpError) {
        if ([401, 403].includes(error.status) || (error.status >= 400 && error.status < 500 && ![400, 408, 409, 422, 429].includes(error.status))) throw error;
      } else if (!(error instanceof TransportError)) throw error;
      outcome = 'ambiguous-response-reconciled';
    }
    return { ...await this.observe(name, version, expected), upload: outcome };
  }
}
