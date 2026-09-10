import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { MAX_CRATE } from './archive.ts';
import { canonical, digest, record, requireThat, utf8 } from './common.ts';
import { Http } from './http.ts';
import { indexPath, Registry } from './registry.ts';
import type { Candidate } from './types.ts';
import type { PublishMetadata } from './types.ts';
import { configureStaging, indexEntry } from './staging.ts';

export class State {
  versions = new Map<string, { metadata: Record<string, unknown>; crate: Buffer }>();
  puts = 0;
  failAfterAccept = false;
  hideReads = 0;
  yanked = false;
  tamperDownload = false;
  requests: [string, string, boolean][] = [];
}
export function decodeUpload(body: Buffer): { metadata: Record<string, unknown>; crate: Buffer } {
  requireThat(body.length >= 8, 'truncated upload');
  const length = body.readUInt32LE(0);
  requireThat(4 + length + 4 <= body.length, 'truncated publish metadata');
  const metadata = record(JSON.parse(utf8(body.subarray(4, 4 + length))));
  const size = body.readUInt32LE(4 + length);
  const crate = body.subarray(8 + length);
  requireThat(crate.length === size, 'invalid crate framing');
  return { metadata, crate };
}
export async function registryServer() {
  const state = new State();
  let base = '';
  const send = (response: ServerResponse, code: number, body: Buffer = Buffer.from('{}')): void => {
    response.writeHead(code, { 'Content-Length': body.length }); response.end(body);
  };
  const server = createServer(async (request, response) => {
    const path = request.url ?? '';
    state.requests.push([request.method ?? '', path, Boolean(request.headers.authorization)]);
    try {
      if (request.method === 'PUT') {
        if (path !== '/api/v1/crates/new' || request.headers.authorization !== 'rehearsal-only') { send(response, 403); return; }
        const length = Number(request.headers['content-length']);
        if (!(length > 0 && length <= MAX_CRATE + 4 * 1024 * 1024)) { send(response, 413); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
          size += (chunk as Buffer).length;
          requireThat(size <= length, 'oversized mock upload'); chunks.push(chunk as Buffer);
        }
        const { metadata, crate } = decodeUpload(Buffer.concat(chunks));
        requireThat(typeof metadata.name === 'string' && typeof metadata.vers === 'string', 'invalid upload identity');
        state.puts++;
        const key = `${metadata.name}@${metadata.vers}`;
        if (state.versions.has(key)) { send(response, 409); return; }
        state.versions.set(key, { metadata, crate });
        send(response, state.failAfterAccept ? 500 : 200, Buffer.from('{"warnings":{}}'));
        return;
      }
      if (request.method === 'GET') {
        if (state.hideReads > 0) { state.hideReads--; send(response, 404); return; }
        if (path === '/index/config.json') { send(response, 200, canonical({ dl: `${base}/crates/{crate}/{crate}-{version}.crate` })); return; }
        for (const { metadata, crate } of state.versions.values()) {
          const name = String(metadata.name), vers = String(metadata.vers);
          if (path === `/index/${indexPath(name)}`) {
            const entries = [...state.versions.values()].filter(v => v.metadata.name === name).map(v => {
              const entry = JSON.parse(utf8(indexEntry(v.metadata as PublishMetadata, v.crate)));
              return canonical({ ...entry, yanked: state.yanked });
            });
            send(response, 200, Buffer.concat(entries)); return;
          }
          if (path === `/crates/${name}/${name}-${vers}.crate`) {
            send(response, 200, state.tamperDownload ? Buffer.concat([crate, Buffer.from('tampered')]) : crate); return;
          }
        }
      }
      send(response, 404);
    } catch { if (!response.headersSent) send(response, 400); else response.destroy(); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  requireThat(address && typeof address !== 'string', 'missing mock address');
  base = `http://127.0.0.1:${address.port}`;
  return { state, registry: new Registry(new Http(true), { api: base, index: base + '/index', download: base + '/crates', timeout: 2_000, interval: 10 }),
    configure: (home: string) => configureStaging(home, `sparse+${base}/index/`),
    close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }) };
}
export async function rehearse(candidate: Candidate, crate: Buffer, metadata: Buffer): Promise<Record<string, unknown>> {
  const { registry, state, close } = await registryServer();
  try {
    state.failAfterAccept = true;
    const first = await registry.publish(candidate, crate, metadata, 'rehearsal-only');
    const second = await registry.publish(candidate, crate, metadata, 'rehearsal-only');
    requireThat(state.puts === 1, 'rehearsal unexpectedly repeated an upload');
    requireThat(!state.requests.some(([method, , authorized]) => method === 'GET' && authorized), 'credential leaked to a read endpoint');
    return { schema: 'zrelease.rehearsal/v1', state: 'rehearsed', published: false,
      candidate_sha256: digest(canonical(candidate)),
      package: candidate.package, source: candidate.source, crate_sha256: candidate.files['package.crate'].sha256,
      first_upload: first.upload, retry: second.upload, upload_count: state.puts,
      checks: ['exact payload upload', 'ambiguous response reconciliation', 'idempotent retry', 'anonymous registry reads'],
      note: 'Loopback protocol rehearsal; NOT crates.io, OIDC, or an end-to-end production qualification.' };
  } finally { await close(); }
}
