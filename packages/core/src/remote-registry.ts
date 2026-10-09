import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import semver from "semver";
import * as tar from "tar";
import { stringify as stringifyYaml } from "yaml";
import {
  validateComponent,
  validatePlugin,
  validateProfile,
  type ComponentManifest,
  type PluginManifest,
  type ProfileManifest,
  type Status,
  type Target
} from "@sqliang/agent-ext-schemas";
import { assertSafeArchivePath, verifySha256 } from "./archive.js";
import {
  LocalRegistry,
  parseSpecifier,
  type ParsedSpecifier,
  type Registry,
  type RegistryItem,
  type RegistryKind,
  type Resolution
} from "./registry.js";

export const DEFAULT_CATALOG_URL = "https://github.com/sqliang/agent-extension-registry/releases/latest/download/catalog.json";
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_CATALOG_BYTES = 5 * 1024 * 1024;

interface Artifact {
  url: string;
  sha256: string;
}

interface CatalogRecord {
  kind: RegistryKind;
  artifact?: Artifact;
  [key: string]: unknown;
}

interface CatalogDocument {
  schemaVersion: 1;
  items: CatalogRecord[];
}

function ensureArtifact(value: unknown, id: string): Artifact {
  if (typeof value !== "object" || value === null) throw new Error(`Catalog component ${id} has no artifact`);
  const data = value as Record<string, unknown>;
  if (typeof data.url !== "string" || !/^https:\/\//.test(data.url)) throw new Error(`Catalog component ${id} has an invalid HTTPS artifact URL`);
  if (typeof data.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(data.sha256)) throw new Error(`Catalog component ${id} has an invalid artifact SHA-256`);
  return { url: data.url, sha256: data.sha256.toLowerCase() };
}

function withoutCatalogFields(record: CatalogRecord): Record<string, unknown> {
  const { artifact: _artifact, ...manifest } = record;
  return manifest;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { "user-agent": "@sqliang/agent-ext" }, redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  if (response.url && !response.url.startsWith("https://")) throw new Error(`Archive redirected to a non-HTTPS URL: ${response.url}`);
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_ARCHIVE_BYTES) throw new Error(`Archive exceeds ${MAX_ARCHIVE_BYTES} bytes: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error(`Archive exceeds ${MAX_ARCHIVE_BYTES} bytes: ${url}`);
  return bytes;
}

export class RemoteRegistry implements Registry {
  readonly root: string;
  private loaded = false;
  private readonly items = new Map<string, RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>>();
  private readonly artifacts = new Map<string, Artifact>();

  constructor(readonly catalogUrl: string, cacheRoot: string) {
    if (!/^https:\/\//.test(catalogUrl)) throw new Error("Remote catalog URL must use HTTPS");
    this.root = resolve(cacheRoot, "registry");
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    let document: CatalogDocument;
    try {
      const response = await fetch(this.catalogUrl, { headers: { "user-agent": "@sqliang/agent-ext" }, redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.url && !response.url.startsWith("https://")) throw new Error(`Catalog redirected to a non-HTTPS URL: ${response.url}`);
      const declared = Number(response.headers.get("content-length") ?? "0");
      if (declared > MAX_CATALOG_BYTES) throw new Error("Catalog is too large");
      const catalogBytes = new Uint8Array(await response.arrayBuffer());
      if (catalogBytes.byteLength > MAX_CATALOG_BYTES) throw new Error("Catalog is too large");
      document = JSON.parse(Buffer.from(catalogBytes).toString("utf8")) as CatalogDocument;
      await mkdir(dirname(this.root), { recursive: true });
      await writeFile(join(dirname(this.root), "catalog.json"), `${JSON.stringify(document, null, 2)}\n`);
    } catch (networkError) {
      try { document = JSON.parse(await readFile(join(dirname(this.root), "catalog.json"), "utf8")) as CatalogDocument; }
      catch { throw new Error(`Unable to load catalog and no offline cache is available: ${(networkError as Error).message}`); }
    }
    if (document.schemaVersion !== 1 || !Array.isArray(document.items)) throw new Error("Corrupted catalog: unsupported schema");
    for (const record of document.items) {
      if (!record || !["skill", "agent", "hook", "mcp", "plugin", "profile"].includes(record.kind)) throw new Error("Corrupted catalog: invalid kind");
      const raw = withoutCatalogFields(record);
      const validation = record.kind === "plugin" ? validatePlugin(raw) : record.kind === "profile" ? validateProfile(raw) : validateComponent(raw);
      if (!validation.ok || !validation.value) throw new Error(`Corrupted catalog item: ${validation.errors.join("; ")}`);
      const manifest = validation.value;
      const key = `${record.kind}:${manifest.id}`;
      if (this.items.has(key)) throw new Error(`Corrupted catalog: duplicate ${key}`);
      this.items.set(key, { kind: record.kind, manifest, directory: this.componentDirectory(record.kind, manifest.id) });
      if (record.kind !== "plugin" && record.kind !== "profile") this.artifacts.set(key, ensureArtifact(record.artifact, manifest.id));
    }
    this.loaded = true;
  }

  private componentDirectory(kind: RegistryKind, id: string): string {
    if (kind === "plugin") return join(this.root, "plugins", id);
    if (kind === "profile") return join(this.root, "profiles", id);
    const directory = kind === "skill" ? "skills" : kind === "mcp" ? "mcp" : `${kind}s`;
    return join(this.root, "components", directory, id);
  }

  async list(filters: { kind?: RegistryKind; status?: Status; target?: Target; includeDeprecated?: boolean } = {}): Promise<RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>[]> {
    await this.load();
    return [...this.items.values()].filter((item) => {
      if (filters.kind && item.kind !== filters.kind) return false;
      if (filters.status && item.manifest.status !== filters.status) return false;
      if (!filters.includeDeprecated && item.manifest.status === "deprecated") return false;
      if (filters.target && "targets" in item.manifest && !item.manifest.targets.includes(filters.target)) return false;
      return true;
    }).sort((a, b) => `${a.kind}:${a.manifest.id}`.localeCompare(`${b.kind}:${b.manifest.id}`));
  }

  async get(specifier: ParsedSpecifier): Promise<RegistryItem<ComponentManifest | PluginManifest | ProfileManifest>> {
    await this.load();
    const item = this.items.get(`${specifier.kind}:${specifier.id}`);
    if (!item) throw new Error(`Registry item not found: ${specifier.kind}:${specifier.id}`);
    if (!semver.satisfies(item.manifest.version, specifier.range)) throw new Error(`${specifier.kind}:${specifier.id}@${item.manifest.version} does not satisfy ${specifier.range}`);
    return item;
  }

  private async extractComponent(item: RegistryItem<ComponentManifest>): Promise<void> {
    const key = `${item.kind}:${item.manifest.id}`;
    const artifact = this.artifacts.get(key)!;
    const marker = join(item.directory, ".archive-sha256");
    try {
      if ((await readFile(marker, "utf8")).trim() === artifact.sha256) return;
    } catch {
      // Cache miss; download below.
    }
    const bytes = await fetchBytes(artifact.url);
    verifySha256(bytes, artifact.sha256);
    const temporaryRoot = `${item.directory}.tmp-${process.pid}-${Date.now()}`;
    const archivePath = `${temporaryRoot}.tar.gz`;
    await rm(temporaryRoot, { recursive: true, force: true });
    await mkdir(temporaryRoot, { recursive: true });
    await writeFile(archivePath, bytes);
    try {
      await tar.x({
        cwd: temporaryRoot,
        file: archivePath,
        strict: true,
        preservePaths: false,
        filter: (path, entry) => {
          assertSafeArchivePath(path);
          if ("type" in entry && ["SymbolicLink", "Link"].includes(entry.type)) throw new Error(`Archive links are not allowed: ${path}`);
          return true;
        }
      });
      await writeFile(join(temporaryRoot, ".archive-sha256"), `${artifact.sha256}\n`);
      await writeFile(join(temporaryRoot, ".release-url"), `${artifact.url}\n`);
      await rm(item.directory, { recursive: true, force: true });
      await mkdir(dirname(item.directory), { recursive: true });
      await rename(temporaryRoot, item.directory);
    } finally {
      await rm(archivePath, { force: true });
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  async resolve(value: string, targets: Target[]): Promise<Resolution> {
    await this.load();
    const requested = parseSpecifier(value);
    const requestedItem = await this.get(requested);
    const selectedComponents = new Map<string, RegistryItem<ComponentManifest>>();
    const selectedPlugins = new Map<string, RegistryItem<PluginManifest>>();
    const visiting = new Set<string>();
    const addComponent = async (id: string, range: string, optional = false): Promise<void> => {
      const item = [...this.items.values()].find((candidate) => candidate.kind !== "plugin" && candidate.kind !== "profile" && candidate.manifest.id === id) as RegistryItem<ComponentManifest> | undefined;
      if (!item || !semver.satisfies(item.manifest.version, range)) { if (optional) return; throw new Error(`Required component ${id}@${range} is unavailable`); }
      const key = `${item.kind}:${id}`;
      if (selectedComponents.has(key)) return;
      if (targets.some((target) => !item.manifest.targets.includes(target))) { if (optional) return; throw new Error(`Required component ${key} does not support all requested targets`); }
      if (visiting.has(key)) throw new Error(`Circular component dependency detected at ${key}`);
      visiting.add(key);
      for (const dependency of item.manifest.dependencies?.components ?? []) await addComponent(dependency.id, dependency.version, dependency.optional);
      visiting.delete(key);
      selectedComponents.set(key, item);
    };
    const addPlugin = async (id: string, range: string, optional = false): Promise<void> => {
      const item = this.items.get(`plugin:${id}`) as RegistryItem<PluginManifest> | undefined;
      if (!item || !semver.satisfies(item.manifest.version, range)) { if (optional) return; throw new Error(`Required plugin ${id}@${range} is unavailable`); }
      if (selectedPlugins.has(id)) return;
      for (const reference of item.manifest.components) await addComponent(reference.id, reference.version, reference.optional);
      selectedPlugins.set(id, item);
    };
    if (requested.kind === "plugin") await addPlugin(requested.id, requested.range);
    else if (requested.kind === "profile") {
      const profile = requestedItem as RegistryItem<ProfileManifest>;
      for (const reference of profile.manifest.plugins ?? []) await addPlugin(reference.id, reference.version, reference.optional);
      for (const reference of profile.manifest.components ?? []) await addComponent(reference.id, reference.version, reference.optional);
    } else await addComponent(requested.id, requested.range);

    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, "pnpm-workspace.yaml"), "packages: []\n");
    for (const component of selectedComponents.values()) await this.extractComponent(component);
    for (const plugin of selectedPlugins.values()) {
      await mkdir(plugin.directory, { recursive: true });
      await writeFile(join(plugin.directory, "plugin.yaml"), stringifyYaml(plugin.manifest));
    }
    if (requested.kind === "profile") {
      await mkdir(requestedItem.directory, { recursive: true });
      await writeFile(join(requestedItem.directory, "profile.yaml"), stringifyYaml(requestedItem.manifest));
    }
    return new LocalRegistry(this.root).resolve(value, targets);
  }
}
