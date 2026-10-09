import type { ComponentManifest, ProjectedFile, SourceFile } from "@sqliang/agent-ext-schemas";

export const target = "cursor" as const;

function explicitFrontmatter(content: Uint8Array): Uint8Array {
  const text = Buffer.from(content).toString("utf8");
  if (!text.startsWith("---\n")) throw new Error("SKILL.md must start with YAML frontmatter");
  const boundary = text.indexOf("\n---\n", 4);
  if (boundary < 0) throw new Error("SKILL.md frontmatter is not closed");
  return Buffer.from(`${text.slice(0, boundary)}\ndisable-model-invocation: true${text.slice(boundary)}`, "utf8");
}

export function project(manifest: ComponentManifest, files: SourceFile[]): ProjectedFile[] {
  if (!manifest.targets.includes(target)) throw new Error(`${manifest.id} does not support ${target}`);
  if (manifest.kind !== "skill") throw new Error(`Cursor adapter does not yet support required ${manifest.kind} component ${manifest.id}`);
  const prefix = `.cursor/skills/${manifest.id}`;
  return files.map((file) => ({
    ...file,
    content: manifest.invocation === "explicit" && file.relativePath === "SKILL.md" ? explicitFrontmatter(file.content) : file.content,
    destination: `${prefix}/${file.relativePath}`
  }));
}
