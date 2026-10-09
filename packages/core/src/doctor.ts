import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExternalDependency, Target } from "@sqliang/agent-ext-schemas";
import type { Registry } from "./registry.js";

const execFileAsync = promisify(execFile);

export interface DoctorCheck {
  command: string;
  available: boolean;
  required: boolean;
  usedBy: string[];
  guidance: string;
}

const GUIDANCE: Record<string, Partial<Record<NodeJS.Platform | "default", string>>> = {
  git: { default: "Install Git from https://git-scm.com/downloads or your platform package manager." },
  python3: { default: "Install Python 3.10 or newer from python.org or your platform package manager." },
  uv: { default: "Install uv from https://docs.astral.sh/uv/getting-started/installation/." },
  markitdown: { default: "Install in an isolated environment with: uv tool install 'markitdown[pdf]'." },
  pdftoppm: { darwin: "Install Poppler with: brew install poppler.", linux: "Install your distribution's poppler-utils package.", win32: "Install a trusted Poppler build and add its bin directory to PATH.", default: "Install Poppler and add pdftoppm to PATH." },
  tesseract: { darwin: "Install with: brew install tesseract tesseract-lang.", linux: "Install tesseract-ocr and required language packs.", win32: "Install Tesseract OCR and add it to PATH.", default: "Install Tesseract OCR and required language packs." },
  obsidian: { default: "Enable and install the official Obsidian CLI if this workflow needs vault CLI access." }
};

async function commandExists(command: string): Promise<boolean> {
  const probe = process.platform === "win32" ? "where" : "which";
  try { await execFileAsync(probe, [command]); return true; } catch { return false; }
}

export async function doctor(registry: Registry, target?: Target): Promise<DoctorCheck[]> {
  const items = await registry.list({ kind: "skill", target, includeDeprecated: false });
  const dependencies = new Map<string, { dependency: ExternalDependency; usedBy: string[] }>();
  for (const item of items) {
    if (!("dependencies" in item.manifest)) continue;
    for (const dependency of item.manifest.dependencies?.external ?? []) {
      const current = dependencies.get(dependency.command);
      if (current) {
        current.usedBy.push(item.manifest.id);
        current.dependency.required ||= dependency.required;
      } else dependencies.set(dependency.command, { dependency: { ...dependency }, usedBy: [item.manifest.id] });
    }
  }
  return Promise.all([...dependencies.values()].map(async ({ dependency, usedBy }) => ({
    command: dependency.command,
    available: await commandExists(dependency.command),
    required: dependency.required,
    usedBy,
    guidance: GUIDANCE[dependency.command]?.[process.platform] ?? GUIDANCE[dependency.command]?.default ?? dependency.description
  })));
}
