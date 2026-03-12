/**
 * Playwright E2E Tests — Core User Flow
 * Run: npx playwright test
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('PriceSpy core flow', () => {
  test('homepage loads and shows search bar', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page.locator('input[aria-label="Search products"]')).toBeVisible()
    await expect(page.locator('text=PriceSpy')).toBeVisible()
  })

  test('search shows results', async ({ page }) => {
    await page.goto(`${BASE_URL}/search?q=iPhone`)
    await page.waitForSelector('.card', { timeout: 10000 })
    const cards = await page.locator('.card').count()
    expect(cards).toBeGreaterThan(0)
  })

  test('product card links to detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/search?q=Apple`)
    await page.waitForSelector('a[href*="/product/"]', { timeout: 10000 })
    const link = page.locator('a[href*="/product/"]').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/\/product\//)
    await link.click()
    await expect(page).toHaveURL(/\/product\//)
  })

  test('product detail shows comparison table', async ({ page }) => {
    await page.goto(`${BASE_URL}/search?q=Samsung`)
    await page.waitForSelector('a[href*="/product/"]', { timeout: 10000 })
    await page.locator('a[href*="/product/"]').first().click()
    await page.waitForURL(/\/product\//)
    // Should show price table
    await expect(page.locator('text=Price Comparison')).toBeVisible({ timeout: 8000 })
  })

  test('price alert modal opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/search?q=OnePlus`)
    await page.waitForSelector('a[href*="/product/"]', { timeout: 10000 })
    await page.locator('a[href*="/product/"]').first().click()
    await page.waitForURL(/\/product\//)
    const alertBtn = page.locator('button:has-text("Set Price Alert")')
    await alertBtn.waitFor({ timeout: 8000 })
    await alertBtn.click()
    await expect(page.locator('text=Set Price Alert')).toBeVisible()
  })

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE_URL)
    const body = page.locator('html')
    await page.locator('button[aria-label*="theme"]').click()
    const classList = await body.getAttribute('class')
    expect(classList).toMatch(/dark|high-contrast/)
  })
})
