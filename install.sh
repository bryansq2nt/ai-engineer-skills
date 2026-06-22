#!/usr/bin/env bash
# Install (or remove) the ai-engineer-skills into ~/.claude/skills/ via symlink,
# so `git pull` in this repo updates the skills everywhere. Idempotent.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
SKILLS=(engineer-start engineer-audit)

if [ "${1:-}" = "--uninstall" ]; then
  for s in "${SKILLS[@]}"; do
    if [ -L "$SKILLS_DIR/$s" ]; then rm "$SKILLS_DIR/$s"; echo "removed  $SKILLS_DIR/$s"; fi
  done
  echo "✅ uninstalled."
  exit 0
fi

mkdir -p "$SKILLS_DIR"
for s in "${SKILLS[@]}"; do
  src="$REPO_DIR/$s"
  dest="$SKILLS_DIR/$s"
  if [ ! -d "$src" ]; then echo "❌ missing $src" >&2; exit 1; fi
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    echo "❌ $dest exists and is not a symlink — refusing to overwrite. Move it aside first." >&2
    exit 1
  fi
  ln -sfn "$src" "$dest"
  echo "linked   $dest -> $src"
done

# Make the gate scripts executable (git may not preserve the bit on every platform).
chmod +x "$REPO_DIR"/engineer-start/templates/*/engineer/checks/*.sh 2>/dev/null || true
chmod +x "$REPO_DIR"/engineer-start/templates/*/.husky/* 2>/dev/null || true

echo ""
echo "✅ installed. In Claude Code, run /engineer-start or /engineer-audit from any project."
