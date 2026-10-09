import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeArchivePath, verifySha256 } from "./archive.js";

test("rejects archive path traversal", () => {
  for (const path of ["../secret", "a/../../secret", "/absolute", "C:\\secret"]) {
    assert.throws(() => assertSafeArchivePath(path), /Unsafe archive path/);
  }
});

test("rejects checksum mismatch", () => {
  assert.throws(() => verifySha256(Buffer.from("payload"), "0".repeat(64)), /mismatch/);
});
