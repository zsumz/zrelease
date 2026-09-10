import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { extract } from 'tar-stream';
import { NAME, ReleaseError, relative, requireThat, valid, version } from './common.ts';

export const MAX_CRATE = 32 * 1024 * 1024;
export const MAX_EXPANDED = 128 * 1024 * 1024;
export const MAX_FILES = 20_000;
export type ArchiveFiles = Map<string, Buffer>;

export async function archiveFiles(data: Buffer, name: string, vers: string): Promise<ArchiveFiles> {
  requireThat(data.length > 0 && data.length <= MAX_CRATE, 'crate exceeds the 32 MiB pipeline limit');
  const root = `${valid(NAME, name, 'package')}-${version(vers)}`;
  const files: ArchiveFiles = new Map();
  const seen = new Set<string>();
  let total = 0;
  let count = 0;
  try {
    // Bound the entire decompressed stream, including padding and extended headers.
    const tar = gunzipSync(data, { maxOutputLength: MAX_EXPANDED });
    await new Promise<void>((resolve, reject) => {
      const archive = extract();
      archive.on('error', reject);
      archive.on('finish', resolve);
      archive.on('entry', (header, stream, next) => {
        stream.on('error', reject);
        try {
          requireThat(++count <= MAX_FILES, 'archive has too many entries');
          const path = relative(header.name);
          const [first, ...parts] = path.split('/');
          requireThat(first === root, 'archive has an unexpected root directory');
          requireThat(!seen.has(path), `duplicate archive entry: ${path}`);
          seen.add(path);
          requireThat(header.type === 'directory' || header.type === 'file' || header.type === 'contiguous-file', 'archive links and special files are forbidden');
          const size = header.size ?? 0;
          total += size;
          requireThat(Number.isSafeInteger(size) && size >= 0 && total <= MAX_EXPANDED, 'expanded archive is too large');
          if (header.type === 'directory') {
            requireThat(size === 0, 'archive directory contains data');
            stream.on('end', next);
            stream.resume();
            return;
          }
          requireThat(parts.length > 0, 'archive root cannot be a file');
          const chunks: Buffer[] = [];
          let length = 0;
          stream.on('data', (chunk: unknown) => { const bytes = chunk as Buffer; length += bytes.length; chunks.push(bytes); });
          stream.on('end', () => {
            if (length !== size) { archive.destroy(new ReleaseError('truncated archive member')); return; }
            files.set(parts.join('/'), Buffer.concat(chunks));
            next();
          });
        } catch (error) { archive.destroy(error as Error); }
      });
      archive.end(tar);
    });
  } catch (error) {
    if (error instanceof ReleaseError) throw error;
    throw new ReleaseError('invalid gzip/tar crate archive');
  }
  requireThat(files.has('Cargo.toml'), 'crate does not contain Cargo.toml');
  for (const name of files.keys()) {
    const parts = name.split('/');
    while (parts.pop() && parts.length) requireThat(!files.has(parts.join('/')), 'archive file shadows a directory');
  }
  return files;
}

export function extractFiles(files: ArchiveFiles, destination: string): void {
  // Exclusive creation prevents reusing an extraction tree with pre-existing links.
  mkdirSync(dirname(destination), { recursive: true });
  mkdirSync(destination);
  for (const [name, content] of files) {
    const path = join(destination, relative(name));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, { flag: 'wx', mode: 0o644 });
  }
}
