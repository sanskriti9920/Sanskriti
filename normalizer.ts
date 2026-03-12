/**
 * Product title normalizer for deduplication.
 * Used to match same products from different scrapers.
 */
const STOPWORDS = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'for', 'with', 'by', 'of', 'and', 'or', 'to', 'is', 'are', 'was'])

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')    // Remove punctuation
    .replace(/\s+/g, ' ')         // Normalize whitespace
    .split(' ')
    .filter(w => w.length > 1 && !STOPWORDS.has(w))
    .join(' ')
    .trim()
}

export function fingerprint(title: string): string {
  // Sort tokens to catch reordered titles
  const tokens = normalizeTitle(title).split(' ').sort()
  return tokens.join('|')
}

export function similarity(a: string, b: string): number {
  const tokensA = new Set(normalizeTitle(a).split(' '))
  const tokensB = new Set(normalizeTitle(b).split(' '))
  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)))
  const union = new Set([...tokensA, ...tokensB])
  return intersection.size / union.size  // Jaccard similarity
}
