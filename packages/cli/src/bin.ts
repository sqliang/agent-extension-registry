#!/usr/bin/env node
import { run } from "./index.js";

run().catch((error: unknown) => {
  const json = process.argv.includes("--json");
  if (json) console.error(JSON.stringify({ error: (error as Error).message }, null, 2));
  else console.error(`agent-ext: ${(error as Error).message}`);
  process.exitCode = 1;
});
