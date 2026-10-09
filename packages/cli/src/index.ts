#!/usr/bin/env node
import { access, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  Installer,
  LocalRegistry,
  RemoteRegistry,
  DEFAULT_CATALOG_URL,
  doctor,
  findRegistryRoot,
  parseSpecifier,
  type Registry,
  type RegistryKind
} from "@sqliang/agent-ext-core";
import {
  TARGETS,
  STATUSES,
  loadManifest,
  validateComponent,
  validatePlugin,
  validateProfile,
  type Status,
  type Target
} from "@sqliang/agent-ext-schemas";

interface Arguments {
  command?: string;
  positionals: string[];
  values: Map<string, string[]>;
  flags: Set<string>;
}

const HELP = `Agent Extension Registry CLI

Usage:
  agent-ext list [--kind <kind>] [--status <status>] [--target <host>] [--json]
  agent-ext info <kind:id>[@version] [--json]
  agent-ext install <kind:id>[@range] --target <host>... [--root <dir>] [--dry-run] [--force] [--json]
  agent-ext status [--root <dir>] [--json]
  agent-ext update [kind:id] [--root <dir>] [--dry-run] [--force] [--json]
  agent-ext uninstall <kind:id> [--root <dir>] [--dry-run] [--json]
  agent-ext doctor [--target <host>] [--root <dir>] [--json]
  agent-ext validate [path] [--json]

Targets: codex, claude, cursor`;

function parseArguments(argv: string[]): Arguments {
  const result: Arguments = { positionals: [], values: new Map(), flags: new Set() };
  const valueOptions = new Set(["kind", "status", "target", "root"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!result.command && !token.startsWith("-")) { result.command = token; continue; }
    if (token.startsWith("--")) {
      const [rawName, inline] = token.slice(2).split("=", 2);
      const name = rawName!;
      if (valueOptions.has(name)) {
        const value = inline ?? argv[++index];
        if (!value || value.startsWith("--")) throw new Error(`--${name} requires a value`);
        result.values.set(name, [...(result.values.get(name) ?? []), value]);
      } else result.flags.add(name);
    } else result.positionals.push(token);
  }
  return result;
}

function one(args: Arguments, name: string): string | undefined {
  const values = args.values.get(name);
  if (values && values.length > 1) throw new Error(`--${name} may only be supplied once`);
  return values?.[0];
}

function targetValues(args: Arguments): Target[] {
  const values = args.values.get("target") ?? [];
  for (const value of values) if (!TARGETS.includes(value as Target)) throw new Error(`Unsupported target: ${value}`);
  return [...new Set(values as Target[])];
}

async function pathExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function chooseTargets(root: string): Promise<Target[]> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("--target is required in non-interactive environments");
  const candidates: Array<{ target: Target; path: string }> = [
    { target: "codex", path: ".agents" },
    { target: "claude", path: ".claude" },
    { target: "cursor", path: ".cursor" }
  ];
  const detected = [] as Target[];
  for (const candidate of candidates) if (await pathExists(resolve(root, candidate.path))) detected.push(candidate.target);
  if (detected.length === 0) throw new Error("No existing host directories were detected. Supply --target explicitly.");
  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question(`Detected ${detected.join(", ")}. Select comma-separated targets: `);
    const selected = answer.split(",").map((value) => value.trim()).filter(Boolean) as Target[];
    if (selected.length === 0 || selected.some((value) => !detected.includes(value))) throw new Error("Selection must contain only detected targets");
    return [...new Set(selected)];
  } finally { prompt.close(); }
}

function print(value: unknown, json: boolean): void {
  if (json) console.log(JSON.stringify(value, null, 2));
  else if (typeof value === "string") console.log(value);
  else console.log(JSON.stringify(value, null, 2));
}

async function registryFor(start: string, cacheRoot = start): Promise<Registry> {
  if (process.env.AGENT_EXT_REGISTRY_ROOT) return new LocalRegistry(resolve(process.env.AGENT_EXT_REGISTRY_ROOT));
  try { return new LocalRegistry(await findRegistryRoot(start)); }
  catch {
    const catalogUrl = process.env.AGENT_EXT_CATALOG_URL ?? DEFAULT_CATALOG_URL;
    return new RemoteRegistry(catalogUrl, resolve(cacheRoot, ".agent-ext", "cache"));
  }
}

