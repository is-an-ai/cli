import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Config } from "../types.js";

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg || join(homedir(), ".config");
  return join(base, "is-an-ai");
}

function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function loadConfig(): Config | null {
  try {
    const data = readFileSync(getConfigPath(), "utf-8");
    return JSON.parse(data) as Config;
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

export function clearConfig(): void {
  try {
    unlinkSync(getConfigPath());
  } catch {
    // Ignore if file doesn't exist
  }
}
