# Definition of Done

> The gate between "it works locally" and "it's done." Each bullet is **enforceable** — it names
> the machine that checks it. If a machine can't check it, it's a review-prompt item, not a DoD item.
> Keep this list short. A DoD nobody can recite is a DoD nobody follows.

A change is **done** only when:

1. **It's on a branch with a PR** — not pushed straight to `main`. *(enforced: branch protection)*
2. **`quality` is green** — lint + typecheck + test + build all pass in one command. *(enforced: CI required check + local pre-commit)* → F5, F6, F7
3. **No secret is reachable by the browser or committed** — no `NEXT_PUBLIC_*_SECRET/KEY/TOKEN`, no hardcoded keys. *(enforced: gitleaks + grep, pre-commit + CI)* → F2, F3
4. **Auth/config fails closed** — missing secret = deny, proven by a test. *(enforced: unit test)* → F1
5. **Risky seams have a smoke test** — any route touching auth, payments, email, uploads, or DB writes has at least one test. *(enforced: CI; reviewed in PR)* → F5
6. **User input is escaped before it enters HTML/email.** *(enforced: lint rule + review)* → F4
7. **No new `as any`** and generated DB types are current. *(enforced: eslint, CI)* → F7
8. **No build artifacts, deps, or `.env` files tracked in git.** *(enforced: `.gitignore` + CI tracked-files check)* → F9
9. **Production paths use structured logging + error tracking**, not bare `print`/`console.log`. *(enforced: lint rule)* → F11
10. **Dependencies are pinned/locked** and CI installs from the lock. *(enforced: CI)* → F10

> If any box is unchecked, the work is *in progress*, not *done* — regardless of whether the
> feature visibly works.
