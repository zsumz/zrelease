import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { requireThat } from '../src/common.ts';
import { run } from '../src/process.ts';

/** Keep generated evidence outside a clean checkout of the exact tested commit. */
export async function fixtureSource<T>(repository: string, local: string, action: (source: string, commit: string) => Promise<T>): Promise<T> {
  const commit = await run(['git', 'rev-parse', 'HEAD'], { cwd: repository });
  requireThat(!await run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd: repository }), 'Cargo fixtures need a clean committed checkout');
  const source = mkdtempSync(join(local, 'fixture-source-'));
  await run(['git', 'worktree', 'add', '--detach', source, commit], { cwd: repository });
  try { return await action(source, commit); }
  finally { await run(['git', 'worktree', 'remove', '--force', source], { cwd: repository }); }
}
