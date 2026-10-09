import assert from "node:assert/strict";
import test from "node:test";
import { project } from "./index.js";

test("marks explicit Claude skills as non-implicit", () => {
  const [skill] = project({ schemaVersion: 1, id: "commit-code", kind: "skill", version: "1.0.0", status: "beta", description: "x", entry: "SKILL.md", invocation: "explicit", targets: ["claude"] }, [{ relativePath: "SKILL.md", content: Buffer.from("---\nname: commit-code\n---\nBody\n") }]);
  assert.match(Buffer.from(skill!.content).toString("utf8"), /disable-model-invocation: true/);
  assert.equal(skill!.destination, ".claude/skills/commit-code/SKILL.md");
});
