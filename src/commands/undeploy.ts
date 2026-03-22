import * as readline from "node:readline";
import { resolveAuth } from "../lib/auth.js";
import { deleteHosting } from "../lib/api-client.js";

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

export async function undeploy(name: string): Promise<void> {
  const auth = resolveAuth("api");
  if (!auth.jwt) {
    throw new Error("The `undeploy` command requires login. Run `is-an-ai login` first.");
  }

  const confirmed = await confirm(`Remove hosting for ${name}.is-an.ai?`);
  if (!confirmed) {
    console.log("Cancelled.");
    return;
  }

  await deleteHosting(auth.jwt, name);
  console.log(`✓ Removed hosting for ${name}.is-an.ai`);
}
