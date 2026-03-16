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

/**
 * Determine the repo owner to use for creating branches.
 * If the user has push access to upstream, use upstream directly.
 * Otherwise, ensure a fork exists and return the fork owner.
 */
export async function resolveRepoOwner(token: string): Promise<string> {
  // Check if user has push access to upstream
  try {
    const repo = await ghRequest<{ permissions?: { push?: boolean } }>(
      token, `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}`
    );
    if (repo.permissions?.push) {
      return UPSTREAM_OWNER;
    }
  } catch {
    // No access, need fork
  }

  const user = await getUser(token);

  // Check if fork exists and is actually a fork of upstream
  try {
    const repo = await ghRequest<{ fork: boolean; parent?: { full_name: string } }>(
      token, `/repos/${user.login}/${UPSTREAM_REPO}`
    );
    if (repo.fork && repo.parent?.full_name === `${UPSTREAM_OWNER}/${UPSTREAM_REPO}`) {
      return user.login;
    }
  } catch {
    // Fork doesn't exist
  }

  // Create fork
  await ghRequest<GitHubFork>(token, `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/forks`, {
    method: "POST",
    body: {},
  });

  // Wait for fork to be ready
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const repo = await ghRequest<{ fork: boolean }>(token, `/repos/${user.login}/${UPSTREAM_REPO}`);
      if (repo.fork) return user.login;
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
  repoOwner: string,
  branch: string,
  title: string,
  body: string
): Promise<GitHubPR> {
  // If pushing to upstream directly, head is just the branch name
  // If pushing to a fork, head is "forkOwner:branch"
  const head = repoOwner === UPSTREAM_OWNER ? branch : `${repoOwner}:${branch}`;
  return ghRequest(token, `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls`, {
    method: "POST",
    body: { title, body, head, base: "main" },
  });
}

async function syncAndGetSha(token: string, repoOwner: string): Promise<string> {
  // Sync fork with upstream (only needed for forks)
  if (repoOwner !== UPSTREAM_OWNER) {
    try {
      await ghRequest(token, `/repos/${repoOwner}/${UPSTREAM_REPO}/merge-upstream`, {
        method: "POST",
        body: { branch: "main" },
      });
    } catch {
      // Ignore if already up to date
    }
  }
  return getMainSha(token, repoOwner);
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
  const repoOwner = await resolveRepoOwner(token);
  const branch = `add-${name}-${Date.now()}`;
  const filePath = `records/${name}.json`;

  const mainSha = await syncAndGetSha(token, repoOwner);
  await createBranch(token, repoOwner, branch, mainSha);

  const content = JSON.stringify(record, null, 3) + "\n";
  await createOrUpdateFile(token, repoOwner, filePath, content, `Add ${name}.is-an.ai`, branch);

  const pr = await createPR(token, repoOwner, branch, `Add ${name}.is-an.ai`, `Register subdomain \`${name}.is-an.ai\``);
  return { prUrl: pr.html_url, prNumber: pr.number };
}

export async function updateRecordPR(
  token: string,
  name: string,
  record: RecordFile
): Promise<{ prUrl: string; prNumber: number }> {
  const repoOwner = await resolveRepoOwner(token);
  const branch = `update-${name}-${Date.now()}`;
  const filePath = `records/${name}.json`;

  const mainSha = await syncAndGetSha(token, repoOwner);
  await createBranch(token, repoOwner, branch, mainSha);

  const existing = await getFileContent(token, repoOwner, filePath, branch);
  if (!existing) throw new Error(`Subdomain "${name}" not found in repository`);

  const content = JSON.stringify(record, null, 3) + "\n";
  await createOrUpdateFile(token, repoOwner, filePath, content, `Update ${name}.is-an.ai`, branch, existing.sha);

  const pr = await createPR(token, repoOwner, branch, `Update ${name}.is-an.ai`, `Update subdomain \`${name}.is-an.ai\``);
  return { prUrl: pr.html_url, prNumber: pr.number };
}

export async function deleteRecordPR(
  token: string,
  name: string
): Promise<{ prUrl: string; prNumber: number }> {
  const repoOwner = await resolveRepoOwner(token);
  const branch = `delete-${name}-${Date.now()}`;
  const filePath = `records/${name}.json`;

  const mainSha = await syncAndGetSha(token, repoOwner);
  await createBranch(token, repoOwner, branch, mainSha);

  const existing = await getFileContent(token, repoOwner, filePath, branch);
  if (!existing) throw new Error(`Subdomain "${name}" not found in repository`);

  await deleteFile(token, repoOwner, filePath, `Delete ${name}.is-an.ai`, branch, existing.sha);

  const pr = await createPR(token, repoOwner, branch, `Delete ${name}.is-an.ai`, `Delete subdomain \`${name}.is-an.ai\``);
  return { prUrl: pr.html_url, prNumber: pr.number };
}
