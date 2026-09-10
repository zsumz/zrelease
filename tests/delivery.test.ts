import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { canonical, digest, ReleaseError } from '../src/common.ts';
import { checkResolution } from '../src/consumer.ts';
import { Deployments, terminalState } from '../src/deployment.ts';
import { Http, HttpError, TransportError } from '../src/http.ts';
import type { RequestOptions, Transport } from '../src/http.ts';
import { decodeUpload, registryServer, rehearse } from '../src/mock.ts';
import { indexPath, publishBody, Registry } from '../src/registry.ts';
import type { JobResult } from '../src/types.ts';
import { environment, makeCapsule, temp } from './support.ts';

test('registry wire framing preserves exact archive', async t => {
  const { metadata, crate } = await makeCapsule(temp(t));
  assert.deepEqual(decodeUpload(publishBody(metadata, crate)), { metadata: JSON.parse(metadata.toString()), crate });
});
for (const data of [Buffer.alloc(0), Buffer.alloc(7), Buffer.from([255, 255, 255, 255, 0, 0, 0, 0])]) {
  test(`reject truncated frame ${data.toString('hex')}`, () => assert.throws(() => decodeUpload(data)));
}
test('reject truncated crate frame', async t => { const { metadata, crate } = await makeCapsule(temp(t)); assert.throws(() => decodeUpload(publishBody(metadata, crate).subarray(0, -1))); });
test('sparse index paths', () => assert.deepEqual(['a', 'ab', 'abc', 'ABCD', 'serde'].map(indexPath), ['1/a', '2/ab', '3/a/abc', 'ab/cd/abcd', 'se/rd/serde']));
test('publish then identical retry sends one PUT', async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t));
  const { registry, state, close } = await registryServer(); t.after(close);
  assert.equal((await registry.publish(candidate, crate, metadata, 'rehearsal-only')).upload, 'submitted');
  assert.equal((await registry.publish(candidate, crate, metadata, 'rehearsal-only')).upload, 'already-present-identical');
  assert.equal(state.puts, 1);
  assert.deepEqual(state.versions.get('example-lib@1.2.3')!.crate, crate);
  assert.ok(state.requests.filter(([method]) => method === 'GET').every(([, , auth]) => !auth));
});
test('accepted upload followed by HTTP 500 reconciles without another write', async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t));
  const { registry, state, close } = await registryServer(); t.after(close); state.failAfterAccept = true;
  assert.equal((await registry.publish(candidate, crate, metadata, 'rehearsal-only')).upload, 'ambiguous-response-reconciled');
  assert.equal(state.puts, 1);
});
for (const failure of ['conflict', 'yanked', 'tampered']) test(`registry rejects ${failure}`, async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t));
  const { registry, state, close } = await registryServer(); t.after(close);
  state.versions.set('example-lib@1.2.3', { metadata: JSON.parse(metadata.toString()), crate: failure === 'conflict' ? Buffer.from('other') : crate });
  state.yanked = failure === 'yanked'; state.tamperDownload = failure === 'tampered';
  await assert.rejects(registry.publish(candidate, crate, metadata, 'rehearsal-only'), failure === 'conflict' ? /immutable version conflict/ : failure === 'yanked' ? /yanked/ : /downloaded registry bytes/);
  assert.equal(state.puts, 0);
});
test('observation timeout never implies rollback', async t => {
  const { crate } = await makeCapsule(temp(t)); const { registry, close } = await registryServer(); t.after(close); registry.timeout = 0;
  await assert.rejects(registry.observe('example-lib', '1.2.3', digest(crate)), /does NOT prove/);
});
test('authorization failure is not retried', async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t)); const { registry, state, close } = await registryServer(); t.after(close);
  await assert.rejects(registry.publish(candidate, crate, metadata, 'wrong'), HttpError); assert.equal(state.puts, 0);
  assert.equal(state.requests.filter(([method]) => method === 'PUT').length, 1);
});
test('missing token fails before transport', async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t));
  const http: Transport = { request: async () => { assert.fail('transport must not be called'); } };
  await assert.rejects(new Registry(http).publish(candidate, crate, metadata, ''), /missing/);
});
for (const [method, url, token] of [
  ['PUT', 'http://crates.io/api/v1/crates/new', 'secret'], ['PUT', 'https://evil.test/new', 'secret'],
  ['GET', 'https://static.crates.io/test', 'secret'], ['POST', 'https://index.crates.io/test', 'secret'],
  ['PUT', 'https://crates.io:444/new', 'secret'], ['PUT', 'https://user:pass@crates.io/new', 'secret'],
  ['PUT', 'https://crates.io/new#fragment', 'secret'], ['PUT', 'https://crates.io/new', 'bad\r\nvalue'],
]) test(`transport rejects ${method} ${url} ${token!.includes('\n') ? 'invalid credential' : ''}`, async () => assert.rejects(new Http().request(method!, url!, { token })));
test('test transport rejects non-loopback host', async () => assert.rejects(new Http(true).request('GET', 'http://localhost/test')));
test('HTTP redirects are rejected without following Location', async t => {
  let count = 0;
  const server = createServer((_request, response) => { count++; response.writeHead(302, { Location: '/elsewhere' }); response.end(); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.close(); server.closeAllConnections(); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  await assert.rejects(new Http(true).request('GET', `http://127.0.0.1:${address.port}/start`), HttpError);
  assert.equal(count, 1);
});
test('HTTP response limit is enforced', async t => {
  const server = createServer((_request, response) => response.end('too long'));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.close(); server.closeAllConnections(); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  await assert.rejects(new Http(true).request('GET', `http://127.0.0.1:${address.port}/`, { limit: 2 }), /size limit/);
});
test('demo asserts single upload and anonymous reads', async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t)); const result = await rehearse(candidate, crate, metadata);
  assert.equal(result.published, false); assert.equal(result.upload_count, 1);
});
test('eventual index visibility is observed', async t => {
  const { crate, metadata } = await makeCapsule(temp(t)); const { registry, state, close } = await registryServer(); t.after(close);
  state.versions.set('example-lib@1.2.3', { metadata: JSON.parse(metadata.toString()), crate }); state.hideReads = 2;
  assert.equal((await registry.observe('example-lib', '1.2.3', digest(crate))).state, 'registry-verified');
});
test('lost connection after an accepted PUT reconciles without retrying PUT', async t => {
  const { candidate, crate, metadata } = await makeCapsule(temp(t)); let puts = 0;
  const http: Transport = { request: async method => {
    if (method === 'PUT') { puts++; throw new TransportError('lost ACK'); }
    return Buffer.alloc(0);
  } };
  const registry = new Registry(http);
  t.mock.method(registry, 'lookup', async () => null);
  t.mock.method(registry, 'observe', async () => ({ state: 'registry-verified', sha256: digest(crate), bytes: crate.length }));
  assert.equal((await registry.publish(candidate, crate, metadata, 'fake')).upload, 'ambiguous-response-reconciled'); assert.equal(puts, 1);
});
test('duplicate index versions fail closed', async () => {
  const row = canonical({ vers: '1.2.3' }); const registry = new Registry({ request: async () => Buffer.concat([row, row]) });
  await assert.rejects(registry.lookup('example-lib', '1.2.3'), /duplicate versions/);
});
test('malformed index fails closed', async () => assert.rejects(new Registry({ request: async () => Buffer.from('invalid') }).lookup('example-lib', '1.2.3'), /invalid sparse-index/));

