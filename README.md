# zrelease

Rust library releases for GitHub Actions. One approval for a crate or workspace. Publish and verify in dependency order; stop on failure.

Experimental. Hosted publishing is untested. Linux only.

## Setup

From a pushed `zsumz/zrelease` checkout with Node.js 24 and the selected Rust toolchain:

```sh
node dist/install.mjs \
  --sha "$(git rev-parse HEAD)" \
  --source ../my-project --workspace \
  --toolchain 1.96.0 \
  --out ../my-project/.github/workflows/release.yml
```

Replace `--workspace` with `--package my-crate` for one crate. Repeat `--package` to select several. Workspace mode skips `publish = false`.

Commit the workflow and `Cargo.lock`. Make `plan` depend on your CI using `needs`. Regenerate when dependencies change. See [inputs](.github/workflows/release.yml) for options.

## Publish

Each crate must exist on crates.io. Configure Trusted Publishing for your repository, `release.yml`, and the `crates.io` environment.

Create two GitHub environments:

- `release`: required reviewers. Allow self-review if you start releases.
- `crates.io`: release tags only, **no required reviewers**.

Run **Actions → Release** with `publish: false` to rehearse, including unpublished siblings. No approval needed.

To publish, dispatch a tag with `publish: true`, review the plan, then **Review deployments → Approve and deploy** once.

Use `v<version>` for one crate or a `v`-prefixed tag for a workspace. The commit must be reachable from `main`; dependencies outside the release must already be published.

## Recovery

Rerun failed jobs in the same run. Keep the candidate artifacts; retries check registry checksums. Published crates are never automatically yanked. Artifacts expire after 90 days.

## Development

```sh
npm ci --ignore-scripts
npm run build && npm run verify
```

Commit updated `dist/` files.

Cargo fixtures: `npm run test:cargo` and `npm run test:workspace` (Rust 1.88.0; clean Git checkout).

## License

[MIT](LICENSE).
