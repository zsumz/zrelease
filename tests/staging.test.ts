import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { load } from '../src/capsule.ts';
import { canonical, digest } from '../src/common.ts';
import { Http, HttpError } from '../src/http.ts';
import { indexEntry, loadDependencies, stagingRegistry } from '../src/staging.ts';
import type { PublishMetadata } from '../src/types.ts';
import { makeCapsule, temp } from './support.ts';

test('dependency artifacts require the expected digest and source context', async t => {
  const root = temp(t), path = join(root, 'artifact');
  const { sha, candidate } = await makeCapsule(path);
  assert.equal((await loadDependencies(root, [sha], { commit: candidate.source.commit }))[0]!.candidate.package.name, 'example-lib');
  await assert.rejects(loadDependencies(root, ['0'.repeat(64)], {}), /digest/);
  await assert.rejects(loadDependencies(root, [sha, sha], {}), /duplicate/);
  await assert.rejects(loadDependencies(root, [sha], { commit: 'c'.repeat(40) }), /binding/);
  writeFileSync(join(path, 'package.crate'), 'tampered');
  await assert.rejects(loadDependencies(root, [sha], {}), /digest/);
});
test('index conversion preserves aliases, build dependencies, features and targets', () => {
  const metadata: PublishMetadata = { name: 'facade', vers: '1.0.0', features: { extra: ['dep:engine'] }, deps: [{
    name: 'base', explicit_name_in_toml: 'engine', kind: 'build', version_req: '=0.4.0', features: ['extra'], optional: true,
    default_features: false, target: 'cfg(unix)', registry: null,
  }] };
  const entry = JSON.parse(indexEntry(metadata, Buffer.from('bytes')).toString());
  assert.equal(entry.v, 2); assert.deepEqual(entry.features2, metadata.features);
  assert.deepEqual(entry.deps, [{ name: 'engine', package: 'base', req: '=0.4.0', features: ['extra'], optional: true, default_features: false,
    kind: 'build', target: 'cfg(unix)', registry: null }]);
});
test('staging overlays only the selected version and never sends credentials upstream', async t => {
  const path = temp(t), { sha, crate } = await makeCapsule(path), capsule = await load(path, sha);
  const requests: string[] = [];
  const stage = await stagingRegistry([capsule], { request: async (method, url, options) => {
    assert.equal(method, 'GET'); assert.equal(options?.token, undefined); requests.push(url);
    return Buffer.concat([canonical({ name: 'example-lib', vers: '1.0.0', cksum: 'older' }), canonical({ name: 'example-lib', vers: '1.2.3', cksum: 'public' })]);
  } });
  t.after(stage.close);
  const http = new Http(true);
  const entries = (await http.request('GET', stage.registry.index + '/ex/am/example-lib')).toString().trim().split('\n').map(line => JSON.parse(line));
  assert.equal(entries.length, 2); assert.equal(entries[0].vers, '1.0.0'); assert.equal(entries[1].cksum, digest(crate));
  assert.deepEqual(await http.request('GET', stage.registry.download + '/example-lib/example-lib-1.2.3.crate'), crate);
  assert.equal(requests.length, 1);
  await assert.rejects(http.request('PUT', stage.registry.index + '/ex/am/example-lib', { token: 'do-not-forward' }), /HTTP 400/);
  assert.equal(requests.length, 1);
  stage.configure(join(path, 'cargo-home'));
  assert.match(readFileSync(join(path, 'cargo-home/config.toml'), 'utf8'), /source.crates-io/);
});
test('unpublished staged dependencies are served when crates.io returns 404', async t => {
  const path = temp(t), { sha } = await makeCapsule(path), capsule = await load(path, sha);
  const stage = await stagingRegistry([capsule], { request: async (method, url) => { throw new HttpError(404, method, url); } });
  t.after(stage.close);
  const observed = await stage.registry.observe('example-lib', '1.2.3', capsule.candidate.files['package.crate'].sha256);
  assert.equal(observed.state, 'registry-verified');
});
