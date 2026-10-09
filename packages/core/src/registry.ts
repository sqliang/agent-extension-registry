import { readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import semver from "semver";
import {
  loadManifest,
  validateComponent,
  validatePlugin,
  validateProfile,
  type ComponentManifest,
  type PluginManifest,
  type ProfileManifest,
  type Status,
  type Target
} from "@sqliang/agent-ext-schemas";

export type RegistryKind = "skill" | "agent" | "hook" | "mcp" | "plugin" | "profile";

export interface RegistryItem<T> {
  kind: RegistryKind;
  manifest: T;
  directory: string;
}

export interface ParsedSpecifier {
  kind: RegistryKind;
  id: string;
  range: string;
}

export interface Resolution {
  requested: ParsedSpecifier;
  item: RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>;
  components: RegistryItem<ComponentManifest>[];
  plugins: RegistryItem<PluginManifest>[];
}

export interface Registry {
  readonly root: string;
  load(): Promise<void>;
  list(filters?: { kind?: RegistryKind; status?: Status; target?: Target; includeDeprecated?: boolean }): Promise<RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>[]>;
  get(specifier: ParsedSpecifier): Promise<RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>>;
  resolve(value: string, targets: Target[]): Promise<Resolution>;
}

const KIND_DIRECTORIES: Record<Exclude<RegistryKind, "plugin" | "profile">, string> = {
  skill: "skills",
  agent: "agents",
  hook: "hooks",
  mcp: "mcp"
};

async function childDirectories(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => join(path, entry.name)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function parseSpecifier(value: string): ParsedSpecifier {
  const match = /^(skill|agent|hook|mcp|plugin|profile):([a-z0-9]+(?:-[a-z0-9]+)*)(?:@(.+))?$/.exec(value);
  if (!match) throw new Error(`Invalid extension specifier: ${value}. Expected <kind:id>[@version-or-range].`);
  const range = match[3] ?? "*";
  if (!semver.validRange(range)) throw new Error(`Invalid SemVer range in ${value}`);
  return { kind: match[1] as RegistryKind, id: match[2]!, range };
}

export class LocalRegistry implements Registry {
  readonly root: string;
  private loaded = false;
  private readonly components = new Map<string, RegistryItem<ComponentManifest>>();
  private readonly plugins = new Map<string, RegistryItem<PluginManifest>>();
  private readonly profiles = new Map<string, RegistryItem<ProfileManifest>>();

  constructor(root: string) {
    this.root = resolve(root);
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    for (const [kind, directory] of Object.entries(KIND_DIRECTORIES) as [Exclude<RegistryKind, "plugin" | "profile">, string][]) {
      for (const componentDirectory of await childDirectories(join(this.root, "components", directory))) {
        const manifest = await loadManifest(join(componentDirectory, "component.yaml"), validateComponent);
        if (manifest.kind !== kind) throw new Error(`${componentDirectory}: manifest kind ${manifest.kind} does not match directory ${kind}`);
        const entryRelative = relative(componentDirectory, resolve(componentDirectory, manifest.entry));
        if (entryRelative.startsWith("..") || isAbsolute(entryRelative)) {
          throw new Error(`${componentDirectory}: entry escapes component directory`);
        }
        this.addUnique(this.components, `${manifest.kind}:${manifest.id}`, { kind: manifest.kind, manifest, directory: componentDirectory });
      }
    }
    for (const pluginDirectory of await childDirectories(join(this.root, "plugins"))) {
      const manifest = await loadManifest(join(pluginDirectory, "plugin.yaml"), validatePlugin);
      this.addUnique(this.plugins, manifest.id, { kind: "plugin", manifest, directory: pluginDirectory });
    }
    for (const profileDirectory of await childDirectories(join(this.root, "profiles"))) {
      const manifest = await loadManifest(join(profileDirectory, "profile.yaml"), validateProfile);
      this.addUnique(this.profiles, manifest.id, { kind: "profile", manifest, directory: profileDirectory });
    }
    this.loaded = true;
  }

  private addUnique<T>(map: Map<string, T>, key: string, item: T): void {
    if (map.has(key)) throw new Error(`Duplicate registry item: ${key}`);
    map.set(key, item);
  }

  async list(filters: { kind?: RegistryKind; status?: Status; target?: Target; includeDeprecated?: boolean } = {}): Promise<RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>[]> {
    await this.load();
    const all: RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>[] = [
      ...this.components.values(),
      ...this.plugins.values(),
      ...this.profiles.values()
    ];
    return all.filter((item) => {
      if (filters.kind && item.kind !== filters.kind) return false;
      if (filters.status && item.manifest.status !== filters.status) return false;
      if (!filters.includeDeprecated && item.manifest.status === "deprecated") return false;
      if (filters.target && "targets" in item.manifest && !item.manifest.targets.includes(filters.target)) return false;
      return true;
    }).sort((a, b) => `${a.kind}:${a.manifest.id}`.localeCompare(`${b.kind}:${b.manifest.id}`));
  }

  async get(specifier: ParsedSpecifier): Promise<RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>> {
    await this.load();
    const item = specifier.kind === "plugin"
      ? this.plugins.get(specifier.id)
      : specifier.kind === "profile"
        ? this.profiles.get(specifier.id)
        : this.components.get(`${specifier.kind}:${specifier.id}`);
    if (!item) throw new Error(`Registry item not found: ${specifier.kind}:${specifier.id}`);
    if (!semver.satisfies(item.manifest.version, specifier.range)) {
      throw new Error(`${specifier.kind}:${specifier.id}@${item.manifest.version} does not satisfy ${specifier.range}`);
    }
    return item;
  }

  async resolve(value: string, targets: Target[]): Promise<Resolution> {
    const requested = parseSpecifier(value);
    const item = await this.get(requested);
    const components = new Map<string, RegistryItem<ComponentManifest>>();
    const plugins = new Map<string, RegistryItem<PluginManifest>>();
    const visiting = new Set<string>();

    const addComponent = async (id: string, range: string, optional = false): Promise<void> => {
      const existing = [...this.components.values()].find((candidate) => candidate.manifest.id === id);
      if (!existing || !semver.satisfies(existing.manifest.version, range)) {
        if (optional) return;
        throw new Error(`Required component ${id}@${range} is unavailable`);
      }
      const key = `${existing.manifest.kind}:${id}`;
      if (components.has(key)) return;
      const unsupported = targets.filter((target) => !existing.manifest.targets.includes(target));
      if (unsupported.length) {
        if (optional) return;
        throw new Error(`Required component ${key} does not support: ${unsupported.join(", ")}`);
      }
      if (visiting.has(key)) throw new Error(`Circular component dependency detected at ${key}`);
      visiting.add(key);
      for (const dependency of existing.manifest.dependencies?.components ?? []) {
        await addComponent(dependency.id, dependency.version, dependency.optional);
      }
      visiting.delete(key);
      components.set(key, existing);
    };

    const addPlugin = async (id: string, range: string, optional = false): Promise<void> => {
      const plugin = this.plugins.get(id);
      if (!plugin || !semver.satisfies(plugin.manifest.version, range)) {
        if (optional) return;
        throw new Error(`Required plugin ${id}@${range} is unavailable`);
      }
      if (plugins.has(id)) return;
      if (visiting.has(`plugin:${id}`)) throw new Error(`Circular dependency detected at plugin:${id}`);
      visiting.add(`plugin:${id}`);
      for (const reference of plugin.manifest.components) await addComponent(reference.id, reference.version, reference.optional);
      visiting.delete(`plugin:${id}`);
      plugins.set(id, plugin);
    };

    if (item.kind === "plugin") await addPlugin(item.manifest.id, requested.range);
    else if (item.kind === "profile") {
      const profile = item as RegistryItem<ProfileManifest>;
      for (const reference of profile.manifest.plugins ?? []) await addPlugin(reference.id, reference.version, reference.optional);
      for (const reference of profile.manifest.components ?? []) await addComponent(reference.id, reference.version, reference.optional);
    } else {
      await addComponent(item.manifest.id, requested.range);
    }

    return { requested, item, components: [...components.values()], plugins: [...plugins.values()] };
  }
}

export async function findRegistryRoot(start: string): Promise<string> {
  let current = resolve(start);
  while (true) {
    try {
      const names = await readdir(current);
      if (names.includes("components") && names.includes("profiles") && names.includes("pnpm-workspace.yaml")) return current;
    } catch {
      // Continue toward the filesystem root.
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Unable to locate an Agent Extension Registry. Set AGENT_EXT_REGISTRY_ROOT.");
}
