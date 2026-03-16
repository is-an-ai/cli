---
name: register-domain
description: Use when the user wants to register a subdomain, get a domain for their project, set up DNS records on is-an.ai, check domain availability, or manage existing is-an.ai subdomains. Trigger phrases include "register a domain", "get a subdomain", "is-an.ai", "set up DNS", "check if domain is available".
version: 0.1.0
---

# is-an.ai Domain Registration

Register and manage free `.is-an.ai` subdomains for AI projects using the `is-an-ai` CLI.

## Prerequisites

The CLI is available via npx (no installation needed):
```bash
npx is-an-ai <command>
```

## Available Commands

### Check availability
```bash
npx is-an-ai check <name>
```

### Register a subdomain
Two modes depending on authentication:

**API mode** (fast, requires login):
```bash
npx is-an-ai login
npx is-an-ai register <name> -t <type> -v <value> [-d <description>]
```

**PR mode** (no login needed, uses GITHUB_TOKEN):
```bash
npx is-an-ai register <name> -t <type> -v <value> --wait
```

### Update a subdomain
```bash
npx is-an-ai update <name> -t <type> -v <value>
```

### Delete a subdomain
```bash
npx is-an-ai delete <name>
```

### List my subdomains
```bash
npx is-an-ai list
```

## DNS Record Types

| Type | Value format | Example |
|------|-------------|---------|
| A | IPv4 address | `1.2.3.4` |
| AAAA | IPv6 address | `2001:db8::1` |
| CNAME | Domain name | `my-app.vercel.app` |
| TXT | Text string | `v=spf1 include:_spf.google.com ~all` |

## Workflow

1. First check if the desired subdomain is available
2. Register it with the appropriate DNS record type and value
3. If using `--wait` in PR mode, the command blocks until the domain is live

## Mode Selection

- If the user is logged in (`npx is-an-ai login`), use API mode for instant registration
- If GITHUB_TOKEN is available in the environment, use PR mode (creates a GitHub PR that auto-merges)
- PR mode is ideal for CI/CD and agent workflows where browser login isn't possible

## Common Scenarios

**Deploying to Vercel:**
```bash
npx is-an-ai register my-project -t CNAME -v my-project.vercel.app
```

**Pointing to a server:**
```bash
npx is-an-ai register my-project -t A -v 203.0.113.50
```

**Domain verification (vendor subdomains):**
```bash
npx is-an-ai register _vercel.my-project -t TXT -v "vc-domain-verify=..."
```
