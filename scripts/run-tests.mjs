import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const files = [];
async function collect(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await collect(child);
    else if (entry.name.endsWith(".test.js") || entry.name.endsWith(".test.mjs")) files.push(resolve(child));
  }
}

await collect("packages");
await collect("tests");
const child = spawn(process.execPath, ["--test", ...files.sort()], { stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
