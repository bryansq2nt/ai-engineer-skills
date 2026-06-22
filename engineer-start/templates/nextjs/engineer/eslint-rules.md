# ESLint rules to merge (enforces F7, F8, F11)

Add to the project's ESLint config (`.eslintrc.json` `rules`, or flat-config `rules`):

```jsonc
{
  "rules": {
    // F7 — no silent type bypass
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",

    // F11 — no bare logging in production paths (allow warn/error)
    "no-console": ["error", { "allow": ["warn", "error"] }],

    // F8 — keep modules from sprawling (tune the number to taste)
    "max-lines": ["warn", { "max": 400, "skipBlankLines": true, "skipComments": true }],
    "max-lines-per-function": ["warn", { "max": 80 }]
  }
}
```

`next lint --max-warnings 0` in the `quality` script turns the `warn`s into hard CI failures,
so even the "soft" rules become gates. F4 (HTML/email injection) has no reliable static rule —
it is caught by the `/engineer-audit` review prompt instead.
