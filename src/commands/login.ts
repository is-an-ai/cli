import { saveConfig } from "../lib/config.js";
import { exchangeGithubToken } from "../lib/api-client.js";

const GITHUB_CLIENT_ID = "Ov23li3wivu1lGpQUdi5"; // is-an.ai OAuth App
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const TOKEN_URL = "https://github.com/login/oauth/access_token";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
}

interface TokenPollResponse {
  access_token?: string;
  error?: string;
}

export async function login(): Promise<void> {
  console.log("Authenticating with GitHub...\n");

  // Step 1: Request device code
  const deviceRes = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "user:email" }),
  });

  if (!deviceRes.ok) {
    throw new Error("Failed to initiate device flow. Is Device Flow enabled on the OAuth App?");
  }

  const device = (await deviceRes.json()) as DeviceCodeResponse;

  console.log(`  Open:  ${device.verification_uri}`);
  console.log(`  Code:  ${device.user_code}\n`);

  // Try to open browser
  try {
    const { exec } = await import("child_process");
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} ${device.verification_uri}`);
  } catch {
    // Ignore if browser can't be opened
  }

  console.log("Waiting for authorization...");

  // Step 2: Poll for token
  const interval = (device.interval || 5) * 1000;
  const deadline = Date.now() + device.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: device.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = (await tokenRes.json()) as TokenPollResponse;

    if (data.access_token) {
      // Step 3: Exchange for is-an.ai JWT
      const result = await exchangeGithubToken(data.access_token);
      saveConfig({ jwt: result.token, user: result.user });
      console.log(`\n✓ Logged in as ${result.user.name} (${result.user.email})`);
      return;
    }

    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (data.error === "expired_token") {
      throw new Error("Authorization expired. Please try again.");
    }
    if (data.error === "access_denied") {
      throw new Error("Authorization denied.");
    }
  }

  throw new Error("Authorization timed out.");
}
