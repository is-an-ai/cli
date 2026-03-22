import { resolveAuth } from "../lib/auth.js";
import { getHosting } from "../lib/api-client.js";

export async function hosting(name: string): Promise<void> {
  const auth = resolveAuth("api");
  if (!auth.jwt) {
    throw new Error("The `hosting` command requires login. Run `is-an-ai login` first.");
  }

  const status = await getHosting(auth.jwt, name);

  console.log(`  Subdomain:     ${status.subdomain}.is-an.ai`);
  console.log(`  URL:           ${status.url}`);
  console.log(`  Files:         ${status.fileCount}`);
  console.log(`  Total size:    ${(status.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Last deployed: ${status.lastDeployedAt}`);
}
