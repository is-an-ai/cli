import { loadConfig } from "../lib/config.js";

export function whoami(): void {
  const config = loadConfig();
  if (!config?.user) {
    console.log("Not logged in. Run `is-an-ai login` to authenticate.");
    process.exitCode = 1;
    return;
  }
  console.log(`${config.user.name} (${config.user.email})`);
}
