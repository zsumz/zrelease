import { createHash } from 'node:crypto';
import { appendFileSync, constants, closeSync, fstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative as pathRelative, resolve, sep } from 'node:path';

export class ReleaseError extends Error {}
export const SHA = /^[0-9a-f]{40}$/;
export const DIGEST = /^[0-9a-f]{64}$/;
export const NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
export const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const TOOLCHAIN = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ReleaseError(message);
}
export function record(value: unknown, what = 'object'): Record<string, unknown> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value), `invalid ${what}`);
  return value as Record<string, unknown>;
}
export function strings(value: unknown, what: string): string[] {
  requireThat(Array.isArray(value) && value.every(x => typeof x === 'string'), `invalid ${what}`);
  return value;
}
export function valid(pattern: RegExp, value: unknown, what: string): string {
  requireThat(typeof value === 'string' && pattern.exec(value)?.[0] === value, `invalid ${what}: ${JSON.stringify(value)}`);
  return value;
}
export function version(value: unknown): string {
  const result = valid(VERSION, value, 'version (build metadata is intentionally unsupported)');
  const prerelease = VERSION.exec(result)?.[4];
  requireThat(!prerelease?.split('.').some(x => /^0[0-9]+$/.test(x)), 'numeric prerelease identifiers cannot have leading zeroes');
  return result;
}
// Sort by Unicode code point, including keys outside the BMP.
function compareKeys(a: string, b: string): number {
  const left = Array.from(a, c => c.codePointAt(0)!);
  const right = Array.from(b, c => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i]! - right[i]!;
  }
  return left.length - right.length;
}
export function canonical(value: unknown): Buffer {
  function encode(item: unknown): string {
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return JSON.stringify(item);
    if (typeof item === 'number') {
      requireThat(Number.isFinite(item), 'non-finite JSON number');
      return JSON.stringify(item);
    }
    if (Array.isArray(item)) return `[${item.map(encode).join(',')}]`;
    const object = record(item, 'JSON value');
    return `{${Object.keys(object).sort(compareKeys).map(key => `${JSON.stringify(key)}:${encode(object[key])}`).join(',')}}`;
  }
  return Buffer.from(encode(value) + '\n');
}
export const digest = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');
export const utcNow = (): string => new Date().toISOString();
export function utf8(data: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data); }
  catch { throw new ReleaseError('invalid UTF-8'); }
}
export function readRegular(path: string, limit: number): Buffer {
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    requireThat(stat.isFile(), `missing or linked regular file: ${path}`);
    requireThat(stat.size <= limit, `file too large: ${path}`);
    const bytes = readFileSync(fd);
    requireThat(bytes.length <= limit, `file too large: ${path}`);
    return bytes;
  } finally { if (fd !== undefined) closeSync(fd); }
}
export function readJson(path: string): unknown {
  return JSON.parse(utf8(readRegular(path, 4 * 1024 * 1024))) as unknown;
}
export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path + '.tmp', canonical(value));
  renameSync(path + '.tmp', path);
}
export function relative(value: unknown): string {
  requireThat(typeof value === 'string' && value && !/[\\\0]/.test(value), 'invalid relative path');
  const parts = value.split('/').filter(p => p && p !== '.');
  requireThat(!value.startsWith('/') && parts.length && !parts.some(p => p === '..' || p.includes(':')), `unsafe path: ${JSON.stringify(value)}`);
  return parts.join('/');
}
export function inside(root: string, path: string): boolean {
  const rel = pathRelative(resolve(root), resolve(path));
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep);
}
export function within(root: string, value: string): string {
  const path = realpathSync(resolve(root, relative(value)));
  requireThat(inside(realpathSync(root), path), `path escapes root: ${JSON.stringify(value)}`);
  return path;
}
export function output(values: Record<string, unknown>): void {
  if (!process.env.GITHUB_OUTPUT) return;
  for (const [key, value] of Object.entries(values)) {
    requireThat(!/[\n\r]/.test(`${key}${String(value)}`), 'multiline workflow output rejected');
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value)}\n`);
  }
}
