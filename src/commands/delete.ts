import { resolveAuth, type AuthMode } from "../lib/auth.js";
import { deleteSubdomain } from "../lib/api-client.js";
import { deleteRecordPR, getPRStatus } from "../lib/github-client.js";

interface DeleteOptions {
  mode?: AuthMode;
  wait?: boolean;
}

export async function del(name: string, options: DeleteOptions): Promise<void> {
  const auth = resolveAuth(options.mode);

  if (auth.mode === "api") {
    await deleteSubdomain(auth.jwt!, name);
    console.log(`✓ Deleted ${name}.is-an.ai`);
    return;
  }

  // PR mode
  console.log(`Creating PR to delete ${name}.is-an.ai...`);
  const { prUrl, prNumber } = await deleteRecordPR(auth.githubToken!, name);
  console.log(`✓ PR created: ${prUrl}`);

  if (options.wait) {
    console.log("Waiting for auto-merge...");
    await waitForMerge(auth.githubToken!, prNumber);
    console.log(`✓ ${name}.is-an.ai deleted`);
  }
}

async function waitForMerge(token: string, prNumber: number, timeoutMs = 300000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const pr = await getPRStatus(token, prNumber);
    if (pr.merged) return;
    if (pr.state === "closed") throw new Error("PR was closed without merging. Check CI errors.");
  }
  throw new Error("Timed out waiting for PR merge.");
}
