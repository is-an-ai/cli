import * as fs from "node:fs";
import * as path from "node:path";
import { resolveAuth } from "../lib/auth.js";
import { deployHosting } from "../lib/api-client.js";

const SKIP_NAMES = new Set(["node_modules", ".git", ".DS_Store"]);
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_COUNT = 1000;

function readDirectoryRecursive(dir: string, base?: string): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_NAMES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = base ? path.join(base, entry.name) : entry.name;

    if (entry.isDirectory()) {
      for (const [k, v] of readDirectoryRecursive(fullPath, relativePath)) {
        result.set(k, v);
      }
    } else if (entry.isFile()) {
      result.set(relativePath, fs.readFileSync(fullPath));
    }
  }

  return result;
}

export async function deploy(name: string, directory?: string): Promise<void> {
  const auth = resolveAuth("api");
  if (!auth.jwt) {
    throw new Error("The `deploy` command requires login. Run `is-an-ai login` first.");
  }

  const dir = path.resolve(directory || ".");

  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`No index.html found in ${dir}`);
  }

  const files = readDirectoryRecursive(dir);

  if (files.size > MAX_FILE_COUNT) {
    throw new Error(`Too many files: ${files.size} (max ${MAX_FILE_COUNT})`);
  }

  let totalSize = 0;
  for (const content of files.values()) {
    totalSize += content.length;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(`Total size too large: ${(totalSize / 1024 / 1024).toFixed(1)} MB (max 50 MB)`);
  }

  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(`Deploying ${files.size} files (${sizeMB} MB) to ${name}.is-an.ai...`);

  // Try update first, fall back to create on 404
  try {
    await deployHosting(auth.jwt, name, files, true);
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      await deployHosting(auth.jwt, name, files, false);
    } else {
      throw err;
    }
  }

  console.log(`✓ Deployed to https://${name}.is-an.ai`);
}
