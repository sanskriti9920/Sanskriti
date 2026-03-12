/**
 * Flipkart Scraper (stub)
 * ⚠️  Prefer Flipkart Affiliate API (affiliate.flipkart.com) over scraping.
 */
import { chromium } from 'playwright'

const USER_AGENTS = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']

export interface FlipkartPrice {
  marketplace: 'flipkart'
  price: number
  mrp?: number
  inStock: boolean
  affiliateUrl: string
}

export async function scrapeFlipkartProduct(productId: string, productUrl: string): Promise<FlipkartPrice | null> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ userAgent: USER_AGENTS[0], locale: 'en-IN' })
  const page = await context.newPage()

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Flipkart price selectors (update as site changes)
    const priceEl = await page.$('._30jeq3._16Jk6d, ._30jeq3')
    const priceText = await priceEl?.textContent()
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0

    const mrpEl = await page.$('._3I9_wc._2p6lqe')
    const mrpText = await mrpEl?.textContent()
    const mrp = mrpText ? parseFloat(mrpText.replace(/[^0-9.]/g, '')) : undefined

    const inStock = !(await page.$('._16FRp0'))

    if (!price) return null

    return {
      marketplace: 'flipkart',
      price, mrp, inStock,
      affiliateUrl: `${productUrl}?affid=${process.env.AFFILIATE_FLIPKART_ID || '__PASTE_HERE__'}`,
    }
  } catch (err) {
    console.error(`[Flipkart] Error for ${productId}:`, err)
    return null
  } finally {
    await browser.close()
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000))
  }
}
