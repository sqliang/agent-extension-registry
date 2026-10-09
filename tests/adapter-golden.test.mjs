import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { project as codex } from "../packages/adapters/codex/dist/index.js";
import { project as claude } from "../packages/adapters/claude/dist/index.js";
import { project as cursor } from "../packages/adapters/cursor/dist/index.js";

test("explicit skill projections match the golden fixture", async () => {
  const golden = JSON.parse(await readFile(resolve("tests/fixtures/adapters/explicit-skill.json"), "utf8"));
  const manifest = { schemaVersion: 1, id: "commit-added", kind: "skill", version: "1.0.0", status: "beta", description: "Commit already staged files.", entry: "SKILL.md", invocation: "explicit", targets: ["codex", "claude", "cursor"] };
  const source = [{ relativePath: "SKILL.md", content: Buffer.from("---\nname: commit-added\ndescription: Commit staged files.\n---\n") }];
  for (const [target, project] of Object.entries({ codex, claude, cursor })) {
    const files = project(manifest, source);
    assert.deepEqual(files.map((file) => file.destination), golden[target].paths);
    assert.match(files.map((file) => Buffer.from(file.content).toString("utf8")).join("\n"), new RegExp(golden[target].contains));
  }
});
