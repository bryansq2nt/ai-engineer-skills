# AGENTS.md — instructions for AI coding agents (Codex, and any AGENTS.md-aware tool)

> Scaffolded by `/engineer-start`. Mirror of the standards in `CLAUDE.md`, in the format
> Codex / OpenAI agents read. Keep this and `CLAUDE.md` in sync.

## Definition of Done
A change is done only when: it's on a PR (not pushed to `main`); `{{QUALITY_CMD}}` passes
(lint + typecheck + test + build); no secret is browser-reachable or committed; auth fails
closed with a test proving it; risky seams (auth/payments/email/uploads/DB writes) have a
smoke test; no new `as any`. Full list in `engineer/definition-of-done.md`.

## Hard rules (enforced by CI — not suggestions)
1. No secrets in client-readable env vars (`NEXT_PUBLIC_*`) or source. gitleaks gates the PR.
2. Auth/config fails closed. Missing secret → deny, with a test.
3. No `as any`. Regenerate types instead of casting.
4. Escape user input before HTML/email rendering.
5. Structured logging + error tracking in production paths.
6. No build artifacts, deps, or `.env` files committed.

## How to work here
- Branch → PR → green CI → merge. Never push to `main`.
- Run `{{QUALITY_CMD}}` before committing.
- Prefer small modules: keep auth, validation, IO, business rules, and UI in separate units.
- When you finish a module or feature, commit it.
