import type { RecordFile } from "../types.js";

const GITHUB_API = "https://api.github.com";
const UPSTREAM_OWNER = "is-an-ai";
const UPSTREAM_REPO = "is-an.ai";

async function ghRequest<T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "is-an-ai-cli",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`GitHub API ${res.status}: ${(error as { message?: string }).message || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

interface GitHubUser {
  login: string;
  id: number;
  email: string | null;
}

interface GitHubFork {
  full_name: string;
  owner: { login: string };
}

interface GitHubRef {
  ref: string;
  object: { sha: string };
}

interface GitHubContent {
  sha: string;
  content?: string;
}

interface GitHubPR {
  number: number;
  html_url: string;
  state: string;
  merged: boolean;
}

export async function getUser(token: string): Promise<GitHubUser> {
  return ghRequest(token, "/user");
}

export async function ensureFork(token: string): Promise<string> {
  const user = await getUser(token);

  // Check if fork exists
  try {
    await ghRequest(token, `/repos/${user.login}/${UPSTREAM_REPO}`);
    return user.login;
  } catch {
    // Fork doesn't exist, create it
  }

  await ghRequest<GitHubFork>(token, `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/forks`, {
    method: "POST",
    body: {},
  });

  // Wait for fork to be ready
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await ghRequest(token, `/repos/${user.login}/${UPSTREAM_REPO}`);
      return user.login;
    } catch {
      // Not ready yet
    }
  }

  throw new Error("Fork creation timed out. Try again in a minute.");
}

async function getMainSha(token: string, owner: string): Promise<string> {
  const ref = await ghRequest<GitHubRef>(token, `/repos/${owner}/${UPSTREAM_REPO}/git/ref/heads/main`);
  return ref.object.sha;
}

async function createBranch(token: string, owner: string, branch: string, sha: string): Promise<void> {
  await ghRequest(token, `/repos/${owner}/${UPSTREAM_REPO}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha },
  });
}

async function getFileContent(
  token: string,
  owner: string,
  filePath: string,
  ref?: string
): Promise<GitHubContent | null> {
  try {
    const query = ref ? `?ref=${ref}` : "";
    return await ghRequest(token, `/repos/${owner}/${UPSTREAM_REPO}/contents/${filePath}${query}`);
  } catch {
    return null;
  }
}

async function createOrUpdateFile(
  token: string,
  owner: string,
  filePath: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<void> {
  await ghRequest(token, `/repos/${owner}/${UPSTREAM_REPO}/contents/${filePath}`, {
    method: "PUT",
    body: {
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    },
  });
}

async function deleteFile(
  token: string,
  owner: string,
  filePath: string,
  message: string,
  branch: string,
  sha: string
): Promise<void> {
  await ghRequest(token, `/repos/${owner}/${UPSTREAM_REPO}/contents/${filePath}`, {
    method: "DELETE",
    body: { message, sha, branch },
  });
}

async function createPR(
  token: string,
  forkOwner: string,
  branch: string,
  title: string,
  body: string
): Promise<GitHubPR> {
  return ghRequest(token, `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls`, {
    method: "POST",
    body: {
      title,
      body,
      head: `${forkOwner}:${branch}`,
      base: "main",
    },
  });
}

export async function getPRStatus(token: string, prNumber: number): Promise<GitHubPR> {
  return ghRequest(token, `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls/${prNumber}`);
}

// --- High-level operations ---

export async function createRecordPR(
  token: string,
  name: string,
  record: RecordFile
): Promise<{ prUrl: string; prNumber: number }> {
  const forkOwner = await ensureFork(token);
  const mainSha = await getMainSha(token, UPSTREAM_OWNER);
  const branch = `add-${name}-${Date.now()}`;
  const filePath = `records/${name}.json`;

  // Sync fork's main with upstream
  try {
    await ghRequest(token, `/repos/${forkOwner}/${UPSTREAM_REPO}/merge-upstream`, {
      method: "POST",
      body: { branch: "main" },
    });
  } catch {
    // Ignore if already up to date
  }

  const forkMainSha = await getMainSha(token, forkOwner);
  await createBranch(token, forkOwner, branch, forkMainSha);

  const content = JSON.stringify(record, null, 3) + "\n";
  await createOrUpdateFile(token, forkOwner, filePath, content, `Add ${name}.is-an.ai`, branch);

  const pr = await createPR(token, forkOwner, branch, `Add ${name}.is-an.ai`, `Register subdomain \`${name}.is-an.ai\``);

  return { prUrl: pr.html_url, prNumber: pr.number };
}

export async function updateRecordPR(
  token: string,
  name: string,
  record: RecordFile
): Promise<{ prUrl: string; prNumber: number }> {
  const forkOwner = await ensureFork(token);
  const branch = `update-${name}-${Date.now()}`;
  const filePath = `records/${name}.json`;

  // Get existing file SHA from upstream
  const existing = await getFileContent(token, UPSTREAM_OWNER, filePath, "main");
  if (!existing) throw new Error(`Subdomain "${name}" not found in repository`);

  // Sync fork
  try {
    await ghRequest(token, `/repos/${forkOwner}/${UPSTREAM_REPO}/merge-upstream`, {
      method: "POST",
      body: { branch: "main" },
    });
  } catch { /* ignore */ }

  const forkMainSha = await getMainSha(token, forkOwner);
  await createBranch(token, forkOwner, branch, forkMainSha);

  // Get file SHA on the fork's new branch (same as upstream after sync)
  const forkFile = await getFileContent(token, forkOwner, filePath, branch);
  const content = JSON.stringify(record, null, 3) + "\n";
  await createOrUpdateFile(token, forkOwner, filePath, content, `Update ${name}.is-an.ai`, branch, forkFile?.sha);

  const pr = await createPR(token, forkOwner, branch, `Update ${name}.is-an.ai`, `Update subdomain \`${name}.is-an.ai\``);

  return { prUrl: pr.html_url, prNumber: pr.number };
}

export async function deleteRecordPR(
  token: string,
  name: string
): Promise<{ prUrl: string; prNumber: number }> {
  const forkOwner = await ensureFork(token);
  const branch = `delete-${name}-${Date.now()}`;
  const filePath = `records/${name}.json`;

  // Sync fork
  try {
    await ghRequest(token, `/repos/${forkOwner}/${UPSTREAM_REPO}/merge-upstream`, {
      method: "POST",
      body: { branch: "main" },
    });
  } catch { /* ignore */ }

  const forkMainSha = await getMainSha(token, forkOwner);
  await createBranch(token, forkOwner, branch, forkMainSha);

  const forkFile = await getFileContent(token, forkOwner, filePath, branch);
  if (!forkFile) throw new Error(`Subdomain "${name}" not found in repository`);

  await deleteFile(token, forkOwner, filePath, `Delete ${name}.is-an.ai`, branch, forkFile.sha);

  const pr = await createPR(token, forkOwner, branch, `Delete ${name}.is-an.ai`, `Delete subdomain \`${name}.is-an.ai\``);

  return { prUrl: pr.html_url, prNumber: pr.number };
}
