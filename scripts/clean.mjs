import { rm } from "node:fs/promises";

await Promise.all([
  rm("dist", { recursive: true, force: true }),
  rm("packages/cli/dist", { recursive: true, force: true }),
  rm("packages/cli/publish", { recursive: true, force: true }),
  rm("packages/core/dist", { recursive: true, force: true }),
  rm("packages/schemas/dist", { recursive: true, force: true }),
  rm("packages/adapters/codex/dist", { recursive: true, force: true }),
  rm("packages/adapters/claude/dist", { recursive: true, force: true }),
  rm("packages/adapters/cursor/dist", { recursive: true, force: true })
]);
