import { chmod, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(root, "packages/cli/src/bin.ts");
const output = join(root, "packages/cli/publish/agent-ext.cjs");
await rm(dirname(output), { recursive: true, force: true });
await mkdir(dirname(output), { recursive: true });
await build({
  entryPoints: [entry],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  packages: "bundle",
  sourcemap: false,
  minify: false
});
await chmod(output, 0o755);
