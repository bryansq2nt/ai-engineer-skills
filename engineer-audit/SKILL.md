---
name: engineer-audit
description: Cold, evidence-based audit of one or more existing repos against the engineering failure ledger (F1–F12). Reports regressions with file:line evidence — does NOT auto-fix. Use to check whether a project meets the bar, before deploy, or when the user runs /engineer-audit.
argument-hint: "[target-dir-or-folder-of-repos]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# /engineer-audit — does this code actually meet the bar?

You produce a **cold, transparent, evidence-based** assessment of existing code against the same
standard `/engineer-start` enforces. This is the closing half of the loop: start scaffolds correct,
audit proves it stayed correct. Score against `../engineer-start/reference/failure-ledger.md`
(F1–F12). Do not sugarcoat; do not give generic motivational advice; cite real `file:line`.

## Step 0 — Scope
- Target = arg, else cwd. If it's a folder of many repos, list the real projects (ignore vendor/
  build/SDK clones), and **fan out with parallel subagents** — assign repo groups to each. Then
  synthesize cross-project patterns; do not just summarize each repo independently.

## Step 1 — Check each ledger row with real tools (not vibes)
For each repo, gather evidence:
- **F2** browser secrets: `grep -REn 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD)'` (minus the documented public allow-list).
- **F3** hardcoded creds: run/emulate gitleaks; grep for AWS/`sk-`/`api_key =` patterns.
- **F1** fail-open auth: read auth guards; flag any that allow when a secret is unset.
- **F5/F6** tests & CI: is there a `quality`-equivalent script? a `.github/workflows`? real tests vs. leftover examples?
- **F4** HTML/email injection: grep for user input interpolated into HTML/email bodies.
- **F7** `as any`: count occurrences; note stale generated DB types.
- **F8** oversized modules: files mixing auth+validation+IO+business+UI; flag large files.
- **F9** hygiene: `git ls-files` for tracked artifacts/`.env`.
- **F10** Python deps: lockfile present? CI installs from it?
- **F11** logging: bare `console.log`/`print` in production paths; error tracking present?
- **F12** is security reviewed before deploy or after a bug?

## Step 2 — Report (the raw-report format, scored)
Produce: a per-repo F1–F12 status table (pass / fail / n-a, with `file:line` evidence), then a
cross-project synthesis: developer profile, overall verdict, strongest repos vs. weakest, recurring
patterns, ranked next-learning priorities, and a 30-day fix list ordered by leverage. Be blunt and
specific. Where a repo is genuinely strong, say so — but only if the evidence supports it.

## Step 3 — Feed the loop back
End by naming any **new** failure pattern not yet in the ledger, and recommend adding it to
`../engineer-start/reference/failure-ledger.md` so the standard learns from this audit.

## Notes
- Report only — never rewrite the audited code. Fixes are a separate, deliberate action.
- This is the deterministic-evidence sibling of the `ai-fluency` skill: that one audits how you
  *drive the agent*; this one audits the *code that survives*.
