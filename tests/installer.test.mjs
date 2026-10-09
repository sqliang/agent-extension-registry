import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { Installer, LocalRegistry } from "../packages/core/dist/index.js";

const registryRoot = resolve(process.cwd());

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "agent-ext-test-"));
  const installer = new Installer(new LocalRegistry(registryRoot));
  return { root, installer };
}

test("installs a profile to all hosts and is idempotent", async (t) => {
  const { root, installer } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await installer.install("profile:learning", { root, targets: ["codex", "claude", "cursor"] });
  assert.equal(first.changed, true);
  assert.match(await readFile(join(root, ".agents/skills/pdf-reader/SKILL.md"), "utf8"), /PDF Reader/);
  assert.match(await readFile(join(root, ".claude/skills/pdf-reader/SKILL.md"), "utf8"), /PDF Reader/);
  assert.match(await readFile(join(root, ".cursor/skills/pdf-reader/SKILL.md"), "utf8"), /PDF Reader/);
  const second = await installer.install("profile:learning", { root, targets: ["codex", "claude", "cursor"] });
  assert.equal(second.files.every((file) => file.action === "unchanged"), true);
});

test("dry-run does not write and unmanaged files require force", async (t) => {
  const { root, installer } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const dry = await installer.install("skill:git-workflow", { root, targets: ["codex"], dryRun: true });
  assert.equal(dry.dryRun, true);
  await assert.rejects(readFile(join(root, "agent-ext.lock.json")), /ENOENT/);
  const conflict = join(root, ".agents/skills/git-workflow/SKILL.md");
  await mkdir(join(root, ".agents/skills/git-workflow"), { recursive: true });
  await writeFile(conflict, "unmanaged");
  await assert.rejects(installer.install("skill:git-workflow", { root, targets: ["codex"] }), /unmanaged file/);
  const forced = await installer.install("skill:git-workflow", { root, targets: ["codex"], force: true });
  assert.equal(forced.warnings.some((warning) => warning.includes("Backed up")), true);
});

test("uninstall preserves locally modified managed files", async (t) => {
  const { root, installer } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await installer.install("skill:git-workflow", { root, targets: ["codex"] });
  const skill = join(root, ".agents/skills/git-workflow/SKILL.md");
  await writeFile(skill, `${await readFile(skill, "utf8")}\nlocal edit\n`);
  const result = await installer.uninstall("skill:git-workflow", { root });
  assert.equal(result.files.some((file) => file.action === "preserve-modified"), true);
  assert.match(await readFile(skill, "utf8"), /local edit/);
});
