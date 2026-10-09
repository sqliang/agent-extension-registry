import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LocalRegistry } from "../packages/core/dist/index.js";

async function component(root, id, targets, dependencies = "") {
  const directory = join(root, "components", "skills", id);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), `---\nname: ${id}\ndescription: Fixture skill for dependency tests.\n---\n`);
  await writeFile(join(directory, "component.yaml"), `schemaVersion: 1\nid: ${id}\nkind: skill\nversion: 1.0.0\nstatus: beta\ndescription: Fixture ${id}.\nentry: SKILL.md\ninvocation: automatic\ntargets: [${targets.join(", ")}]\n${dependencies}`);
}

test("detects dependency cycles", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "agent-ext-registry-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await component(root, "cycle-a", ["codex"], "dependencies:\n  components:\n    - id: cycle-b\n      version: ^1.0.0\n");
  await component(root, "cycle-b", ["codex"], "dependencies:\n  components:\n    - id: cycle-a\n      version: ^1.0.0\n");
  await assert.rejects(new LocalRegistry(root).resolve("skill:cycle-a", ["codex"]), /Circular/);
});

test("fails required host incompatibility and skips optional incompatibility", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "agent-ext-registry-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await component(root, "codex-only", ["codex"]);
  await component(root, "portable", ["codex", "cursor"], "dependencies:\n  components:\n    - id: codex-only\n      version: ^1.0.0\n      optional: true\n");
  const registry = new LocalRegistry(root);
  await assert.rejects(registry.resolve("skill:codex-only", ["cursor"]), /does not support/);
  const resolution = await registry.resolve("skill:portable", ["cursor"]);
  assert.deepEqual(resolution.components.map((item) => item.manifest.id), ["portable"]);
});
