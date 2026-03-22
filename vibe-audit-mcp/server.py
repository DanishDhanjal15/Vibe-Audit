"""
Vibe-Audit MCP Server — Cybersecurity tools for AI assistants.

Exposes the following tools:
  • scan_secrets        — Detect hardcoded API keys / passwords / tokens
  • scan_compliance     — Detect PII stored without encryption (GDPR/SOC2)
  • scan_cost           — Detect expensive AI model usage in code
  • scan_missing_tests  — Find source files with no test coverage
  • audit_repo          — Full audit pipeline with Vibe Score
  • whois_lookup        — WHOIS info for a domain
  • dns_lookup          — DNS records for a domain
"""

import os
import re
import sys
import json
import socket
import tempfile
import shutil
import subprocess
from pathlib import Path

import mcp.server.stdio
import mcp.types as types
from mcp.server import Server

# ─── Add backend scanner modules to path ──────────────────────────────────────
BACKEND_DIR = Path(__file__).parent.parent / "vibe-audit-backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.scanners.secrets import scan_secrets
from app.scanners.compliance import scan_compliance
from app.scanners.cost_efficiency import scan_cost_efficiency
from app.scanners.missing_tests import scan_missing_tests

# ─── MCP Server setup ─────────────────────────────────────────────────────────
server = Server("vibe-audit-security")


# ─── Helper ───────────────────────────────────────────────────────────────────
def _fmt_issues(issues: list, label: str) -> str:
    if not issues:
        return f"✅ No {label} issues found."
    lines = [f"🔴 Found {len(issues)} {label} issue(s):\n"]
    for i, issue in enumerate(issues, 1):
        loc = f"{issue.get('file', 'unknown')}:{issue.get('line', '')}"
        lines.append(
            f"{i}. [{issue.get('severity','?')}] {issue.get('type','Issue')}\n"
            f"   📍 {loc}\n"
            f"   ℹ️  {issue.get('description','')}\n"
            f"   🔧 {issue.get('remediation','')}\n"
        )
    return "\n".join(lines)


# ─── Tool Definitions ─────────────────────────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="scan_secrets",
            description=(
                "Scan a local directory for hardcoded secrets: API keys, "
                "passwords, tokens (AWS, Stripe, generic patterns). "
                "Returns every match with file path, line number, and remediation."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the directory to scan."
                    }
                },
                "required": ["path"]
            }
        ),
        types.Tool(
            name="scan_compliance",
            description=(
                "Scan a local directory for GDPR/SOC2 compliance issues: "
                "PII fields (SSN, credit card, password) stored without "
                "encryption or hashing in schema/model files."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the directory to scan."
                    }
                },
                "required": ["path"]
            }
        ),
        types.Tool(
            name="scan_cost",
            description=(
                "Scan a local directory for expensive AI model usage: "
                "detects usage of high-cost models (e.g. gpt-4, claude-3-opus, "
                "gemini-1.5-pro) and suggests cheaper alternatives."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the directory to scan."
                    }
                },
                "required": ["path"]
            }
        ),
        types.Tool(
            name="scan_missing_tests",
            description=(
                "Scan a local directory for source files that have no "
                "corresponding unit test file. Works for Python (.py) "
                "and JavaScript/TypeScript (.js, .jsx, .ts, .tsx)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the directory to scan."
                    }
                },
                "required": ["path"]
            }
        ),
        types.Tool(
            name="audit_repo",
            description=(
                "Run a FULL security audit on a GitHub repository URL or local path. "
                "Runs all scanners (secrets, compliance, cost, missing tests) and "
                "returns a Vibe Score (0-100) plus all issues ranked by severity."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "target": {
                        "type": "string",
                        "description": (
                            "Either a GitHub repo URL (https://github.com/...) "
                            "or an absolute local directory path."
                        )
                    }
                },
                "required": ["target"]
            }
        ),
        types.Tool(
            name="whois_lookup",
            description="Get WHOIS registration info for a domain name.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {
                        "type": "string",
                        "description": "Domain name to look up (e.g. example.com)."
                    }
                },
                "required": ["domain"]
            }
        ),
        types.Tool(
            name="dns_lookup",
            description=(
                "Resolve DNS records for a domain. Returns IP addresses (A records). "
                "Useful for reconnaissance and infrastructure mapping."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {
                        "type": "string",
                        "description": "Domain name to resolve (e.g. example.com)."
                    }
                },
                "required": ["domain"]
            }
        ),
    ]


