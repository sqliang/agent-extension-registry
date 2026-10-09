import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import semver from "semver";
import { parse as parseYaml } from "yaml";

export const COMPONENT_KINDS = ["skill", "agent", "hook", "mcp"] as const;
export const STATUSES = ["experimental", "beta", "stable", "deprecated"] as const;
export const TARGETS = ["codex", "claude", "cursor"] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];
export type Status = (typeof STATUSES)[number];
export type Target = (typeof TARGETS)[number];
export type Invocation = "automatic" | "explicit";

export interface SourceFile {
  relativePath: string;
  content: Uint8Array;
}

export interface ProjectedFile extends SourceFile {
  destination: string;
}

export interface ComponentDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface ExternalDependency {
  command: string;
  required: boolean;
  description: string;
  install?: Partial<Record<"darwin" | "linux" | "win32", string>>;
}

export interface ComponentManifest {
  schemaVersion: 1;
  id: string;
  kind: ComponentKind;
  version: string;
  status: Status;
  description: string;
  entry: string;
  invocation: Invocation;
  targets: Target[];
  dependencies?: {
    components?: ComponentDependency[];
    external?: ExternalDependency[];
  };
}

export interface BundleReference {
  id: string;
  version: string;
  optional?: boolean;
}

export interface BundleManifest {
  schemaVersion: 1;
  id: string;
  version: string;
  status: Status;
  description: string;
  components?: BundleReference[];
  plugins?: BundleReference[];
}

export interface PluginManifest extends BundleManifest {
  components: BundleReference[];
}

export interface ProfileManifest extends BundleManifest {
  components?: BundleReference[];
  plugins?: BundleReference[];
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

function record(value: unknown, label: string, errors: string[]): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return undefined;
  }
  return value as Record<string, unknown>;
}

function requiredString(source: Record<string, unknown>, key: string, errors: string[]): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${key} must be a non-empty string`);
    return "";
  }
  return value;
}

function enumValue<T extends string>(source: Record<string, unknown>, key: string, values: readonly T[], errors: string[]): T {
  const value = requiredString(source, key, errors);
  if (!values.includes(value as T)) {
    errors.push(`${key} must be one of: ${values.join(", ")}`);
  }
  return value as T;
}

function version(value: string, label: string, errors: string[], range = false): void {
  if (value && !(range ? semver.validRange(value) : semver.valid(value))) {
    errors.push(`${label} must be a valid ${range ? "SemVer range" : "SemVer version"}`);
  }
}

function references(value: unknown, label: string, errors: string[]): BundleReference[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  return value.map((item, index) => {
    const data = record(item, `${label}[${index}]`, errors) ?? {};
    const id = requiredString(data, "id", errors);
    const range = requiredString(data, "version", errors);
    version(range, `${label}[${index}].version`, errors, true);
    if (data.optional !== undefined && typeof data.optional !== "boolean") {
      errors.push(`${label}[${index}].optional must be a boolean`);
    }
    return { id, version: range, optional: data.optional === true };
  });
}

export function validateComponent(value: unknown): ValidationResult<ComponentManifest> {
  const errors: string[] = [];
  const data = record(value, "component", errors);
  if (!data) return { ok: false, errors };
  if (data.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  const id = requiredString(data, "id", errors);
  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) errors.push("id must be kebab-case");
  const kind = enumValue(data, "kind", COMPONENT_KINDS, errors);
  const componentVersion = requiredString(data, "version", errors);
  version(componentVersion, "version", errors);
  const status = enumValue(data, "status", STATUSES, errors);
  const description = requiredString(data, "description", errors);
  const entry = requiredString(data, "entry", errors);
  const invocation = enumValue(data, "invocation", ["automatic", "explicit"] as const, errors);
  const rawTargets = data.targets;
  const targets: Target[] = [];
  if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
    errors.push("targets must be a non-empty array");
  } else {
    for (const target of rawTargets) {
      if (typeof target !== "string" || !TARGETS.includes(target as Target)) errors.push(`unsupported target: ${String(target)}`);
      else if (!targets.includes(target as Target)) targets.push(target as Target);
    }
  }

  const rawDependencies = data.dependencies === undefined ? undefined : record(data.dependencies, "dependencies", errors);
  const componentDependencies = references(rawDependencies?.components, "dependencies.components", errors);
  const external: ExternalDependency[] = [];
  if (rawDependencies?.external !== undefined) {
    if (!Array.isArray(rawDependencies.external)) errors.push("dependencies.external must be an array");
    else for (const [index, item] of rawDependencies.external.entries()) {
      const dep = record(item, `dependencies.external[${index}]`, errors) ?? {};
      const command = requiredString(dep, "command", errors);
      const depDescription = requiredString(dep, "description", errors);
      if (typeof dep.required !== "boolean") errors.push(`dependencies.external[${index}].required must be a boolean`);
      external.push({ command, required: dep.required === true, description: depDescription });
    }
  }

  const manifest: ComponentManifest = {
    schemaVersion: 1,
    id,
    kind,
    version: componentVersion,
    status,
    description,
    entry,
    invocation,
    targets,
    dependencies: componentDependencies.length || external.length ? { components: componentDependencies, external } : undefined
  };
  return { ok: errors.length === 0, value: manifest, errors };
}

function validateBundle(value: unknown, type: "plugin" | "profile"): ValidationResult<PluginManifest | ProfileManifest> {
  const errors: string[] = [];
  const data = record(value, type, errors);
  if (!data) return { ok: false, errors };
  if (data.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  const id = requiredString(data, "id", errors);
  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) errors.push("id must be kebab-case");
  const bundleVersion = requiredString(data, "version", errors);
  version(bundleVersion, "version", errors);
  const status = enumValue(data, "status", STATUSES, errors);
  const description = requiredString(data, "description", errors);
  const components = references(data.components, "components", errors);
  const plugins = references(data.plugins, "plugins", errors);
  if (type === "plugin" && components.length === 0) errors.push("plugin components must not be empty");
  if (type === "profile" && components.length === 0 && plugins.length === 0) errors.push("profile must reference at least one component or plugin");
  const base = { schemaVersion: 1 as const, id, version: bundleVersion, status, description };
  const result = type === "plugin" ? { ...base, components } : { ...base, components, plugins };
  return { ok: errors.length === 0, value: result, errors };
}

export const validatePlugin = (value: unknown): ValidationResult<PluginManifest> => validateBundle(value, "plugin") as ValidationResult<PluginManifest>;
export const validateProfile = (value: unknown): ValidationResult<ProfileManifest> => validateBundle(value, "profile") as ValidationResult<ProfileManifest>;

export async function loadManifest<T>(path: string, validator: (value: unknown) => ValidationResult<T>): Promise<T> {
  if (![".yaml", ".yml", ".json"].includes(extname(path))) throw new Error(`Unsupported manifest format: ${path}`);
  const text = await readFile(path, "utf8");
  const raw = extname(path) === ".json" ? JSON.parse(text) : parseYaml(text);
  const result = validator(raw);
  if (!result.ok || !result.value) throw new Error(`${path}:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  return result.value;
}
