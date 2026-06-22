#!/usr/bin/env bash
# Enforces F9: build artifacts, deps, and real .env files must never be tracked in git.
set -euo pipefail

bad=$(git ls-files | grep -E '(^|/)(node_modules|\.next|dist|build|coverage|\.venv|__pycache__|Library)/|(^|/)\.env$|(^|/)\.env\.(local|production|development)$' || true)

if [ -n "$bad" ]; then
  echo "❌ F9: artifacts / deps / env files are tracked in git:" >&2
  echo "$bad" >&2
  echo "" >&2
  echo "Run: git rm -r --cached <path> and confirm .gitignore covers it." >&2
  exit 1
fi
echo "✅ F9: no tracked artifacts or env files."
