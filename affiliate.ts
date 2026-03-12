/**
 * Affiliate Link Service
 * Generates affiliate deep links for each marketplace.
 * Paste your affiliate keys in .env
 */

const AMAZON_TAG = process.env.AFFILIATE_AMAZON_TAG || '__PASTE_HERE__'
const FLIPKART_ID = process.env.AFFILIATE_FLIPKART_ID || '__PASTE_HERE__'
const MYNTRA_ID = process.env.AFFILIATE_MYNTRA_ID || '__PASTE_HERE__'

export function buildAmazonLink(asin: string): string {
  return `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}&linkCode=osi&th=1`
}

export function buildFlipkartLink(productUrl: string): string {
  // Flipkart affiliate: add affid query param
  const url = new URL(productUrl)
  url.searchParams.set('affid', FLIPKART_ID)
  return url.toString()
}

export function buildMyntraLink(productUrl: string): string {
  return `${productUrl}?utm_source=pricespy&utm_medium=affiliate&aff=${MYNTRA_ID}`
}

export function buildDeepLink(marketplace: string, url: string, identifiers: Record<string, string> = {}): string {
  switch (marketplace.toLowerCase()) {
    case 'amazon':
      return identifiers.asin ? buildAmazonLink(identifiers.asin) : url
    case 'flipkart':
      return buildFlipkartLink(url)
    case 'myntra':
      return buildMyntraLink(url)
    default:
      return url
  }
}
