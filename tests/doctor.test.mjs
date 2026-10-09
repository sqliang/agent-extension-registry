import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import test from "node:test";
import { LocalRegistry, doctor } from "../packages/core/dist/index.js";

test("doctor detects fake OCR executables without installing them", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "agent-ext-doctor-"));
  const originalPath = process.env.PATH;
  t.after(async () => { process.env.PATH = originalPath; await rm(directory, { recursive: true, force: true }); });
  for (const command of ["tesseract", "pdftoppm", "markitdown", "uv"]) {
    const path = join(directory, command);
    await writeFile(path, "#!/bin/sh\nexit 0\n");
    await chmod(path, 0o755);
  }
  process.env.PATH = `${directory}${delimiter}${originalPath ?? ""}`;
  const checks = await doctor(new LocalRegistry(resolve(process.cwd())), "codex");
  for (const command of ["tesseract", "pdftoppm", "markitdown", "uv"]) {
    assert.equal(checks.find((check) => check.command === command)?.available, true);
  }
});
