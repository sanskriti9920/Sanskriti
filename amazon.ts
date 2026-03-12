/**
 * Amazon India Scraper (Playwright stub)
 * 
 * ⚠️  IMPORTANT: Check Amazon's TOS before scraping.
 *     Prefer the Amazon Product Advertising API (PA-API) where possible.
 *     Add your PA-API keys to .env for better rate limits and legality.
 * 
 * Rate limits: max 1 req/5s per IP. Use rotating proxies.
 */
import { chromium } from 'playwright'
import type { Page } from 'playwright'

const PROXY_URL = process.env.PROXY_PROVIDER_URL
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
]

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export interface ScrapedPrice {
  marketplace: 'amazon'
  price: number
  mrp?: number
  inStock: boolean
  affiliateUrl: string
  title?: string
  images?: string[]
}

/**
 * Scrape Amazon product by ASIN
 */
export async function scrapeAmazonProduct(asin: string): Promise<ScrapedPrice | null> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    proxy: PROXY_URL ? { server: PROXY_URL } : undefined,
  })

  const context = await browser.newContext({
    userAgent: randomUA(),
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  })

  const page = await context.newPage()

  try {
    await page.goto(`https://www.amazon.in/dp/${asin}`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    })

    // Check for CAPTCHA
    const isCaptcha = await page.$('#captchacharacters')
    if (isCaptcha) {
      console.warn(`[Amazon] CAPTCHA hit for ASIN ${asin} — rotate proxy`)
      return null
    }

    // Extract price
    const priceEl = await page.$('#priceblock_ourprice, .a-price .a-offscreen, #price_inside_buybox')
    const priceText = await priceEl?.textContent()
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0

    // Extract MRP
    const mrpEl = await page.$('.a-text-strike, #priceblock_saleprice')
    const mrpText = await mrpEl?.textContent()
    const mrp = mrpText ? parseFloat(mrpText.replace(/[^0-9.]/g, '')) : undefined

    // In stock check
    const addToCartBtn = await page.$('#add-to-cart-button')
    const inStock = !!addToCartBtn

    if (!price) return null

    return {
      marketplace: 'amazon',
      price,
      mrp,
      inStock,
      affiliateUrl: `https://www.amazon.in/dp/${asin}?tag=${process.env.AFFILIATE_AMAZON_TAG || '__PASTE_HERE__'}`,
    }
  } catch (err) {
    console.error(`[Amazon] Scrape error for ${asin}:`, err)
    return null
  } finally {
    await browser.close()
    // Rate limiting: wait 3-8 seconds between requests
    await sleep(3000 + Math.random() * 5000)
  }
}

/**
 * Scrape Amazon search results
 */
export async function scrapeAmazonSearch(query: string, maxPages = 3): Promise<string[]> {
  // Returns list of ASINs found
  const browser = await chromium.launch({ headless: true, proxy: PROXY_URL ? { server: PROXY_URL } : undefined })
  const context = await browser.newContext({ userAgent: randomUA(), locale: 'en-IN' })
  const page = await context.newPage()
  const asins: string[] = []

  try {
    for (let p = 1; p <= maxPages; p++) {
      await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(query)}&page=${p}`, { waitUntil: 'domcontentloaded' })
      const links = await page.$$eval('[data-asin]', els => els.map(el => el.getAttribute('data-asin')).filter(Boolean))
      asins.push(...links as string[])
      await sleep(2000 + Math.random() * 3000)
    }
  } finally {
    await browser.close()
  }

  return [...new Set(asins)]
}