const states: [string, Record<string, JobResult>, boolean, string, string][] = [
  ['complete', { publish: 'success', verify: 'success' }, true, 'success', 'consumer-verified'],
  ['consumer failed', { publish: 'success', verify: 'failure' }, true, 'failure', 'published-but-unverified'],
  ['consumer skipped', { publish: 'success', verify: 'skipped' }, true, 'failure', 'published-but-unverified'],
  ['interrupted', { publish: 'cancelled', verify: 'skipped' }, true, 'error', 'interrupted'],
  ['unknown', { publish: 'failure' }, true, 'failure', 'delivery-unconfirmed'],
  ['rehearsal', { rehearse: 'success', publish: 'skipped' }, false, 'success', 'rehearsed'],
];
for (const [name, results, production, status, phase] of states) test(`deployment outcome: ${name}`, () => assert.deepEqual(terminalState(results, production), [status, phase]));
test('deployment never auto-merges or auto-inactivates library versions', async t => {
  environment(t); const { candidate, sha } = await makeCapsule(temp(t)); const calls: Record<string, unknown>[] = [];
  const http: Transport = { request: async (_method: string, _url: string, options?: RequestOptions) => { calls.push(JSON.parse(options!.body!.toString())); return Buffer.from('{"id":44}'); } };
  await new Deployments('zsumz/zrelease', 'test', http).begin(candidate, sha, 'https://github.com/zsumz/zrelease/actions/runs/1', true);
  assert.equal(calls[0]!.auto_merge, false); assert.deepEqual(calls[0]!.required_contexts, []); assert.equal(calls[0]!.production_environment, true);
  assert.equal(calls[1]!.auto_inactive, false); assert.equal(calls[1]!.state, 'in_progress');
});
function consumerMetadata(source: string | null = 'registry+https://github.com/rust-lang/crates.io-index', version = '1.2.3') {
  return { resolve: { root: 'root', nodes: [{ id: 'root', deps: [{ name: 'subject', pkg: 'dep' }] }] }, packages: [{ id: 'dep', name: 'example-lib', version, source }] };
}
test('consumer must resolve the exact registry package', () => checkResolution(consumerMetadata(), 'example-lib', '1.2.3'));
for (const source of [null, 'git+https://example.test/repo', 'registry+https://private.test/index']) test(`consumer rejects ${source}`, () => assert.throws(() => checkResolution(consumerMetadata(source), 'example-lib', '1.2.3'), ReleaseError));
test('consumer rejects version drift', () => assert.throws(() => checkResolution(consumerMetadata(undefined, '1.2.4'), 'example-lib', '1.2.3')));
test('consumer rejects same-named transitive dependency', () => {
  const metadata = consumerMetadata(); metadata.resolve.nodes[0]!.deps[0]!.name = 'other';
  assert.throws(() => checkResolution(metadata, 'example-lib', '1.2.3'));
});
