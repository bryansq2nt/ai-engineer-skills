# Failure Ledger

> The source of truth for *why* every rule exists. Derived from a cold, portfolio-wide code review.
> **Every standard and every CI check must trace to a row here.** No entry → no rule.
> Ranked by leverage (impact × frequency).

| # | Failure | Where it showed up | Enforcement mechanism | Layer |
|---|---------|--------------------|-----------------------|-------|
| F1 | **Auth fails open** — endpoints allow access when the secret/config is unset | a FastAPI auth dependency (Header-based secret check that no-ops when the env var is empty) | Unit test asserting 403/deny when the secret is missing; rule in `security.md` | test |
| F2 | **Secrets exposed to the browser** — backend secret shipped via a public env var | a Next.js API client reading `NEXT_PUBLIC_API_SECRET` | grep/gitleaks block on `NEXT_PUBLIC_*_(SECRET\|KEY\|TOKEN\|PASSWORD)`; pre-commit + CI | hook + CI |
| F3 | **Hardcoded credentials** — API keys committed in source | committed AWS / client API-key patterns | gitleaks / TruffleHog secret scan in CI; pre-commit | hook + CI |
| F4 | **HTML/email injection** — user input interpolated straight into HTML emails | multiple email API routes interpolating user input into HTML bodies | Mandatory escape/sanitize util for all email templates; lint rule against raw interpolation; rule in `security.md` | lint + review |
| F5 | **No automated tests on risky seams** — meaningful tests absent in most repos | most repos (only the best-disciplined one had real tests) | `quality` script requires tests; CI gate; DoD requires smoke tests on auth/payments/email/uploads/DB writes | CI |
| F6 | **No CI/CD** — no quality gate before merge | most repos (only one had real CI) | `.github/workflows/quality.yml` + branch protection with required checks | CI |
| F7 | **Type bypass (`as any`)** — types used as docs then cast away, even in strong repos | even otherwise-strong repos (e.g. an RBAC resolver, a report service) | eslint `no-explicit-any` / `--max-warnings 0`; generated DB types kept current | lint + CI |
| F8 | **Oversized modules mixing concerns** — auth+validation+IO+business+UI+cache+email in one file | server actions / client pages across repos | Max-lines lint warning; review prompt for coupling; rule in `architecture.md` | lint + review |
| F9 | **Repo hygiene** — build artifacts, `node_modules`, `.venv`, `.env`, duplicated copies in tree | across the folder | Hardened `.gitignore` template; CI check for tracked artifacts/secrets files | scaffold + CI |
| F10 | **Python deps unpinned / not reproducible** | Python services | Require lockfile (uv/pip-tools/poetry); CI install from lock | CI |
| F11 | **No structured logging / observability** — `print`/`console.log` in production paths, no error tracking | production apps | lint rule against bare `console.log`/`print` in prod dirs; Sentry in starter; rule in `observability.md` | lint + scaffold |
| F12 | **Security reviewed after a bug, not before deploy** | portfolio-wide habit | `/engineer-audit` skill run as a pre-deploy gate; DoD item | skill |

## How to use this ledger
- Adding a rule? Find its row (or add one with real evidence) first.
- Building a CI check? It enforces one or more of these rows — name them in the workflow comment.
- Running `/engineer-audit`? Score the target repo against F1–F12 and report regressions.
