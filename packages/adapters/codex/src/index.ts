import type { ComponentManifest, ProjectedFile, SourceFile } from "@sqliang/agent-ext-schemas";

export const target = "codex" as const;

export function project(manifest: ComponentManifest, files: SourceFile[]): ProjectedFile[] {
  if (!manifest.targets.includes(target)) throw new Error(`${manifest.id} does not support ${target}`);
  if (manifest.kind !== "skill") throw new Error(`Codex adapter does not yet support required ${manifest.kind} component ${manifest.id}`);
  const prefix = `.agents/skills/${manifest.id}`;
  const projected = files.map((file) => ({ ...file, destination: `${prefix}/${file.relativePath}` }));
  if (manifest.invocation === "explicit") {
    const displayName = manifest.id.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" ");
    projected.push({
      relativePath: "agents/openai.yaml",
      destination: `${prefix}/agents/openai.yaml`,
      content: Buffer.from([
        "interface:",
        `  display_name: ${displayName}`,
        `  short_description: ${manifest.description}`,
        `  default_prompt: Use $${manifest.id} for this explicit workflow.`,
        "policy:",
        "  allow_implicit_invocation: false",
        ""
      ].join("\n"), "utf8")
    });
  }
  return projected;
}