# ─── Tool Handlers ────────────────────────────────────────────────────────────

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:

    # ── scan_secrets ──────────────────────────────────────────────────────────
    if name == "scan_secrets":
        path = arguments["path"]
        if not os.path.isdir(path):
            return [types.TextContent(type="text", text=f"❌ Directory not found: {path}")]
        issues = scan_secrets(path)
        return [types.TextContent(type="text", text=_fmt_issues(issues, "secret"))]

    # ── scan_compliance ───────────────────────────────────────────────────────
    elif name == "scan_compliance":
        path = arguments["path"]
        if not os.path.isdir(path):
            return [types.TextContent(type="text", text=f"❌ Directory not found: {path}")]
        issues = scan_compliance(path)
        return [types.TextContent(type="text", text=_fmt_issues(issues, "compliance"))]

    # ── scan_cost ─────────────────────────────────────────────────────────────
    elif name == "scan_cost":
        path = arguments["path"]
        if not os.path.isdir(path):
            return [types.TextContent(type="text", text=f"❌ Directory not found: {path}")]
        issues = scan_cost_efficiency(path)
        return [types.TextContent(type="text", text=_fmt_issues(issues, "cost"))]

    # ── scan_missing_tests ────────────────────────────────────────────────────
    elif name == "scan_missing_tests":
        path = arguments["path"]
        if not os.path.isdir(path):
            return [types.TextContent(type="text", text=f"❌ Directory not found: {path}")]
        issues = scan_missing_tests(path)
        return [types.TextContent(type="text", text=_fmt_issues(issues, "missing-test"))]

    # ── audit_repo ────────────────────────────────────────────────────────────
    elif name == "audit_repo":
        target = arguments["target"]
        tmp_dir = None
        repo_path = target

        try:
            # Clone if it's a GitHub URL
            if target.startswith("http"):
                tmp_dir = tempfile.mkdtemp(prefix="mcp_audit_")
                result = subprocess.run(
                    ["git", "clone", "--depth=1", target, tmp_dir],
                    capture_output=True, text=True, timeout=60
                )
                if result.returncode != 0:
                    return [types.TextContent(type="text", text=f"❌ Clone failed: {result.stderr}")]
                repo_path = tmp_dir

            if not os.path.isdir(repo_path):
                return [types.TextContent(type="text", text=f"❌ Directory not found: {repo_path}")]

            # Run all scanners
            all_issues = []
            all_issues += scan_secrets(repo_path)
            all_issues += scan_compliance(repo_path)
            all_issues += scan_cost_efficiency(repo_path)
            all_issues += scan_missing_tests(repo_path)

            # Calculate Vibe Score
            severity_weights = {"CRITICAL": 20, "HIGH": 10, "MEDIUM": 5, "LOW": 2}
            penalty = sum(severity_weights.get(i.get("severity", "LOW"), 2) for i in all_issues)
            score = max(0, 100 - penalty)

            # Format output
            emoji = "🟢" if score >= 80 else "🟡" if score >= 50 else "🔴"
            lines = [
                f"{emoji} Vibe Score: {score}/100",
                f"📊 Total Issues: {len(all_issues)}\n",
            ]

            for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                issues_for_sev = [i for i in all_issues if i.get("severity") == sev]
                if issues_for_sev:
                    lines.append(f"{'🔴' if sev=='CRITICAL' else '🟠' if sev=='HIGH' else '🟡' if sev=='MEDIUM' else '🔵'} {sev} ({len(issues_for_sev)})")
                    for issue in issues_for_sev:
                        loc = f"{issue.get('file','?')}:{issue.get('line','')}"
                        lines.append(f"  • [{issue.get('type')}] {loc}")
                        lines.append(f"    {issue.get('description','')}")
                    lines.append("")

            return [types.TextContent(type="text", text="\n".join(lines))]

        finally:
            if tmp_dir and os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)

    # ── whois_lookup ──────────────────────────────────────────────────────────
    elif name == "whois_lookup":
        domain = arguments["domain"]
        try:
            result = subprocess.run(
                ["whois", domain], capture_output=True, text=True, timeout=15
            )
            output = result.stdout or result.stderr or "No WHOIS data returned."
            # Trim to key lines
            relevant = []
            keywords = ["registrar", "registered", "expir", "name server", "status", "registrant", "created", "updated"]
            for line in output.splitlines():
                if any(kw in line.lower() for kw in keywords):
                    relevant.append(line.strip())
            summary = "\n".join(relevant[:30]) if relevant else output[:2000]
            return [types.TextContent(type="text", text=f"🔍 WHOIS for {domain}:\n\n{summary}")]
        except FileNotFoundError:
            return [types.TextContent(type="text", text="❌ `whois` command not available on this system. Install it via `sudo apt install whois` (Linux) or use an online lookup.")]
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ Error: {e}")]

    # ── dns_lookup ────────────────────────────────────────────────────────────
    elif name == "dns_lookup":
        domain = arguments["domain"]
        try:
            addr_info = socket.getaddrinfo(domain, None)
            ips = sorted(set(info[4][0] for info in addr_info))
            lines = [f"🌐 DNS lookup for {domain}:", f"", f"IP Addresses:"]
            for ip in ips:
                lines.append(f"  • {ip}")
            # Reverse DNS
            try:
                hostname = socket.gethostbyaddr(ips[0])[0]
                lines.append(f"\nReverse DNS: {hostname}")
            except Exception:
                pass
            return [types.TextContent(type="text", text="\n".join(lines))]
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ DNS lookup failed: {e}")]

    else:
        return [types.TextContent(type="text", text=f"❌ Unknown tool: {name}")]


# ─── Entry point ──────────────────────────────────────────────────────────────
async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
