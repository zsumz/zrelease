import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReleaseError, requireThat } from './common.ts';

export async function run(args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number }): Promise<string> {
  const [command, ...rest] = args;
  requireThat(command, 'missing command');
  console.log('+ ' + args.join(' '));
  return new Promise((resolve, reject) => {
    const child = spawn(command, rest, { cwd: options.cwd, env: options.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let total = 0;
    let failure: Error | undefined;
    const timer = setTimeout(() => { failure = new ReleaseError(`command timed out: ${command}`); child.kill('SIGKILL'); }, options.timeout ?? 1_200_000);
    child.stdout.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > 64 * 1024 * 1024) { failure = new ReleaseError('command output exceeded 64 MiB'); child.kill('SIGKILL'); }
      else chunks.push(chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
    child.on('error', error => { failure = new ReleaseError(`cannot complete ${command}: ${error.message}`); });
    child.on('close', code => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) reject(new ReleaseError(`command failed (${code}): ${args.join(' ')}`));
      else resolve(Buffer.concat(chunks).toString('utf8').trim());
    });
  });
}
export function cargoEnvironment(home: string, target: string): NodeJS.ProcessEnv {
  const keep = new Set(['PATH', 'HOME', 'USER', 'TMPDIR', 'TEMP', 'TMP', 'SYSTEMROOT', 'RUSTUP_HOME', 'SSL_CERT_FILE', 'SSL_CERT_DIR']);
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => keep.has(key)));
  Object.assign(env, { CARGO_HOME: home, CARGO_TARGET_DIR: target, CARGO_TERM_COLOR: 'never', CARGO_REGISTRIES_CRATES_IO_PROTOCOL: 'sparse' });
  mkdirSync(home, { recursive: true });
  return env;
}
export async function temporary<T>(prefix: string, action: (path: string) => Promise<T>): Promise<T> {
  const root = mkdtempSync(join(tmpdir(), prefix));
  try { return await action(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
