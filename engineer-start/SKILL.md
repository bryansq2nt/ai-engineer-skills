---
name: engineer-start
description: Scaffold a project with machine-enforced engineering discipline — AI rule files (CLAUDE.md, AGENTS.md, .cursorrules), a real quality gate (lint+typecheck+test+build), GitHub Actions CI, a pre-commit hook, hardened .gitignore, secret/artifact checks, and git+branch-protection bootstrap. Use when starting a new project or hardening a fresh one, or when the user runs /engineer-start.
argument-hint: "[target-dir] [--stack nextjs] [--no-github]"
allowed-tools: Bash, Read, Write, Edit
---

# /engineer-start — make "correct" the default state of a repo

You scaffold a project so its engineering standards are **enforced by machines, not remembered by
people**. The guiding principle: *generate the gate, don't recommend it.* Every standard in
`reference/failure-ledger.md` traces to a real, repeated failure; every gate you install enforces
one. Read `reference/failure-ledger.md` and `reference/definition-of-done.md` before scaffolding.

Templates live next to this file under `templates/` (single source of truth — updating the skill
updates every future scaffold). `{{PLACEHOLDERS}}` get filled at install time.

## Step 0 — Resolve target & stack
- Target dir = first arg, else the current working directory.
- Stack = `--stack` value, else detect: `next.config.*`/`package.json` → `nextjs`; `pyproject.toml`/`requirements.txt` → `python` (not built yet — say so and stop). Default `nextjs`.
- If the dir already has a `CLAUDE.md`/`.git`/CI, **do not clobber**. Diff against the template and ask before overwriting each conflicting file. Idempotent re-runs must be safe.

## Step 1 — Lay down the AI rule files (common/)
Copy `templates/common/` into the target, substituting `{{PROJECT_NAME}}`, `{{STACK}}`,
`{{QUALITY_CMD}}` (e.g. `npm run quality`). Rename `gitignore.template` → `.gitignore` (merge,
don't overwrite, if one exists). These give Claude, Codex, and Cursor the same Definition of Done.

## Step 2 — Lay down the enforcement layer (stack templates/)
Copy `templates/<stack>/` into the target:
- `.github/workflows/quality.yml` — the authoritative gate.
- `engineer/checks/*.sh` — the F2 (browser secrets) and F9 (tracked artifacts) checks. `chmod +x`.
- `.husky/pre-commit` — the fast local gate. `chmod +x`.
- `__tests__/auth-fails-closed.example.test.ts` — the F1 fail-closed proof (template to adapt).
- Copy `reference/failure-ledger.md` and `reference/definition-of-done.md` into the repo's `engineer/`.
- Merge `engineer/package.scripts.json` scripts into `package.json`; tell the user the devDeps to `npm i -D`.
- Apply the rules in `engineer/eslint-rules.md` to the project's ESLint config.

## Step 3 — Git + GitHub bootstrap
- If not a git repo: `git init`, then an initial commit of the scaffold.
- **GitHub (skip if `--no-github` or `gh` is unauthenticated):** offer `gh repo create`. Then set
  branch protection so the `quality` check is REQUIRED — this is what makes red CI actually block a
  merge:
  ```bash
  gh api -X PUT repos/{owner}/{repo}/branches/main/protection \
    -f 'required_status_checks[strict]=true' \
    -f 'required_status_checks[contexts][]=quality' \
    -F 'enforce_admins=true' -F 'required_pull_request_reviews=null' -F 'restrictions=null'
  ```
  If `gh` is missing/unauthorized, print the exact manual steps instead — never silently skip the gate.

## Step 4 — Verify the loop, then report
Run `npm install` (or instruct it), then `npm run quality` and confirm it executes. Tell the user:
what was installed, the one devDeps command to run, and the **acceptance test** — introduce a
`NEXT_PUBLIC_API_SECRET` or an `as any`, commit, and watch the pre-commit/CI block it. If it blocks,
the scaffold works. Point them at `engineer/definition-of-done.md`.

## Notes
- Never create a GitHub repo without the user's explicit go-ahead (it's outward-facing).
- If a gate can't be installed (no `gh`, no network), say so loudly and give the manual fallback —
  a silently-missing gate is the exact failure this skill exists to prevent.
- Companion: `/engineer-audit` checks an existing repo against the same ledger.
