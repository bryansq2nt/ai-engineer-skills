# {{PROJECT_NAME}}

> Scaffolded by `/engineer-start`. This file is loaded automatically every session.
> It is a **thin pointer** to the standards, plus this project's specifics. Keep it short.

## Definition of Done (recite before claiming "done")
Work is done only when it's on a PR, `quality` is green, no secret is browser-reachable or
committed, auth fails closed, risky seams have a smoke test, and no new `as any`.
Full list: `engineer/definition-of-done.md`. Why each rule exists: `engineer/failure-ledger.md`.

## Hard rules (non-negotiable — these are gated by CI, not by goodwill)
- **Never** put a secret in a `NEXT_PUBLIC_*` / client-readable var. Backend secrets stay server-side.
- **Never** commit hardcoded credentials. CI runs gitleaks; it will block the PR.
- Auth/config **fails closed** — missing secret means deny, and there must be a test proving it.
- **No** `as any` to silence the type checker. Fix the type or regenerate DB types.
- Escape/sanitize user input before it enters HTML or email bodies.
- Production code paths use structured logging + error tracking, never bare `console.log`/`print`.

## Workflow this project enforces
- `main` is protected. Work on a branch, open a PR. Red CI cannot merge.
- Run `npm run quality` before every commit (a pre-commit hook also runs it).
- When a feature or module is finished, commit it — small, reviewable commits.

## Project specifics
<!-- Fill in: stack, key directories, domain notes, anything project-specific the agent must know. -->
- Stack: {{STACK}}
- Quality command: `{{QUALITY_CMD}}`

## Decisions
Significant architectural/security decisions go in `DECISIONS.md` so they survive context resets.
