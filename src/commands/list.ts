import { resolveAuth } from "../lib/auth.js";
import { listMySubdomains } from "../lib/api-client.js";

export async function list(): Promise<void> {
  const auth = resolveAuth("api");

  if (!auth.jwt) {
    throw new Error("The `list` command requires login. Run `is-an-ai login` first.");
  }

  const subdomains = await listMySubdomains(auth.jwt);

  if (subdomains.length === 0) {
    console.log("No subdomains registered.");
    return;
  }

  for (const sub of subdomains) {
    const records = sub.record.map((r) => `${r.type}=${typeof r.value === "string" ? r.value : JSON.stringify(r.value)}`).join(", ");
    console.log(`  ${sub.subdomainName}.is-an.ai  ${records}`);
  }
}
