import { access, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import semver from "semver";

const root = resolve("dist/projections");
const errors = [];
let bundles = 0;

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

for (const kind of await readdir(root)) {
  const kindRoot = join(root, kind);
  for (const id of await readdir(kindRoot)) {
    const idRoot = join(kindRoot, id);
    for (const version of await readdir(idRoot)) {
      for (const target of ["codex", "claude", "cursor"]) {
        const bundle = join(idRoot, version, target);
        const compatibility = target === "codex" ? ".codex-plugin" : target === "claude" ? ".claude-plugin" : ".cursor-plugin";
        const manifests = [join(bundle, "plugin.json"), join(bundle, compatibility, "plugin.json")];
        for (const manifestPath of manifests) {
          try {
            const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
            if (manifest.name !== id) errors.push(`${relative(root, manifestPath)}: name does not match directory`);
            if (!semver.valid(manifest.version) || manifest.version !== version) errors.push(`${relative(root, manifestPath)}: invalid version`);
            if (typeof manifest.description !== "string" || !manifest.description.trim()) errors.push(`${relative(root, manifestPath)}: missing description`);
          } catch (error) { errors.push(`${relative(root, manifestPath)}: ${error.message}`); }
        }
        if (!(await exists(join(bundle, "skills")))) errors.push(`${relative(root, bundle)}: portable skills directory is missing`);
        const nativeRoot = target === "codex" ? join(bundle, ".agents", "skills") : join(bundle, `.${target}`, "skills");
        if (!(await exists(nativeRoot))) errors.push(`${relative(root, bundle)}: native skill projection is missing`);
        bundles += 1;
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else console.log(`Validated ${bundles} generated host bundles.`);
