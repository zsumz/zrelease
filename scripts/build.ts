import { build } from 'esbuild';
import { isBuiltin } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { requireThat } from '../src/common.ts';

const root = resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const result = await build({ absWorkingDir: root, entryPoints: { zrelease: 'src/cli.ts', workspace: 'src/workspace-cli.ts', install: 'scripts/install.ts' },
  outdir: 'dist', outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', target: 'node24',
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
  legalComments: 'eof', sourcemap: false, metafile: true, write: false });
for (const output of Object.values(result.metafile.outputs)) {
  requireThat(output.imports.every(item => item.external && isBuiltin(item.path)), 'runtime bundle has an external dependency');
}
for (const file of result.outputFiles) {
  if (check) requireThat(existsSync(file.path) && readFileSync(file.path).equals(Buffer.from(file.contents)), `stale bundle: ${relative(root, file.path)}; run npm run build`);
  else { mkdirSync(dirname(file.path), { recursive: true }); writeFileSync(file.path, file.contents); }
}
// Retain every bundled dependency's complete license beside the committed runtime.
const packages = new Set(Object.keys(result.metafile.inputs).filter(p => p.startsWith('node_modules/')).map(p => p.split('/')[1]!));
const licenses: string[] = ['Third-party licenses for the bundled release helpers.\n'];
for (const pkg of [...packages].sort()) {
  const directory = join(root, 'node_modules', pkg);
  const metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as { version: string };
  const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].find(name => existsSync(join(directory, name)));
  requireThat(license, `missing license for ${pkg}`);
  licenses.push(`\n--- ${pkg}@${metadata.version} ---\n\n${readFileSync(join(directory, license), 'utf8')}`);
}
const path = join(root, 'dist/THIRD_PARTY_LICENSES.txt');
const text = licenses.join('');
if (check) requireThat(existsSync(path) && readFileSync(path, 'utf8') === text, 'stale bundled licenses; run npm run build');
else writeFileSync(path, text);
console.log(check ? 'Committed bundles match TypeScript source and locked dependencies.' : 'Built zrelease and installer bundles.');
