#!/usr/bin/env node

import { Command } from "commander";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { check } from "./commands/check.js";
import { whoami } from "./commands/whoami.js";
import { list } from "./commands/list.js";
import { register } from "./commands/register.js";
import { update } from "./commands/update.js";
import { del } from "./commands/delete.js";
import { deploy } from "./commands/deploy.js";
import { hosting } from "./commands/hosting.js";
import { undeploy } from "./commands/undeploy.js";
import type { AuthMode } from "./lib/auth.js";

const program = new Command();

program
  .name("is-an-ai")
  .description("CLI for registering and managing is-an.ai subdomains")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with GitHub")
  .action(wrap(login));

program
  .command("logout")
  .description("Clear stored credentials")
  .action(wrap(logout));

program
  .command("whoami")
  .description("Show current user")
  .action(wrap(whoami));

program
  .command("check <name>")
  .description("Check subdomain availability")
  .action(wrap(check));

program
  .command("list")
  .description("List your subdomains (requires login)")
  .action(wrap(list));

program
  .command("register <name>")
  .description("Register a new subdomain")
  .requiredOption("-t, --type <type>", "DNS record type (A, AAAA, CNAME, TXT)")
  .requiredOption("-v, --value <value>", "DNS record value")
  .option("-d, --description <desc>", "Subdomain description")
  .option("-m, --mode <mode>", "Auth mode: api or pr")
  .option("-w, --wait", "Wait for PR to be merged (PR mode only)")
  .action(wrap((name: string, opts: any) =>
    register(name, opts))
  );

program
  .command("update <name>")
  .description("Update a subdomain")
  .requiredOption("-t, --type <type>", "DNS record type")
  .requiredOption("-v, --value <value>", "DNS record value")
  .option("-d, --description <desc>", "Subdomain description")
  .option("-m, --mode <mode>", "Auth mode: api or pr")
  .option("-w, --wait", "Wait for PR to be merged (PR mode only)")
  .action(wrap((name: string, opts: any) =>
    update(name, opts))
  );

program
  .command("delete <name>")
  .description("Delete a subdomain")
  .option("-m, --mode <mode>", "Auth mode: api or pr")
  .option("-w, --wait", "Wait for PR to be merged (PR mode only)")
  .action(wrap((name: string, opts: any) =>
    del(name, opts))
  );

program
  .command("deploy <name> [directory]")
  .description("Deploy static files to a subdomain")
  .action(wrap((name: string, directory?: string) =>
    deploy(name, directory))
  );

program
  .command("hosting <name>")
  .description("Show hosting status for a subdomain")
  .action(wrap(hosting));

program
  .command("undeploy <name>")
  .description("Remove hosting for a subdomain")
  .action(wrap(undeploy));

program.parse();

// Wrapper to handle async errors
function wrap(fn: (...args: any[]) => any) {
  return (...args: any[]) => {
    const result = fn(...args);
    if (result instanceof Promise) {
      result.catch((err: Error) => {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      });
    }
  };
}
