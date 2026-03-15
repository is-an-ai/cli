import { clearConfig } from "../lib/config.js";

export function logout(): void {
  clearConfig();
  console.log("✓ Logged out");
}
