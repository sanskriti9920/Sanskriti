/**
 * Unit tests for product title normalizer
 */
import { normalizeTitle, fingerprint } from '../../backend/src/services/normalizer'

describe('normalizeTitle', () => {
  it('lowercases input', () => {
    expect(normalizeTitle('Apple iPhone 15 PRO')).toContain('apple iphone 15 pro')
  })
  it('strips punctuation', () => {
    expect(normalizeTitle('iPhone-15 (Pro)')).not.toContain('(')
  })
  it('removes stopwords', () => {
    const r = normalizeTitle('the best phone in India')
    expect(r).not.toContain(' the ')
    expect(r).toContain('best phone')
  })
})

describe('fingerprint', () => {
  it('returns same hash for equivalent titles', () => {
    const a = fingerprint('Apple iPhone 15 Pro 128GB')
    const b = fingerprint('apple iphone 15 pro 128 gb')
    expect(a).toBe(b)
  })
})
