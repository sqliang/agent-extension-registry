import { execFile } from "node:child_process";
import { access, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { LocalRegistry } from "../packages/core/dist/index.js";

const execFileAsync = promisify(execFile);
const root = resolve(process.cwd());
const registry = new LocalRegistry(root);
await registry.load();
const items = await registry.list({ includeDeprecated: true });
const errors = [];
const allowedFrontmatter = new Set(["name", "description", "license", "metadata", "allowed-tools"]);

for (const item of items) {
  if (item.kind !== "skill") continue;
  const skillPath = join(item.directory, "SKILL.md");
  try { await access(skillPath); } catch { errors.push(`${relative(root, item.directory)}: missing SKILL.md`); continue; }
  const text = await readFile(skillPath, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) { errors.push(`${relative(root, skillPath)}: invalid or missing YAML frontmatter`); continue; }
  const frontmatter = parseYaml(match[1]);
  if (frontmatter.name !== item.manifest.id) errors.push(`${relative(root, skillPath)}: name must match component id`);
  if (typeof frontmatter.description !== "string" || frontmatter.description.trim().length < 10) errors.push(`${relative(root, skillPath)}: description is too short`);
  for (const key of Object.keys(frontmatter)) if (!allowedFrontmatter.has(key)) errors.push(`${relative(root, skillPath)}: non-standard frontmatter key ${key}`);
  if (/\/Users\/|\.claude\/skills/.test(text)) errors.push(`${relative(root, skillPath)}: contains a machine or host-specific path`);
}

for (const item of items.filter((candidate) => candidate.kind === "profile")) {
  for (const target of ["codex", "claude", "cursor"]) {
    try { await registry.resolve(`profile:${item.manifest.id}`, [target]); }
    catch (error) { errors.push(`profile:${item.manifest.id}/${target}: ${error.message}`); }
  }
}

const pythonScripts = [];
async function collectPython(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await collectPython(child);
    else if (entry.name.endsWith(".py")) pythonScripts.push(child);
  }
}
await collectPython(join(root, "components"));
if (pythonScripts.length) {
  const cacheRoot = join(root, ".agent-ext", "validation-pycache");
  await mkdir(cacheRoot, { recursive: true });
  try { await execFileAsync("python3", ["-m", "py_compile", ...pythonScripts], { env: { ...process.env, PYTHONPYCACHEPREFIX: cacheRoot } }); }
  catch (error) { errors.push(`Python syntax validation failed: ${error.stderr || error.message}`); }
  finally { await rm(cacheRoot, { recursive: true, force: true }); }
}

for (const smoke of [
  "components/skills/pdf-reader/scripts/cli.py",
  "components/skills/markdown-frontmatter-engine/scripts/batch_ops.py",
  "components/skills/obsidian-smart-links/scripts/analyze_links.py"
]) {
  try { await execFileAsync("python3", [join(root, smoke), "--help"], { env: { ...process.env, PYTHONUTF8: "1" } }); }
  catch (error) { errors.push(`${smoke} --help failed: ${error.stderr || error.message}`); }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${items.length} registry items and ${pythonScripts.length} Python scripts.`);
}
