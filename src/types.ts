export interface PackageIdentity { name: string; version: string }
export interface SourceIdentity { repository: string; commit: string; ref: string }
export interface FileIdentity { sha256: string; size: number }
export type PayloadName = 'package.crate' | 'publish.json' | 'smoke.rs';
export interface Candidate {
  schema: 'zrelease.candidate/v1';
  release_plan_sha256?: string;
  created_at?: string;
  package: PackageIdentity;
  source: SourceIdentity;
  pipeline: { repository: 'zsumz/zrelease'; revision: string };
  toolchain: { requested: string; rustc: string; cargo: string };
  consumer: { features: string[]; default_features: boolean };
  qualification: { checks: { argv: string[]; exit_code: 0; scope?: string }[]; note?: string };
  files: Record<PayloadName, FileIdentity>;
}
export interface Dependency {
  name: string;
  version_req: string;
  features: string[];
  optional: boolean;
  default_features: boolean;
  target: string | null;
  kind: 'normal' | 'dev' | 'build';
  registry: null;
  explicit_name_in_toml: string | null;
}
export interface PublishMetadata extends Record<string, unknown> {
  name: string; vers: string; deps: Dependency[]; features: Record<string, string[]>;
}
export interface RegistryObservation {
  state: 'registry-verified'; sha256: string; bytes: number; version_url: string; observed_at: string;
  upload?: 'submitted' | 'already-present-identical' | 'ambiguous-response-reconciled';
}
export type DeploymentStatus = 'success' | 'failure' | 'error';
export type JobResult = 'success' | 'failure' | 'cancelled' | 'skipped';
export type Phase = 'consumer-verified' | 'rehearsed' | 'interrupted' | 'published-but-unverified'
  | 'delivery-unconfirmed' | 'rehearsal-failed' | 'missing-verification-evidence' | 'invalid-verification-evidence';
