# PLAN — `/engineer-start`: AI Engineering-Discipline Framework

> A plan exists so we stop when we've hit the objective — not when we run out of ideas.
> Every addition must trace back to a failure in `raw-report.txt`. If it doesn't, it's out of scope.

---

## 1. North Star

**One sentence:** A Claude Code skill, `/engineer-start`, that scaffolds any new project so engineering discipline is *enforced by machines, not remembered by people* — and a sibling `/engineer-audit` that proves existing projects still meet that bar.

**The problem it solves (from `raw-report.txt`):** "Your engineering quality depends too much on your mood, project importance, and recent lessons." We are removing mood from the equation by making "correct" the default state of every repo at commit zero.

---

## 2. Design Principles (non-negotiable)

These are the rules that keep the project honest. A feature that violates one of these is rejected.

1. **Generate the gate, don't recommend it.** Nudges are mood-dependent on both sides (AI forgets, user dismisses). The skill *creates* git, CI, hooks, and branch protection — it does not "suggest" them.
2. **Layered enforcement, fast → authoritative.** Local pre-commit hook → GitHub Actions on PR → branch protection with required status checks. CI is the authority; the local hook is the fast feedback.
3. **No CI theater.** A green check on an empty suite is worse than no CI. Checks must be stack-aware and must actually run against the risky seams (auth, payments, email, uploads, DB writes).
4. **Single source of truth.** Templates live once, bundled in the skill dir (like `ai-fluency` bundles `insight.py`). Update the skill → every future run gets the new version. No forked copies drifting across 17 repos.
5. **Closed loop.** `/engineer-start` scaffolds correct; `/engineer-audit` (the `raw-report` prompt as a skill) verifies it stayed correct and feeds new failures back into the standards.
6. **Earn every rule.** Each standard must map to a real, repeated failure in our failure ledger. No aspirational textbook rules that blow the context budget and get skimmed.

---

## 3. Scope

### In scope
- A working `/engineer-start` skill that scaffolds a **Next.js** project end-to-end (first stack).
- The bundled template tree: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `quality` script, `.github/workflows/quality.yml`, pre-commit hook, `.gitignore`.
- Git + GitHub bootstrap: `git init`, optional `gh repo create`, branch protection via `gh`.
- A **failure ledger** derived from `raw-report.txt` — the ranked list every rule traces back to.
- A sibling `/engineer-audit` skill (later phase).

### Explicitly OUT of scope (for now — guards against infinite build)
- Stacks beyond Next.js (Python/FastAPI, worker, Unity) — **only after** the Next.js loop is proven.
- A web UI / dashboard for the framework. (`developer-feedback-dashboard`'s existing `app.js` is reference, not a dependency.)
- Auto-fixing existing repos in bulk. Audit *reports*; it does not rewrite.
- Supporting AI tools we don't personally use.
- Custom org-wide rule editing UI, config systems, plugin architecture. Markdown + scripts only until proven insufficient.

---

## 4. Architecture

```
~/.claude/skills/engineer-start/
  SKILL.md                      # orchestration: detect stack → scaffold → git/CI/hooks
  templates/
    common/                     # stack-agnostic: CLAUDE.md, AGENTS.md, .cursorrules, .gitignore
    nextjs/                     # quality script, eslint/tsc/vitest config, CI workflow, pre-commit
  reference/
    failure-ledger.md           # ranked real failures from raw-report.txt — the "why"
    definition-of-done.md       # ~10 enforceable bullets; the gate between "works" and "done"

~/.claude/skills/engineer-audit/
  SKILL.md                      # the raw-report prompt, structured; checks a repo vs the standard
  reference/ -> shared ledger + DoD
```

---

## 5. Milestones (phase-gated — do not start a phase until the prior one's DoD passes)

> **Status (2026-06-22) — v1 DONE.** DoD #1 ✅ (live `git commit` of `NEXT_PUBLIC_API_SECRET`
> blocked by the gate). DoD #2 ✅ (`/engineer-audit` re-found a fail-open auth dependency and 3
> browser-secret leaks in a real Next.js admin client). DoD #3 ✅
> (every rule traces to the ledger). DoD #4 ✅ (single source of truth, symlinked). Phase 3 (other
> stacks) intentionally NOT built — out of scope for v1.
>
> **Only open item — yours, one-time:** install `gh`, run `/engineer-start` on a real repo, and let
> CI + branch protection block a red PR (the live-CI confirmation of DoD #1). Everything buildable
> without your GitHub account is complete. **Anything beyond this is a new plan, not this one.**

### Phase 0 — Foundation docs  ✅ exit when both files exist and are reviewed
- [ ] `failure-ledger.md` — every repeated failure from `raw-report.txt`, ranked by leverage, each with: the failure, where it appeared, its enforcement mechanism.
- [ ] `definition-of-done.md` — ~10 bullets, each enforceable (names its check).

### Phase 1 — Next.js vertical slice  ✅ exit when a fresh `/engineer-start` produces a repo where a deliberately-broken commit is blocked by CI
- [ ] `SKILL.md` skeleton (orchestration steps).
- [ ] `templates/common/` + `templates/nextjs/` files.
- [ ] `quality` script (lint + typecheck + test + build) that actually runs.
- [ ] `.github/workflows/quality.yml` wired to the script.
- [ ] pre-commit hook.
- [ ] git init + optional `gh repo create` + branch protection.
- [ ] **Acceptance test:** scaffold a throwaway repo, introduce `as any` / a `NEXT_PUBLIC_*_SECRET` / a failing test → confirm the local hook and/or CI blocks it.

### Phase 2 — Close the loop  ✅ exit when `/engineer-audit` re-finds a known failure in an old repo
- [ ] `/engineer-audit` skill: runs the `raw-report` review against a target repo, scored against the failure ledger.
- [ ] Run it on a real existing repo → it must surface a fail-open auth dependency and a browser-exposed secret.

### Phase 3 — Generalize  ✅ exit when a second stack passes the same acceptance test
- [ ] Add Python/FastAPI templates (ruff + pytest + mypy CI).
- [ ] Stack detection in `SKILL.md`.

---

## 6. Definition of Done (for the framework itself)

The project is "done" (v1) when:
1. `/engineer-start` scaffolds a Next.js repo where broken code cannot merge — proven by the Phase 1 acceptance test.
2. `/engineer-audit` re-finds at least two known failures in an existing repo — proven by the Phase 2 test.
3. Every rule in the standards traces to an entry in `failure-ledger.md`.
4. Templates live in one place; updating the skill updates all future scaffolds.

Anything beyond this is a *new* plan, not scope creep on this one.

---

## 7. Decision Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-06-22 | Deliver as a Claude Code skill (`/engineer-start`), not loose copied files | Invocable, single source of truth, no stale forks |
| 2026-06-22 | Enforce via git/CI/hooks, not AI recommendations | "Not just relying on AI" — machines don't have moods |
| 2026-06-22 | Next.js first, generalize later | Most of the portfolio; prove the loop on one stack before widening |
| 2026-06-22 | Audit is a sibling skill, report-only | Closes the loop without the risk of bulk auto-rewrites |

## 8. Open Questions
- Distribution: do existing repos get a thin pointer to global standards, or copied-and-version-stamped files? (Decide before Phase 3.)
- Branch protection via `gh` requires auth + repo admin — confirm the bootstrap handles the no-`gh` / no-permission fallback gracefully.
