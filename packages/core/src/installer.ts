import { randomUUID } from "node:crypto";
import { access, copyFile, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { project as projectClaude } from "@sqliang/agent-ext-adapter-claude";
import { project as projectCodex } from "@sqliang/agent-ext-adapter-codex";
import { project as projectCursor } from "@sqliang/agent-ext-adapter-cursor";
import type { ComponentManifest, ProjectedFile, SourceFile, Target } from "@sqliang/agent-ext-schemas";
import { resolveInside, sha256 } from "./archive.js";
import type { Registry, RegistryItem, Resolution } from "./registry.js";

const LOCK_NAME = "agent-ext.lock.json";
const INTERNAL_DIRECTORY = ".agent-ext";

export interface LockedInstallation {
  key: string;
  kind: string;
  id: string;
  version: string;
  requested: string;
  targets: Target[];
  componentKeys: string[];
  pluginKeys: string[];
}

export interface LockedComponent {
  key: string;
  id: string;
  kind: string;
  version: string;
  status: string;
  releaseUrl: string;
  gitRef: string;
  archiveSha256: string;
  dependencies: string[];
}

export interface LockedFile {
  componentKey: string;
  target: Target;
  path: string;
  sha256: string;
}

export interface LockFile {
  schemaVersion: 1;
  registry: string;
  generatedAt: string;
  installations: LockedInstallation[];
  components: LockedComponent[];
  files: LockedFile[];
}

export type PlanAction = "create" | "replace" | "unchanged" | "remove" | "preserve-modified";

export interface PlannedFile {
  action: PlanAction;
  path: string;
  target?: Target;
  componentKey?: string;
  reason?: string;
}

export interface OperationResult {
  changed: boolean;
  dryRun: boolean;
  files: PlannedFile[];
  warnings: string[];
  lock: LockFile;
}

interface DesiredFile extends LockedFile {
  content: Uint8Array;
}

interface InstallOptions {
  root: string;
  targets: Target[];
  dryRun?: boolean;
  force?: boolean;
}

function emptyLock(registry: string): LockFile {
  return { schemaVersion: 1, registry, generatedAt: new Date(0).toISOString(), installations: [], components: [], files: [] };
}

export async function readLock(root: string, registry = "unknown"): Promise<LockFile> {
  try {
    const parsed = JSON.parse(await readFile(join(root, LOCK_NAME), "utf8")) as LockFile;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.files) || !Array.isArray(parsed.installations)) throw new Error("unsupported lock schema");
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyLock(registry);
    throw new Error(`Cannot read ${LOCK_NAME}: ${(error as Error).message}`);
  }
}

async function collectFiles(directory: string): Promise<SourceFile[]> {
  const result: SourceFile[] = [];
  const visit = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (["component.yaml", ".env", ".DS_Store", ".archive-sha256", ".release-url", "__pycache__"].includes(entry.name) || entry.name.endsWith(".pyc")) continue;
      const path = join(current, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new Error(`Component archives may not contain symbolic links: ${path}`);
      if (info.isDirectory()) await visit(path);
      else if (info.isFile()) result.push({ relativePath: relative(directory, path).replaceAll("\\", "/"), content: await readFile(path) });
    }
  };
  await visit(directory);
  return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function project(target: Target, manifest: ComponentManifest, files: SourceFile[]): ProjectedFile[] {
  if (target === "codex") return projectCodex(manifest, files);
  if (target === "claude") return projectClaude(manifest, files);
  return projectCursor(manifest, files);
}

function componentKey(item: RegistryItem<ComponentManifest>): string {
  return `${item.manifest.kind}:${item.manifest.id}@${item.manifest.version}`;
}

function installationKey(resolution: Resolution): string {
  return `${resolution.requested.kind}:${resolution.requested.id}`;
}

