import assert from "node:assert/strict";
import test from "node:test";
import { validateComponent, validateProfile } from "./index.js";

test("accepts a valid component manifest", () => {
  const result = validateComponent({
    schemaVersion: 1,
    id: "repo-insight",
    kind: "skill",
    version: "1.0.0",
    status: "beta",
    description: "Repository analysis",
    entry: "SKILL.md",
    invocation: "automatic",
    targets: ["codex", "claude", "cursor"]
  });
  assert.equal(result.ok, true);
});

test("rejects invalid semver and empty profiles", () => {
  const result = validateProfile({
    schemaVersion: 1,
    id: "empty-profile",
    version: "latest",
    status: "stable",
    description: "Empty"
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /SemVer/);
  assert.match(result.errors.join("\n"), /at least one/);
});
