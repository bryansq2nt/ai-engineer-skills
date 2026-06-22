// Scaffolded by /engineer-start — enforces F1 (auth must fail CLOSED).
// This is a TEMPLATE. Rename to a real .test.ts and point it at your actual auth guard.
// The point: prove that a MISSING secret denies access, instead of allowing it.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Replace with your real guard, e.g.:
// import { requireApiSecret } from '@/lib/auth'
function requireApiSecret(headerValue: string | null): boolean {
  const expected = process.env.API_SECRET
  // CORRECT (fails closed): if the secret is unset, deny everyone.
  if (!expected) return false
  return headerValue === expected
}

describe('API secret guard fails closed (F1)', () => {
  const original = process.env.API_SECRET
  afterEach(() => { process.env.API_SECRET = original })

  it('DENIES access when the secret is not configured', () => {
    delete process.env.API_SECRET
    expect(requireApiSecret('anything')).toBe(false)
    expect(requireApiSecret(null)).toBe(false)
  })

  it('allows only the exact secret when configured', () => {
    process.env.API_SECRET = 's3cret'
    expect(requireApiSecret('s3cret')).toBe(true)
    expect(requireApiSecret('wrong')).toBe(false)
    expect(requireApiSecret(null)).toBe(false)
  })
})