async function materialize(resolution: Resolution, targets: Target[]): Promise<{ components: LockedComponent[]; files: DesiredFile[] }> {
  const components: LockedComponent[] = [];
  const files: DesiredFile[] = [];
  const seenDestinations = new Map<string, string>();

  for (const item of resolution.components) {
    const sourceFiles = await collectFiles(item.directory);
    const key = componentKey(item);
    const contentDigest = sha256(Buffer.concat(sourceFiles.map((file) => Buffer.concat([Buffer.from(file.relativePath), Buffer.from([0]), Buffer.from(file.content)]))));
    const archiveDigest = await readFile(join(item.directory, ".archive-sha256"), "utf8").then((value) => value.trim()).catch(() => contentDigest);
    const releaseUrl = await readFile(join(item.directory, ".release-url"), "utf8").then((value) => value.trim()).catch(() => `https://github.com/sqliang/agent-extension-registry/releases/tag/component/${item.manifest.id}/v${item.manifest.version}`);
    components.push({
      key,
      id: item.manifest.id,
      kind: item.manifest.kind,
      version: item.manifest.version,
      status: item.manifest.status,
      releaseUrl,
      gitRef: `component/${item.manifest.id}/v${item.manifest.version}`,
      archiveSha256: archiveDigest,
      dependencies: (item.manifest.dependencies?.components ?? []).map((dependency) => `${dependency.id}@${dependency.version}`)
    });
    for (const target of targets) {
      for (const output of project(target, item.manifest, sourceFiles)) {
        const existing = seenDestinations.get(output.destination);
        const digest = sha256(output.content);
        if (existing && existing !== digest) throw new Error(`Adapter collision at ${output.destination}`);
        seenDestinations.set(output.destination, digest);
        files.push({ componentKey: key, target, path: output.destination, sha256: digest, content: output.content });
      }
    }
  }
  return { components, files };
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function fileHash(path: string): Promise<string | undefined> {
  try {
    if (!(await stat(path)).isFile()) return undefined;
    return sha256(await readFile(path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function mergeUnique<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

async function writeLockAtomic(root: string, lock: LockFile): Promise<void> {
  const temporary = join(root, `.${LOCK_NAME}.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  await replaceFileAtomic(temporary, join(root, LOCK_NAME));
}

async function replaceFileAtomic(source: string, destination: string): Promise<void> {
  try { await rename(source, destination); }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (process.platform !== "win32" || !["EEXIST", "EPERM"].includes(code ?? "")) throw error;
    await rm(destination, { force: true });
    await rename(source, destination);
  }
}

export class Installer {
  constructor(private readonly registry: Registry) {}

  async install(specifier: string, options: InstallOptions): Promise<OperationResult> {
    const root = resolve(options.root);
    let targets = [...new Set(options.targets)];
    if (targets.length === 0) throw new Error("At least one --target is required in non-interactive mode");
    let resolution = await this.registry.resolve(specifier, targets);
    const lock = await readLock(root, this.registry.root);
    const replacedInstallation = lock.installations.find((item) => item.key === installationKey(resolution));
    targets = [...new Set([...(replacedInstallation?.targets ?? []), ...targets])];
    if (targets.length !== options.targets.length || targets.some((target) => !options.targets.includes(target))) {
      resolution = await this.registry.resolve(specifier, targets);
    }
    const desired = await materialize(resolution, targets);
    const managed = new Map(lock.files.map((file) => [file.path, file]));
    const files: PlannedFile[] = [];
    const warnings: string[] = [];
    const backupCandidates: string[] = [];

    for (const file of desired.files) {
      const destination = resolveInside(root, file.path);
      const currentHash = await fileHash(destination);
      const previous = managed.get(file.path);
      if (currentHash === undefined) files.push({ action: "create", path: file.path, target: file.target, componentKey: file.componentKey });
      else if (previous && currentHash === file.sha256 && previous.sha256 === file.sha256) files.push({ action: "unchanged", path: file.path, target: file.target, componentKey: file.componentKey });
      else if (previous && currentHash === previous.sha256) files.push({ action: "replace", path: file.path, target: file.target, componentKey: file.componentKey, reason: "managed update" });
      else if (!options.force) {
        const ownership = previous ? "locally modified managed file" : "unmanaged file";
        throw new Error(`Refusing to overwrite ${ownership}: ${file.path}. Re-run with --force to create a backup first.`);
      } else {
        files.push({ action: "replace", path: file.path, target: file.target, componentKey: file.componentKey, reason: previous ? "forced local modification" : "forced unmanaged conflict" });
        backupCandidates.push(file.path);
      }
    }

    const installation: LockedInstallation = {
      key: installationKey(resolution),
      kind: resolution.requested.kind,
      id: resolution.requested.id,
      version: resolution.item.manifest.version,
      requested: specifier,
      targets,
      componentKeys: desired.components.map((component) => component.key),
      pluginKeys: resolution.plugins.map((plugin) => `plugin:${plugin.manifest.id}@${plugin.manifest.version}`)
    };
    const staleComponentKeys = new Set(replacedInstallation?.componentKeys ?? []);
    installation.componentKeys.forEach((key) => staleComponentKeys.delete(key));
    const nextInstallations = mergeUnique([...lock.installations.filter((item) => item.key !== installation.key), installation], (item) => item.key);
    const retainedKeys = new Set(nextInstallations.flatMap((item) => item.componentKeys));
    const staleFiles = lock.files.filter((file) => staleComponentKeys.has(file.componentKey) && !retainedKeys.has(file.componentKey));
    for (const stale of staleFiles) {
      const currentHash = await fileHash(resolveInside(root, stale.path));
      if (currentHash === undefined) continue;
      if (currentHash === stale.sha256) files.push({ action: "remove", path: stale.path, target: stale.target, componentKey: stale.componentKey });
      else {
        files.push({ action: "preserve-modified", path: stale.path, target: stale.target, componentKey: stale.componentKey });
        warnings.push(`Preserved locally modified file: ${stale.path}`);
      }
    }

    const nextComponents = mergeUnique([
      ...lock.components.filter((component) => retainedKeys.has(component.key)),
      ...desired.components
    ], (component) => component.key).filter((component) => retainedKeys.has(component.key));
    const desiredPaths = new Set(desired.files.map((file) => file.path));
    const nextFiles = mergeUnique([
      ...lock.files.filter((file) => retainedKeys.has(file.componentKey) && !desiredPaths.has(file.path)),
      ...desired.files.map(({ content: _content, ...file }) => file)
    ], (file) => `${file.target}:${file.path}`).filter((file) => retainedKeys.has(file.componentKey));
    const nextLock: LockFile = {
      schemaVersion: 1,
      registry: this.registry.root,
      generatedAt: new Date().toISOString(),
      installations: nextInstallations,
      components: nextComponents,
      files: nextFiles
    };
    const changed = files.some((file) => file.action !== "unchanged") || !lock.installations.some((item) => item.key === installation.key && item.version === installation.version && [...item.targets].sort().join() === [...targets].sort().join());
    if (options.dryRun) return { changed, dryRun: true, files, warnings, lock: nextLock };

    await mkdir(root, { recursive: true });
    const staging = join(root, INTERNAL_DIRECTORY, `staging-${randomUUID()}`);
    await mkdir(staging, { recursive: true });
    try {
      for (const file of desired.files) {
        const staged = resolveInside(staging, file.path);
        await mkdir(dirname(staged), { recursive: true });
        await writeFile(staged, file.content);
        if (await fileHash(staged) !== file.sha256) throw new Error(`Staging verification failed: ${file.path}`);
      }
      if (backupCandidates.length) {
        const backupRoot = join(root, INTERNAL_DIRECTORY, "backups", new Date().toISOString().replaceAll(":", "-"));
        for (const path of backupCandidates) {
          const source = resolveInside(root, path);
          const destination = resolveInside(backupRoot, path);
          await mkdir(dirname(destination), { recursive: true });
          await copyFile(source, destination);
        }
        warnings.push(`Backed up ${backupCandidates.length} conflicting file(s) under ${relative(root, backupRoot)}`);
      }
      for (const action of files.filter((file) => file.action === "remove")) await rm(resolveInside(root, action.path));
      for (const file of desired.files) {
        const action = files.find((candidate) => candidate.path === file.path && candidate.componentKey === file.componentKey);
        if (action?.action === "unchanged") continue;
        const destination = resolveInside(root, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await replaceFileAtomic(resolveInside(staging, file.path), destination);
      }
      await writeLockAtomic(root, nextLock);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
    return { changed, dryRun: false, files, warnings, lock: nextLock };
  }

  async uninstall(specifier: string, options: Pick<InstallOptions, "root" | "dryRun">): Promise<OperationResult> {
    const root = resolve(options.root);
    const lock = await readLock(root, this.registry.root);
    const parsedKey = specifier.replace(/@.+$/, "");
    const installation = lock.installations.find((item) => item.key === parsedKey);
    if (!installation) throw new Error(`Not installed: ${parsedKey}`);
    const nextInstallations = lock.installations.filter((item) => item.key !== parsedKey);
    const retainedKeys = new Set(nextInstallations.flatMap((item) => item.componentKeys));
    const candidates = lock.files.filter((file) => installation.componentKeys.includes(file.componentKey) && !retainedKeys.has(file.componentKey));
    const files: PlannedFile[] = [];
    const warnings: string[] = [];
    for (const file of candidates) {
      const currentHash = await fileHash(resolveInside(root, file.path));
      if (currentHash === undefined) continue;
      if (currentHash === file.sha256) files.push({ action: "remove", path: file.path, target: file.target, componentKey: file.componentKey });
      else {
        files.push({ action: "preserve-modified", path: file.path, target: file.target, componentKey: file.componentKey });
        warnings.push(`Preserved locally modified file: ${file.path}`);
      }
    }
    const nextLock: LockFile = {
      ...lock,
      generatedAt: new Date().toISOString(),
      installations: nextInstallations,
      components: lock.components.filter((component) => retainedKeys.has(component.key)),
      files: lock.files.filter((file) => retainedKeys.has(file.componentKey))
    };
    if (!options.dryRun) {
      for (const file of files.filter((item) => item.action === "remove")) await rm(resolveInside(root, file.path));
      await writeLockAtomic(root, nextLock);
    }
    return { changed: files.some((file) => file.action === "remove") || true, dryRun: options.dryRun === true, files, warnings, lock: nextLock };
  }

  async status(root: string): Promise<{ lock: LockFile; files: Array<LockedFile & { state: "ok" | "missing" | "modified" }> }> {
    const lock = await readLock(resolve(root), this.registry.root);
    const files = await Promise.all(lock.files.map(async (file) => {
      const current = await fileHash(resolveInside(root, file.path));
      return { ...file, state: current === undefined ? "missing" as const : current === file.sha256 ? "ok" as const : "modified" as const };
    }));
    return { lock, files };
  }

  async update(specifier: string | undefined, options: InstallOptions): Promise<OperationResult[]> {
    const lock = await readLock(resolve(options.root), this.registry.root);
    const selected = specifier ? lock.installations.filter((item) => item.key === specifier.replace(/@.+$/, "")) : lock.installations;
    if (selected.length === 0) throw new Error(specifier ? `Not installed: ${specifier}` : "Nothing is installed");
    const results: OperationResult[] = [];
    for (const installation of selected) {
      results.push(await this.install(`${installation.kind}:${installation.id}`, { ...options, targets: installation.targets }));
    }
    return results;
  }
}
