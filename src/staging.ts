import { createServer } from 'node:http';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from './capsule.ts';
import type { Bindings, Capsule } from './capsule.ts';
import { canonical, digest, readRegular, record, requireThat, utf8 } from './common.ts';
import { Http, HttpError } from './http.ts';
import type { Transport } from './http.ts';
import { indexPath, Registry } from './registry.ts';
import type { PublishMetadata } from './types.ts';

export async function loadDependencies(directory: string, hashes: string[], bindings: Bindings): Promise<Capsule[]> {
  requireThat(new Set(hashes).size === hashes.length, 'duplicate dependency candidate');
  const entries = readdirSync(directory, { withFileTypes: true });
  // Single artifact downloads are flat; multiple artifacts retain one directory each.
  const flat = entries.every(entry => entry.isFile()) && entries.map(entry => entry.name).sort().join(',') ===
    'candidate.json,package.crate,publish.json,smoke.rs';
  const paths = flat ? [directory] : entries.map(entry => join(directory, entry.name));
  requireThat((flat || entries.every(entry => entry.isDirectory())) && paths.length === hashes.length, 'dependency artifacts differ from the release graph');
  const found = new Set<string>(), names = new Set<string>();
  const result: Capsule[] = [];
  for (const path of paths) {
    const sha = digest(readRegular(join(path, 'candidate.json'), 4 * 1024 * 1024));
    requireThat(hashes.includes(sha) && !found.has(sha), 'unexpected dependency candidate digest');
    const capsule = await load(path, sha, bindings);
    requireThat(!names.has(capsule.candidate.package.name), 'duplicate dependency crate');
    found.add(sha); names.add(capsule.candidate.package.name); result.push(capsule);
  }
  return result;
}

export function indexEntry(metadata: PublishMetadata, crate: Buffer): Buffer {
  return canonical({ name: metadata.name, vers: metadata.vers, cksum: digest(crate), yanked: false, v: 2,
    features: {}, features2: metadata.features, links: metadata.links ?? null, rust_version: metadata.rust_version ?? null,
    deps: metadata.deps.map(dep => ({ name: dep.explicit_name_in_toml ?? dep.name, package: dep.explicit_name_in_toml ? dep.name : null,
      req: dep.version_req, features: dep.features, optional: dep.optional, default_features: dep.default_features,
      target: dep.target, kind: dep.kind, registry: null })) });
}

export function configureStaging(home: string, index: string): void {
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, 'config.toml'), `[source.crates-io]\nreplace-with = "zrelease-staging"\n[source.zrelease-staging]\nregistry = "${index}"\n`);
}

/** Read-only crates.io overlay. Staged bytes replace only the exact selected versions. */
export async function stagingRegistry(initial: Capsule[] = [], upstream: Transport = new Http()) {
  const capsules = [...initial];
  let base = '';
  const server = createServer(async (request, response) => {
    const send = (status: number, data: Buffer) => { response.writeHead(status, { 'Content-Length': data.length }); response.end(data); };
    try {
      requireThat(request.method === 'GET' && !request.headers.authorization, 'staging registry is read-only and anonymous');
      const path = request.url ?? '';
      if (path === '/index/config.json') { send(200, canonical({ dl: `${base}/crates/{crate}/{crate}-{version}.crate` })); return; }
      const archive = /^\/crates\/([A-Za-z0-9_-]+)\/\1-([0-9A-Za-z.-]+)\.crate$/.exec(path);
      if (archive) {
        const local = capsules.find(c => c.candidate.package.name === archive[1] && c.candidate.package.version === archive[2]);
        send(200, local?.crate ?? await upstream.request('GET', 'https://static.crates.io' + path, { limit: 100 * 1024 * 1024 })); return;
      }
      requireThat(/^\/index\/(?:[a-z0-9_-]+\/){1,2}[a-z0-9_-]+$/.test(path), 'invalid index path');
      const locals = capsules.filter(c => path === '/index/' + indexPath(c.candidate.package.name));
      let bytes: Buffer = Buffer.alloc(0);
      try { bytes = await upstream.request('GET', 'https://index.crates.io' + path.slice(6), { limit: 16 * 1024 * 1024 }); }
      catch (error) { if (!(error instanceof HttpError && error.status === 404 && locals.length)) throw error; }
      const versions = new Set(locals.map(c => c.candidate.package.version));
      const entries = utf8(bytes).split(/\r?\n/).filter(Boolean).filter(line => !versions.has(String(record(JSON.parse(line)).vers)));
      send(200, Buffer.concat([Buffer.from(entries.length ? entries.join('\n') + '\n' : ''),
        ...locals.map(c => indexEntry(JSON.parse(utf8(c.metadata)) as PublishMetadata, c.crate))]));
    } catch (error) { send(error instanceof HttpError ? error.status : 400, Buffer.from('{}')); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); requireThat(address && typeof address !== 'string', 'missing staging registry address');
  base = `http://127.0.0.1:${address.port}`;
  return {
    add: (capsule: Capsule) => capsules.push(capsule),
    configure: (home: string) => configureStaging(home, `sparse+${base}/index/`),
    registry: new Registry(new Http(true), { index: base + '/index', download: base + '/crates', timeout: 2000, interval: 10 }),
    close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}
