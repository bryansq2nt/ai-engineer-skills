#!/usr/bin/env bash
# Enforces F2: a backend secret must never be exposed to the client.
# Flags any NEXT_PUBLIC_* var whose name implies a secret. Runs in pre-commit AND CI.
set -euo pipefail

# Search tracked source only; ignore the framework's own docs/checks.
pattern='NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE|CREDENTIAL)'

# Allow a documented exception list (e.g. NEXT_PUBLIC_SUPABASE_ANON_KEY is public by design).
allow='NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY|NEXT_PUBLIC_POSTHOG_KEY'

hits=$(grep -REno "$pattern" \
        --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
        --include='*.env*' \
        --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=engineer \
        . 2>/dev/null | grep -Ev "$allow" || true)

if [ -n "$hits" ]; then
  echo "❌ F2: backend secret(s) exposed to the browser via NEXT_PUBLIC_*:" >&2
  echo "$hits" >&2
  echo "" >&2
  echo "Move these to a server-only variable. If a value is genuinely public, add it to the" >&2
  echo "allow-list in engineer/checks/no-browser-secrets.sh with a comment explaining why." >&2
  exit 1
fi
echo "✅ F2: no browser-exposed secrets."
