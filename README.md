# ai-engineer-skills

**Two Claude Code skills that help you build at a higher level — by telling you the truth about your work, and then enforcing the fixes.**

Most AI coding tools help you *write* code faster. These help you *engineer* better. They look at the projects you've already built and answer two honest questions:

1. **How good is the code you ship?** — a cold, evidence-based review of your real code, with exact `file:line` proof, scored against 12 recurring failures (fail-open auth, secrets leaked to the browser, no tests, no CI, `as any`, …).
2. **How well do you drive the AI?** — an analysis of *how you actually prompt and direct the agent*, scored across five dimensions, with concrete before/after rewrites of your own prompts.

You get the answers as a single, self-contained **HTML dashboard you open in your browser** — no cloud, no account, your data never leaves your machine. Then the second skill turns the findings into **machine-enforced gates** so the same mistakes can't happen again.

> The idea: don't rely on remembering to do the right thing. Make the right thing the default, and let a machine block the wrong thing.

---

## What you get

Run it and you get a dashboard with four views:

- **Overview** — your two scores side by side: how you drive the agent (Process) vs. what your code is actually like (Artifacts), and the gap between them.
- **AI Fluency** — your overall score, your "builder archetype", the four competencies, and your highest-leverage growth moves — each one rewriting a *real prompt you wrote*.
- **Code Review** — the full cold review of your repos, searchable, with `file:line` evidence.
- **Progress** — re-run it next month and watch your failures drop over time. The trend builds itself.

---

## Install

```bash
git clone https://github.com/bryansq2nt/ai-engineer-skills ~/ai-engineer-skills
cd ~/ai-engineer-skills && ./install.sh
```

`install.sh` symlinks both skills into `~/.claude/skills/` (a symlink, not a copy — so `git pull` updates them everywhere). To remove them: `./install.sh --uninstall`.

Requires [Claude Code](https://claude.com/claude-code). The AI-fluency engine is pure Python standard library — **no pip, no API key, nothing to install.**

---

## Use

Everything below is typed in Claude Code, from your terminal.

### 🔍 Run a feedback report on ONE project
```
/engineer-audit ~/code/my-app
```
Audits that project's code and your prompting, then opens your dashboard.

### 🔍 Run a feedback report on MANY projects
```
/engineer-audit ~/code/app1 ~/code/app2 ~/code/api
```
…or point it at a folder of repos:
```
/engineer-audit ~/code
```
It reviews each repo in parallel and **synthesizes the patterns across all of them** — what you repeat, where you're strong, where you're weak — into one cross-project report.

### 🚀 Start a NEW project (the right way, from commit zero)
```
/engineer-start ~/code/my-new-app
```
Scaffolds the project so discipline is enforced by machines, not memory: AI rule files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`), a real `quality` script (lint + typecheck + test + build), GitHub Actions CI, a pre-commit hook, a hardened `.gitignore`, secret/artifact checks, and a fail-closed auth test. A bad commit gets blocked before it can land.

> **The loop:** `/engineer-audit` tells you what's wrong → `/engineer-start` makes it impossible to repeat → re-run `/engineer-audit` and the **Progress** view proves it worked.

---

## How it works (and your privacy)

- **The code review** reads your actual repositories with parallel sub-agents and cites real `file:line` evidence against a [failure ledger](engineer-start/reference/failure-ledger.md) of 12 recurring failures.
- **The AI-fluency analysis** ([`fluency.py`](engineer-audit/fluency.py)) reads your local Claude Code transcripts (`~/.claude/projects`), measures only your *real typed prompts* (it filters out tool output and pasted text), and scores **skill, not activity** — using the agent more never raises your score, only using it better does.
- **Everything is local.** The report is a static HTML file on your disk. It contains real findings about your code (including security issues), so treat it as private — don't publish it.

Current stack support for `/engineer-start`: **Next.js**. More stacks coming.

---

## License

MIT — see [LICENSE](LICENSE).

Powered by [MutechLabs](https://mutechlabs.com).
