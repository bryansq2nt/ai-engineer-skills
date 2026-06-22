# AI Engineering-Discipline Framework

Two Claude Code skills that make engineering discipline a property of your **repos**, not your
**mood**. Born from a cold, portfolio-wide code review that found the same failures repeating across
many repos: fail-open auth, browser-exposed secrets, missing tests/CI, HTML-injection, `as any`
drift, artifacts in git.

**The principle:** *generate the gate, don't recommend it.* An AI (or a tired human) will read a
rule and still break it. A machine that blocks the commit won't.

## The two skills

| Skill | What it does | When |
|-------|--------------|------|
| **`/engineer-start`** | Scaffolds a new repo with AI rule files (CLAUDE.md, AGENTS.md, .cursorrules) **and** the gates that enforce them: a real `quality` script, GitHub Actions CI, a pre-commit hook, hardened `.gitignore`, secret/artifact checks, fail-closed auth test, and git + branch-protection bootstrap. | Starting / hardening a project |
| **`/engineer-audit`** | Cold, evidence-based review of existing repos against the failure ledger (F1–F12), with `file:line` evidence. Report-only — never auto-fixes. | Before deploy; checking an old repo |

Start scaffolds correct; audit proves it stayed correct. That's the closed loop.

## Install

Symlinked into `~/.claude/skills/` so this repo stays the single source of truth — update a
template here and every future scaffold gets it:

```bash
ln -sfn "$(pwd)/engineer-start" ~/.claude/skills/engineer-start
ln -sfn "$(pwd)/engineer-audit" ~/.claude/skills/engineer-audit
```

## Use

```
/engineer-start [target-dir] [--stack nextjs] [--no-github]
/engineer-audit [target-dir-or-folder-of-repos]
```

After scaffolding: `npm i -D vitest husky @typescript-eslint/eslint-plugin`, then `npm run quality`.
For the merge-blocking CI gate you need `gh` authenticated (the skill prints the exact
branch-protection command, or a manual fallback if `gh` is absent).

## How it's grounded
- `reference/failure-ledger.md` — the 12 real failures (F1–F12); every rule traces to a row.
- `reference/definition-of-done.md` — the 10 enforceable bullets that gate "done".
- Stack: **Next.js** (v1). Other stacks are deliberately out of scope until this loop is proven.

## Validated
- `/engineer-start`: a live `git commit` of `NEXT_PUBLIC_API_SECRET` is **blocked** by the pre-commit gate (F2).
- `/engineer-audit`: independently re-found a fail-open auth dependency and multiple
  `NEXT_PUBLIC_API_SECRET` leaks in a real codebase (F1, F2).
