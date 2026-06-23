---
name: engineer-audit
description: Generate a self-contained HTML feedback dashboard for one or many projects — a cold code review scored against the F1–F12 failure ledger (the Artifacts axis) AND a self-contained AI-fluency analysis of how the developer drives the agent (the Process axis). Re-runnable; tracks progress over time. Use to assess code, before deploy, or when the user runs /engineer-audit.
argument-hint: "[path ...] [--no-open]"
allowed-tools: Bash, Read, Grep, Glob, Agent, Write
---

# /engineer-audit — one command, a full feedback report

You produce a **self-contained HTML dashboard** that tells a developer the truth about their work on
the project(s) they name — one project or many. It has two axes:

- **Artifacts** — a cold, evidence-based code review scored against the F1–F12 failure ledger
  (`../engineer-start/reference/failure-ledger.md`). Cite real `file:line`; never sugarcoat.
- **Process** — a self-contained AI-fluency analysis of how they drive the agent, computed by the
  bundled `fluency.py` (pure stdlib, no API, no external skill).

Everything the skill needs is bundled next to this file: `fluency.py` and `template/`.
The skill base directory is given to you at runtime ("Base directory for this skill: …") — call it
`<skill>`. Do not depend on any other installed skill.

## Step 0 — Resolve targets & output
- **Targets** = the path arguments, else the current directory. Each may be a single repo or a folder
  of repos. Expand a folder-of-repos into its real projects (ignore vendor/build/SDK clones).
- **Output dir** = `~/.claude/insight/feedback-report/<slug>/`, where `<slug>` is the first target's
  basename sanitized to `[a-z0-9-]` (e.g. `/Users/me/dev/VAM` → `vam`). This lives **outside** the
  user's project on purpose — never write report files into the audited repo, so the user gets zero
  trash files in their tree. Namespacing by `<slug>` keeps each project's `audit-runs.json` progress
  separate across re-runs. Create `<output>/data/` (mkdir -p; expand `~` to `$HOME`). If `~/.claude`
  is somehow not writable, fall back to a system temp dir (`$TMPDIR/claude-insight/<slug>/`).

## Step 1 — Audit the code (Artifacts axis)
- **Fan out with parallel subagents** (Agent tool), assigning repos/areas to each. For each ledger row
  F1–F12, gather real evidence with tools (grep/read), e.g. browser secrets
  `NEXT_PUBLIC_*_(SECRET|KEY|TOKEN)`, fail-open auth guards, `as any`, missing tests/CI, tracked
  artifacts, email/HTML injection, bare logging. Synthesize cross-project patterns — don't just
  summarize each repo.
- Write the cold prose review (developer profile, verdict, strengths, weaknesses with `file:line`,
  cross-project patterns, ranked next steps, 30-day plan) to `<output>/data/raw-report.txt`.
- Decide each F1–F12 status (`flagged` / `clear`) and **append** a run to
  `<output>/data/audit-runs.json` (create with schema `audit-runs/1` if missing; shape per the
  existing baseline: `{date,label,fluency_score,failures:{F1..F12}}`). Appending is deliberate — each
  re-run extends the **Progress** trend automatically.

## Step 2 — Run the AI-fluency analysis (Process axis) — self-contained
```bash
python3 <skill>/fluency.py -o <output>/data/evidence.json --project <target1> [--project <target2> ...]
```
(Omit `--project` to analyze all transcripts.) This reads `~/.claude/projects` transcripts and writes
`evidence.json` deterministically — no API, no external package.

Then **you** write `<output>/data/analysis.json` from that evidence — the qualitative skill map.
Read `evidence.json`, then produce JSON of exactly this shape, grounded in the real
`behavior.sample_prompts` (quote them verbatim — never invent):
```
{ "overall_read": "...",
  "skill_map": [ {"competency":"Delegation|Description|Discernment|Diligence","level":1-5,
                  "level_label":"Emerging|Developing|Proficient|Advanced|Expert",
                  "summary":"...","evidence":["real quote", ...],"next_move":"..."} ],   // exactly 4
  "top_growth": [ {"title":"...","why":"cites their numbers","how":"...",
                   "example_before":"a REAL prompt verbatim","example_after":"your rewrite"} ], // 2-3
  "strengths": ["...", ...] }
```
Put `evidence.scores.overall` into the matching audit run's `fluency_score` in `audit-runs.json`.

## Step 3 — Assemble & open
- Copy `<skill>/template/{index.html,app.js,styles.css}` into `<output>/`.
- Confirm `<output>/data/` has `raw-report.txt`, `audit-runs.json`, `evidence.json`, `analysis.json`.
- Unless `--no-open`: serve and open it — `python3 -m http.server` in `<output>` — and give the user
  the URL. The report carries the "Powered by MutechLabs · mutechlabs.com" footer.

## Notes
- **One project or many** — pass multiple paths; the audit fans out per repo and fluency scopes to
  exactly those projects (`--project` per target).
- **Re-runnable** — appending to `audit-runs.json` makes the Progress tab show failures dropping over
  time. Start scaffolds correct; audit proves it stayed correct, run after run.
- The report is a **local artifact** containing real `file:line` vulnerabilities — never publish it.
  It is written under `~/.claude/insight/feedback-report/<slug>/`, never inside the audited repo, so
  the user's project stays clean. Tell the user where it lives when you hand over the URL.
- If a project has few/no transcripts the Process axis is thin — hedge, don't over-claim. The
  dashboard degrades gracefully if any data file is absent.
