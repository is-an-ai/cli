# is-an-ai CLI

Register and manage free `.is-an.ai` subdomains from your terminal.

## Install

No installation needed — use via `npx`:

```bash
npx is-an-ai <command>
```

Or install globally:

```bash
npm install -g is-an-ai
```

## Quick Start

```bash
# Check if a subdomain is available
npx is-an-ai check my-project

# Register a subdomain
npx is-an-ai register my-project -t CNAME -v my-project.vercel.app
```

## Commands

| Command | Description |
|---------|-------------|
| `check <name>` | Check subdomain availability |
| `register <name>` | Register a new subdomain |
| `update <name>` | Update an existing subdomain |
| `delete <name>` | Delete a subdomain |
| `list` | List your subdomains (requires login) |
| `login` | Authenticate with GitHub |
| `logout` | Clear stored credentials |
| `whoami` | Show current user |

## Two Modes

### API Mode (fast, interactive)

Login once, then register instantly:

```bash
npx is-an-ai login        # Opens browser for GitHub auth
npx is-an-ai register my-project -t A -v 1.2.3.4
```

### PR Mode (no login, CI/agent friendly)

Uses your existing GitHub token to create a PR that auto-merges:

```bash
# Uses GITHUB_TOKEN env var or `gh auth token`
npx is-an-ai register my-project -t A -v 1.2.3.4 --wait
```

The `--wait` flag blocks until the PR is merged and DNS is deployed.

## DNS Record Types

```bash
# A record (IPv4)
npx is-an-ai register my-app -t A -v 203.0.113.50

# CNAME (domain alias)
npx is-an-ai register my-app -t CNAME -v my-app.vercel.app

# TXT record
npx is-an-ai register my-app -t TXT -v "v=spf1 include:_spf.google.com ~all"

# AAAA record (IPv6)
npx is-an-ai register my-app -t AAAA -v 2001:db8::1
```

## Options

```bash
npx is-an-ai register <name> [options]
  -t, --type <type>      DNS record type (A, AAAA, CNAME, TXT)
  -v, --value <value>    DNS record value
  -d, --description      Subdomain description
  -m, --mode <mode>      Force auth mode: "api" or "pr"
  -w, --wait             Wait for PR merge (PR mode only)
```

## Agent / Plugin Support

This CLI is available as a plugin for AI coding agents:

- **Claude Code**: `/plugin install is-an-ai/cli`
- **OpenClaw**: `openclaw plugins install github:is-an-ai/cli`

## Links

- Website: https://is-an.ai
- Records repo: https://github.com/is-an-ai/is-an.ai
- npm: https://www.npmjs.com/package/is-an-ai

## License

MIT
