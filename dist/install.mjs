import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);

// scripts/install.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename as basename2, dirname, join as join2, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";

// src/common.ts
var ReleaseError = class extends Error {
};
var SHA = /^[0-9a-f]{40}$/;
var NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
var VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
var TOOLCHAIN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
function requireThat(condition, message) {
  if (!condition) throw new ReleaseError(message);
}
function record(value, what = "object") {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), `invalid ${what}`);
  return value;
}
function strings(value, what) {
  requireThat(Array.isArray(value) && value.every((x) => typeof x === "string"), `invalid ${what}`);
  return value;
}
function valid(pattern, value, what) {
  requireThat(typeof value === "string" && pattern.exec(value)?.[0] === value, `invalid ${what}: ${JSON.stringify(value)}`);
  return value;
}
function version(value) {
  const result = valid(VERSION, value, "version (build metadata is intentionally unsupported)");
  const prerelease = VERSION.exec(result)?.[4];
  requireThat(!prerelease?.split(".").some((x) => /^0[0-9]+$/.test(x)), "numeric prerelease identifiers cannot have leading zeroes");
  return result;
}
function relative(value) {
  requireThat(typeof value === "string" && value && !/[\\\0]/.test(value), "invalid relative path");
  const parts = value.split("/").filter((p) => p && p !== ".");
  requireThat(!value.startsWith("/") && parts.length && !parts.some((p) => p === ".." || p.includes(":")), `unsafe path: ${JSON.stringify(value)}`);
  return parts.join("/");
}

// src/plan.ts
import { basename, join, relative as pathRelative } from "node:path";
function graph(value, selected) {
  const metadata = record(value, "Cargo metadata");
  const ids = new Set(strings(metadata.workspace_members, "workspace members"));
  requireThat(Array.isArray(metadata.packages), "invalid Cargo packages");
  const members = metadata.packages.map((p) => record(p)).filter((p) => ids.has(String(p.id)));
  const publishable = (p) => p.publish === null || Array.isArray(p.publish) && p.publish.length === 1 && p.publish[0] === "crates-io";
  const names = selected ?? members.filter(publishable).map((p) => String(p.name));
  requireThat(names.length > 0 && names.length <= 200 && new Set(names).size === names.length, "select 1\u2013200 distinct crates");
  const packages = names.map((name) => {
    valid(NAME, name, "crate name");
    const pkg = members.find((p) => p.name === name);
    requireThat(pkg && publishable(pkg), `${name} is not a publishable workspace member`);
    requireThat(Array.isArray(pkg.targets) && pkg.targets.some((t) => {
      const kinds = record(t).kind;
      return Array.isArray(kinds) && kinds.some((k) => ["lib", "rlib", "proc-macro"].includes(k));
    }), `${name}: only library crates are supported`);
    requireThat(Array.isArray(pkg.dependencies), "invalid package dependencies");
    const needs = /* @__PURE__ */ new Set();
    for (const raw of pkg.dependencies) {
      const dep = record(raw);
      const sibling = members.find((p) => p.name === dep.name && (dep.path ? pathRelative(String(dep.path), String(p.manifest_path)) === "Cargo.toml" : !dep.registry && (!dep.source || dep.source === "registry+https://github.com/rust-lang/crates.io-index")));
      if (sibling && names.includes(String(sibling.name))) needs.add(String(sibling.name));
    }
    return { name, version: version(pkg.version), needs: [...needs].sort() };
  });
  const sorted = [], active = /* @__PURE__ */ new Set(), done = /* @__PURE__ */ new Set();
  function visit(name) {
    requireThat(!active.has(name), `workspace dependency cycle involving ${name}`);
    if (done.has(name)) return;
    active.add(name);
    const pkg = packages.find((p) => p.name === name);
    for (const dep of pkg.needs) visit(dep);
    active.delete(name);
    done.add(name);
    sorted.push(pkg);
  }
  for (const name of [...names].sort()) visit(name);
  return sorted;
}

