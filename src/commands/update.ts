import { resolveAuth, type AuthMode } from "../lib/auth.js";
import { updateSubdomain } from "../lib/api-client.js";
import { updateRecordPR, getUser, getPRStatus } from "../lib/github-client.js";
import type { DNSRecord, RecordFile } from "../types.js";

interface UpdateOptions {
  type: string;
  value: string;
  description?: string;
  mode?: AuthMode;
  wait?: boolean;
}

export async function update(name: string, options: UpdateOptions): Promise<void> {
  const record: DNSRecord = {
    type: options.type.toUpperCase() as DNSRecord["type"],
    value: options.value,
  };

  const auth = resolveAuth(options.mode);

  if (auth.mode === "api") {
    const result = await updateSubdomain(auth.jwt!, name, {
      description: options.description,
      record: [record],
    });
    console.log(`✓ Updated ${result.subdomainName}.is-an.ai`);
    return;
  }

  // PR mode
  const ghUser = await getUser(auth.githubToken!);
  if (!ghUser.email) {
    console.error(
      "Your GitHub email is not public. Set it at https://github.com/settings/profile\n" +
      "or use `is-an-ai login` for API mode instead."
    );
    process.exitCode = 1;
    return;
  }

  const recordFile: RecordFile = {
    description: options.description || "",
    owner: {
      github_username: ghUser.login,
      email: ghUser.email,
    },
    record: [record],
  };

  console.log(`Creating PR to update ${name}.is-an.ai...`);
  const { prUrl, prNumber } = await updateRecordPR(auth.githubToken!, name, recordFile);
  console.log(`✓ PR created: ${prUrl}`);

  if (options.wait) {
    console.log("Waiting for auto-merge...");
    await waitForMerge(auth.githubToken!, prNumber);
    console.log(`✓ ${name}.is-an.ai updated`);
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
