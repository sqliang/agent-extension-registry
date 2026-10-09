import { createHash } from "node:crypto";
import { isAbsolute, normalize, resolve, sep } from "node:path";

export function sha256(content: Uint8Array | string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function assertSafeArchivePath(entryPath: string): string {
  if (!entryPath || isAbsolute(entryPath) || /^[A-Za-z]:[\\/]/.test(entryPath)) {
    throw new Error(`Unsafe archive path: ${entryPath}`);
  }
  const normalized = normalize(entryPath).replaceAll("\\", "/");
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Unsafe archive path: ${entryPath}`);
  }
  return normalized;
}

export function resolveInside(root: string, relativePath: string): string {
  const safe = assertSafeArchivePath(relativePath);
  const absolute = resolve(root, safe);
  const base = resolve(root);
  if (absolute !== base && !absolute.startsWith(`${base}${sep}`)) throw new Error(`Path escapes target root: ${relativePath}`);
  return absolute;
}

export function verifySha256(content: Uint8Array, expected: string): void {
  const actual = sha256(content);
  if (!/^[a-f0-9]{64}$/i.test(expected) || actual !== expected.toLowerCase()) {
    throw new Error(`SHA-256 mismatch: expected ${expected}, received ${actual}`);
  }
}
