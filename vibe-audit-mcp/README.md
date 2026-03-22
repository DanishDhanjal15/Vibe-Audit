# Vibe-Audit MCP Server

A **Model Context Protocol (MCP)** server that exposes Vibe-Audit's cybersecurity scanners as AI-callable tools. Connect it to any MCP-compatible AI assistant (Claude Desktop, Cursor, Antigravity, etc.) to enable real-time security auditing from within your AI workflow.

## 🔧 Available Tools

| Tool | Description |
|------|-------------|
| `scan_secrets` | Detect hardcoded API keys, passwords, tokens |
| `scan_compliance` | Find GDPR/SOC2 PII violations in schema files |
| `scan_cost` | Detect expensive AI model usage (gpt-4, claude-3-opus) |
| `scan_missing_tests` | Find source files with no unit test coverage |
| `audit_repo` | Full audit pipeline on a GitHub URL or local path — returns Vibe Score |
| `whois_lookup` | WHOIS registration info for a domain |
| `dns_lookup` | DNS resolution (A records + reverse DNS) |

## 🚀 Setup

### 1. Install dependencies
```bash
cd vibe-audit-mcp
pip install -r requirements.txt
```

### 2. Configure your AI client

#### Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "vibe-audit": {
      "command": "python",
      "args": ["C:/path/to/ACM 1/vibe-audit-mcp/server.py"]
    }
  }
}
```

#### Cursor / Antigravity:
Add to your MCP config:
```json
{
  "name": "vibe-audit",
  "command": "python",
  "args": ["C:/path/to/ACM 1/vibe-audit-mcp/server.py"]
}
```

## 💬 Example Usage

Once connected, ask your AI assistant:

> *"Scan C:/myproject for hardcoded secrets"*
> → Calls `scan_secrets` with `path = "C:/myproject"`

> *"Run a full audit on https://github.com/user/repo"*
> → Calls `audit_repo`, clones the repo, runs all scanners, returns Vibe Score

> *"What's the WHOIS info for example.com?"*
> → Calls `whois_lookup`

## 🗂️ Architecture

```
vibe-audit-mcp/
  server.py          ← MCP server (this file)
  requirements.txt   ← Only needs: mcp>=1.3.0

vibe-audit-backend/
  app/scanners/      ← Scanner logic (imported by server.py)
    secrets.py
    compliance.py
    cost_efficiency.py
    missing_tests.py
```

The MCP server imports scanner logic directly from the backend — no HTTP calls needed, everything runs locally.
