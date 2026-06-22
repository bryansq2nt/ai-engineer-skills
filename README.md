# ai-engineer-skills

Two Claude Code skills that make engineering discipline a property of your **repos**, not your
**mood** — *generate the gate, don't recommend it.* An AI (or a tired human) will read a rule and
still break it; a machine that blocks the commit won't.

| Skill | What it does |
|-------|--------------|
| **`/engineer-start`** | Scaffolds a project with AI rule files (CLAUDE.md, AGENTS.md, .cursorrules) **and** the gates that enforce them: a real `quality` script, GitHub Actions CI, a pre-commit hook, hardened `.gitignore`, secret/artifact checks, a fail-closed auth test, and git + branch-protection bootstrap. |
| **`/engineer-audit`** | Cold, evidence-based review of existing repos against a failure ledger (F1–F12), with `file:line` evidence. Report-only — never auto-fixes. |

Start scaffolds correct; audit proves it stayed correct. That's the closed loop.

## Install

```bash
git clone https://github.com/<you>/ai-engineer-skills ~/ai-engineer-skills
cd ~/ai-engineer-skills && ./install.sh
```

`install.sh` symlinks both skills into `~/.claude/skills/` (symlink, not copy — so `git pull`
updates them everywhere). To remove: `./install.sh --uninstall`.

## Use

From inside any project directory, in Claude Code:

```
/engineer-start [target-dir] [--stack nextjs] [--no-github]   # scaffold / harden a project
/engineer-audit [target-dir-or-folder-of-repos]               # audit existing code
```

After `/engineer-start`: `npm i -D vitest husky @typescript-eslint/eslint-plugin`, then
`npm run quality`. The merge-blocking CI gate needs `gh` authenticated (the skill prints the exact
branch-protection command, or a manual fallback if `gh` is absent).

## What it enforces

The standards trace to a failure ledger of 12 recurring real-world failures
(`engineer-start/reference/failure-ledger.md`) and a 10-bullet, machine-checkable Definition of Done
(`engineer-start/reference/definition-of-done.md`). Stack: **Next.js** (v1). Other stacks are
deliberately out of scope until this loop is proven.

## License

MIT — see [LICENSE](LICENSE).
