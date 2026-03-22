import type { DNSRecord, HostingResponse, HostingStatus, Subdomain } from "../types.js";

const API_BASE = "https://api.is-an.ai";

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; jwt?: string } = {}
): Promise<T> {
  const { method = "GET", body, jwt } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "is-an-ai-cli",
  };
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((error as { message?: string }).message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function checkAvailability(name: string): Promise<{ available: boolean; error?: string }> {
  return request(`/v2/domain/available/${encodeURIComponent(name)}`);
}

export async function createSubdomain(
  jwt: string,
  data: { subdomainName: string; description: string; record: DNSRecord[] }
): Promise<Subdomain> {
  return request("/v3/domain", { method: "POST", body: data, jwt });
}

export async function updateSubdomain(
  jwt: string,
  name: string,
  data: { description?: string; record?: DNSRecord[] }
): Promise<Subdomain> {
  return request(`/v3/domain/${encodeURIComponent(name)}`, { method: "PUT", body: data, jwt });
}

export async function deleteSubdomain(jwt: string, name: string): Promise<void> {
  await request(`/v3/domain/${encodeURIComponent(name)}`, { method: "DELETE", jwt });
}

export async function listMySubdomains(jwt: string): Promise<Subdomain[]> {
  return request("/v3/domain/my", { jwt });
}

export async function exchangeGithubToken(githubToken: string): Promise<{
  token: string;
  user: { id: string; name: string; email: string };
}> {
  return request("/v1/user/auth/github/device", {
    method: "POST",
    body: { github_access_token: githubToken },
  });
}

export async function deployHosting(
  jwt: string,
  name: string,
  files: Map<string, Buffer>,
  isUpdate: boolean
): Promise<HostingResponse> {
  const formData = new FormData();
  for (const [path, content] of files) {
    formData.append(path, new Blob([new Uint8Array(content)]));
  }

  const method = isUpdate ? "PUT" : "POST";
  const res = await fetch(`${API_BASE}/v3/hosting/${encodeURIComponent(name)}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "is-an-ai-cli",
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((error as { message?: string }).message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<HostingResponse>;
}

export async function getHosting(jwt: string, name: string): Promise<HostingStatus> {
  return request(`/v3/hosting/${encodeURIComponent(name)}`, { jwt });
}

export async function deleteHosting(jwt: string, name: string): Promise<void> {
  await request(`/v3/hosting/${encodeURIComponent(name)}`, { method: "DELETE", jwt });
}
