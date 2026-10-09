import assert from "node:assert/strict";
import test from "node:test";
import { project } from "./index.js";

test("projects a Cursor skill", () => {
  const [skill] = project({ schemaVersion: 1, id: "repo-insight", kind: "skill", version: "1.0.0", status: "beta", description: "x", entry: "SKILL.md", invocation: "automatic", targets: ["cursor"] }, [{ relativePath: "SKILL.md", content: Buffer.from("---\nname: repo-insight\n---\n") }]);
  assert.equal(skill!.destination, ".cursor/skills/repo-insight/SKILL.md");
});
