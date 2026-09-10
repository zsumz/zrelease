import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { TestContext } from 'node:test';
export { makeArchive, makeCapsule, MANIFEST, NAME, VERSION, fixtureFiles } from './fixture.ts';
export const ROOT = resolve(import.meta.dirname, '..');
const tempRoot = join(ROOT, '.local/tmp');
mkdirSync(tempRoot, { recursive: true });
process.env.TMPDIR = tempRoot;
export function temp(t: TestContext): string {
  const path = mkdtempSync(join(tempRoot, 'test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
export function environment(t: TestContext, values: Record<string, string> = {}): void {
  const keys = new Set([...Object.keys(values), 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'PIPELINE_REF', 'GITHUB_OUTPUT',
    'GITHUB_STEP_SUMMARY', 'GITHUB_TOKEN', 'CARGO_REGISTRY_TOKEN', 'GITHUB_ACTIONS', 'GITHUB_EVENT_NAME', 'GITHUB_REF']);
  const before = new Map([...keys].map(key => [key, process.env[key]]));
  for (const key of keys) { delete process.env[key]; if (values[key] !== undefined) process.env[key] = values[key]; }
  t.after(() => { for (const [key, value] of before) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}
