---
name: deploy-site
description: Use when the user wants to deploy a static site, host a website, upload files to is-an.ai, or set up static hosting. Trigger phrases include "deploy my site", "host this", "upload to is-an.ai", "static hosting", "deploy to subdomain".
version: 0.1.0
---

# is-an.ai Static Site Hosting

Deploy static sites and SPAs to free `.is-an.ai` subdomains using the `is-an-ai` CLI.

## Prerequisites

Login is required for hosting:
```bash
npx is-an-ai login
```

## Deploy a site

```bash
npx is-an-ai deploy <name> [directory]
```

- `<name>`: subdomain name (e.g., `my-app` → `my-app.is-an.ai`)
- `[directory]`: path to static files (defaults to current directory)

The subdomain is auto-registered on first deploy. Subsequent deploys update the files.

## Framework Examples

**React / Vite:**
```bash
npm run build
npx is-an-ai deploy my-app ./dist
```

**Next.js (static export):**
```bash
npm run build
npx is-an-ai deploy my-app ./out
```

**Plain HTML:**
```bash
npx is-an-ai deploy my-app ./
```

## SPA Routing

All hosted sites support SPA routing automatically. Any path that doesn't match a file falls back to `index.html`.

## Check hosting status

```bash
npx is-an-ai hosting <name>
```

Shows file count, total size, and last deployment time.

## Remove hosting

```bash
npx is-an-ai undeploy <name>
```

Removes all hosted files and the subdomain.

## Limits

- Max total size: 50 MB
- Max files: 1,000
- Max single file: 10 MB
- Must include `index.html`

## Workflow

1. Build your project (`npm run build`)
2. Deploy: `npx is-an-ai deploy my-app ./dist`
3. Site is live at `https://my-app.is-an.ai`
4. To update, just run deploy again — files are replaced automatically
