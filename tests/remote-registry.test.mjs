import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as tar from "tar";
import { Installer, RemoteRegistry, sha256 } from "../packages/core/dist/index.js";

test("installs a checksum-verified component from a remote catalog", async (t) => {
  const fixture = await mkdtemp(join(tmpdir(), "agent-ext-remote-"));
  const source = join(fixture, "source");
  const archive = join(fixture, "remote-skill.tar.gz");
  const project = join(fixture, "project");
  await mkdir(source, { recursive: true });
  await writeFile(join(source, "component.yaml"), "schemaVersion: 1\nid: remote-skill\nkind: skill\nversion: 1.0.0\nstatus: stable\ndescription: Remote fixture skill.\nentry: SKILL.md\ninvocation: automatic\ntargets: [codex]\n");
  await writeFile(join(source, "SKILL.md"), "---\nname: remote-skill\ndescription: Remote fixture skill for download validation.\n---\n\n# Remote\n");
  await tar.c({ cwd: source, file: archive, gzip: true }, ["."]);
  const archiveBytes = await readFile(archive);

  const catalog = { schemaVersion: 1, items: [{
    kind: "skill", schemaVersion: 1, id: "remote-skill", version: "1.0.0", status: "stable",
    description: "Remote fixture skill.", entry: "SKILL.md", invocation: "automatic", targets: ["codex"],
    artifact: { url: "https://fixture.invalid/component.tar.gz", sha256: sha256(archiveBytes) }
  }] };
  t.after(async () => { await rm(fixture, { recursive: true, force: true }); });

  assert.throws(() => new RemoteRegistry("http://fixture.invalid/catalog.json", join(fixture, "cache")), /HTTPS/);
  const registry = new RemoteRegistry("https://fixture.invalid/catalog.json", join(fixture, "cache"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => String(input).endsWith("catalog.json")
    ? new Response(JSON.stringify(catalog), { status: 200, headers: { "content-type": "application/json" } })
    : new Response(archiveBytes, { status: 200, headers: { "content-type": "application/gzip", "content-length": String(archiveBytes.byteLength) } });
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await new Installer(registry).install("skill:remote-skill", { root: project, targets: ["codex"] });
  assert.equal(result.changed, true);
  assert.match(await readFile(join(project, ".agents/skills/remote-skill/SKILL.md"), "utf8"), /Remote fixture/);
});