async function validatePath(path: string): Promise<{ valid: true; path: string; type: string }> {
  const absolute = resolve(path);
  const info = await stat(absolute);
  if (info.isDirectory()) {
    const names = await readdir(absolute);
    if (names.includes("component.yaml")) await loadManifest(resolve(absolute, "component.yaml"), validateComponent);
    else if (names.includes("plugin.yaml")) await loadManifest(resolve(absolute, "plugin.yaml"), validatePlugin);
    else if (names.includes("profile.yaml")) await loadManifest(resolve(absolute, "profile.yaml"), validateProfile);
    else {
      const registry = await registryFor(absolute);
      await registry.load();
      return { valid: true, path: absolute, type: "registry" };
    }
    return { valid: true, path: absolute, type: "manifest-directory" };
  }
  if (absolute.endsWith("component.yaml")) await loadManifest(absolute, validateComponent);
  else if (absolute.endsWith("plugin.yaml")) await loadManifest(absolute, validatePlugin);
  else if (absolute.endsWith("profile.yaml")) await loadManifest(absolute, validateProfile);
  else throw new Error("validate expects a registry directory or component.yaml, plugin.yaml, or profile.yaml");
  return { valid: true, path: absolute, type: "manifest" };
}

export async function run(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArguments(argv);
  const json = args.flags.has("json");
  if (!args.command || args.command === "help" || args.flags.has("help")) { print(HELP, false); return; }
  const root = resolve(one(args, "root") ?? process.cwd());
  const registry = await registryFor(process.cwd(), root);
  const installer = new Installer(registry);

  if (args.command === "list") {
    const kind = one(args, "kind") as RegistryKind | undefined;
    const status = one(args, "status") as Status | undefined;
    if (kind && !["skill", "agent", "hook", "mcp", "plugin", "profile"].includes(kind)) throw new Error(`Unsupported kind: ${kind}`);
    if (status && !STATUSES.includes(status)) throw new Error(`Unsupported status: ${status}`);
    const target = targetValues(args)[0];
    const items = await registry.list({ kind, status, target });
    const rows = items.map((item) => ({ kind: item.kind, id: item.manifest.id, version: item.manifest.version, status: item.manifest.status, description: item.manifest.description }));
    if (json) print(rows, true);
    else console.log(rows.map((item) => `${item.kind}:${item.id}@${item.version}\t${item.status}\t${item.description}`).join("\n"));
    return;
  }

  if (args.command === "info") {
    const specifier = args.positionals[0];
    if (!specifier) throw new Error("info requires <kind:id>[@version]");
    const parsed = parseSpecifier(specifier);
    const item = await registry.get(parsed);
    print({ kind: item.kind, ...item.manifest }, json);
    return;
  }

  if (args.command === "install") {
    const specifier = args.positionals[0];
    if (!specifier) throw new Error("install requires <kind:id>[@range]");
    const targets = targetValues(args);
    const selectedTargets = targets.length ? targets : await chooseTargets(root);
    const result = await installer.install(specifier, { root, targets: selectedTargets, dryRun: args.flags.has("dry-run"), force: args.flags.has("force") });
    print(result, json);
    return;
  }

  if (args.command === "status") {
    const result = await installer.status(root);
    print(result, json);
    return;
  }

  if (args.command === "update") {
    const result = await installer.update(args.positionals[0], { root, targets: [], dryRun: args.flags.has("dry-run"), force: args.flags.has("force") });
    print(result, json);
    return;
  }

  if (args.command === "uninstall") {
    const specifier = args.positionals[0];
    if (!specifier) throw new Error("uninstall requires <kind:id>");
    parseSpecifier(specifier);
    const result = await installer.uninstall(specifier, { root, dryRun: args.flags.has("dry-run") });
    print(result, json);
    return;
  }

  if (args.command === "doctor") {
    const result = await doctor(registry, targetValues(args)[0]);
    print(result, json);
    return;
  }

  if (args.command === "validate") {
    print(await validatePath(args.positionals[0] ?? process.cwd()), json);
    return;
  }

  throw new Error(`Unknown command: ${args.command}\n\n${HELP}`);
}