// scripts/install.ts
function render(sha, selected, toolchain, manifest = "Cargo.toml", workspace = false) {
  valid(SHA, sha, "pipeline commit SHA");
  valid(TOOLCHAIN, toolchain, "exact Rust toolchain");
  const members = typeof selected === "string" ? [{ name: selected, needs: [] }] : selected;
  requireThat(members.length > 0 && members.length <= 200 && new Set(members.map((p) => p.name)).size === members.length, "select 1\u2013200 distinct crates");
  for (const p of members) {
    valid(NAME, p.name, "crate name");
    for (const dep of p.needs) requireThat(members.some((p2) => p2.name === dep), "unknown crate dependency");
  }
  requireThat(basename2(relative(manifest)) === "Cargo.toml", "manifest path must end in Cargo.toml");
  valid(/^[A-Za-z0-9_./-]+$/, manifest, "manifest path (letters, digits, _, ., / and - only)");
  const id = (name) => "crate_" + members.findIndex((p) => p.name === name);
  function ancestors(name, active = /* @__PURE__ */ new Set()) {
    requireThat(!active.has(name), "workspace dependency cycle");
    const next = /* @__PURE__ */ new Set([...active, name]);
    return [...new Set(members.find((p) => p.name === name).needs.flatMap((dep) => [...ancestors(dep, next), dep]))];
  }
  const ordered = [...new Set(members.flatMap((p) => [...ancestors(p.name), p.name]))];
  const jobs = ordered.map((name, position) => {
    const p = members.find((p2) => p2.name === name);
    const deps = ancestors(p.name);
    const prerequisites = [.../* @__PURE__ */ new Set([...deps, ...ordered.slice(Math.max(0, position - 1), position)])];
    return `  ${id(p.name)}:
    name: ${p.name}
    needs: [plan${prerequisites.map((dep) => ", " + id(dep)).join("")}]
    permissions:
      contents: read
      id-token: write
      attestations: write
      deployments: write
    uses: zsumz/zrelease/.github/workflows/release.yml@${sha}
    with:
      package: '${p.name}'
      pipeline-ref: '${sha}'
      toolchain: '${toolchain}'
      manifest-path: '${manifest}'
      publish: \${{ inputs.publish }}
      plan-artifact-id: \${{ needs.plan.outputs.artifact-id }}
      plan-sha256: \${{ needs.plan.outputs.plan-sha256 }}
      approval-artifact-id: \${{ needs.plan.outputs.approval-artifact-id }}
` + (deps.length ? `      dependency-artifact-ids: '${deps.map((dep) => "${{ needs." + id(dep) + ".outputs.candidate-artifact-id }}").join(",")}'
      dependency-shas: '[${deps.map((dep) => '"${{ needs.' + id(dep) + '.outputs.candidate-sha256 }}"').join(",")}]'
` : "");
  }).join("");
  let text = readFileSync(join2(import.meta.dirname, "../templates/release.yml.in"), "utf8");
  for (const [key, value] of Object.entries({ SHA: sha, MEMBERS: JSON.stringify(members.map(({ name, needs }) => ({ name, needs }))), JOBS: jobs, WORKSPACE: String(workspace), TOOLCHAIN: toolchain, MANIFEST: manifest })) text = text.replaceAll(`@@${key}@@`, value);
  requireThat(!text.includes("@@"), "unresolved workflow template placeholder");
  return text;
}
function main(args = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({ args, options: {
      sha: { type: "string" },
      package: { type: "string", multiple: true },
      toolchain: { type: "string" },
      source: { type: "string" },
      workspace: { type: "boolean" },
      manifest: { type: "string", default: "Cargo.toml" },
      out: { type: "string" },
      help: { type: "boolean", short: "h" }
    } });
    if (values.help) {
      console.log("install --sha SHA --toolchain VERSION --out FILE (--package NAME | --source DIR --workspace) [--manifest Cargo.toml]\nRepeat --package to select several workspace members; use --source to discover their dependencies.");
      return 0;
    }
    requireThat(values.sha && values.toolchain && values.out && (values.package?.length || values.workspace), "--sha, --toolchain, --out and --package or --workspace are required");
    requireThat(!values.workspace || values.source && !values.package, "--workspace requires --source and cannot be combined with --package");
    requireThat(values.source || values.package?.length === 1, "multiple crates require --source for dependency discovery");
    let members = values.package?.[0] ?? "";
    if (values.source) {
      valid(TOOLCHAIN, values.toolchain, "exact Rust toolchain");
      const result = spawnSync(
        "cargo",
        ["+" + values.toolchain, "metadata", "--no-deps", "--locked", "--format-version", "1", "--manifest-path", resolve(values.source, relative(values.manifest))],
        { cwd: values.source, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
      );
      requireThat(result.status === 0, "cannot discover Cargo workspace: " + (result.error?.message ?? result.stderr));
      members = graph(JSON.parse(result.stdout), values.workspace ? void 0 : values.package).map(({ name, needs }) => ({ name, needs }));
    }
    const text = render(values.sha, members, values.toolchain, values.manifest, values.workspace);
    mkdirSync(dirname(values.out), { recursive: true });
    writeFileSync(values.out, text, { flag: "wx" });
    console.log(`Created ${values.out}. Rehearsal is the default; nothing was published.`);
    return 0;
  } catch (error) {
    console.error(`install: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
export {
  main,
  render
};
