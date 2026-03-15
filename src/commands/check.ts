import { checkAvailability } from "../lib/api-client.js";

export async function check(name: string): Promise<void> {
  const result = await checkAvailability(name);

  if (result.available) {
    console.log(`✓ ${name}.is-an.ai is available`);
  } else {
    console.log(`✗ ${name}.is-an.ai is not available${result.error ? `: ${result.error}` : ""}`);
    process.exitCode = 1;
  }
}
