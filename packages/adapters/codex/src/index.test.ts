import assert from "node:assert/strict";
import test from "node:test";
import { project } from "./index.js";

test("projects explicit skills to the Codex skill root", () => {
  const files = project({ schemaVersion: 1, id: "commit-code", kind: "skill", version: "1.0.0", status: "beta", description: "x", entry: "SKILL.md", invocation: "explicit", targets: ["codex"] }, [{ relativePath: "SKILL.md", content: Buffer.from("---\nname: commit-code\n---\n") }]);
  assert.deepEqual(files.map((file) => file.destination), [
    ".agents/skills/commit-code/SKILL.md",
    ".agents/skills/commit-code/agents/openai.yaml"
  ]);
});
