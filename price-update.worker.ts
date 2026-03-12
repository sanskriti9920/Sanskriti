/**
 * BullMQ Worker — Price Update Jobs
 * Runs on a schedule to refresh product prices from scrapers.
 * 
 * Schedule:
 *   - Electronics/Mobiles: every 30 minutes
 *   - Fashion/Furniture: every 6 hours
 *   - Groceries: every 2 hours
 */
import { Worker, Queue, QueueScheduler } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { scrapeAmazonProduct } from '../scrapers/amazon'
import { scrapeFlipkartProduct } from '../scrapers/flipkart'
import { logger } from '../lib/logger'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null })
const prisma = new PrismaClient()

// ── QUEUES ──────────────────────────────────────────────────
export const priceQueue = new Queue('price-updates', { connection })

// ── WORKER ──────────────────────────────────────────────────
const worker = new Worker('price-updates', async job => {
  const { productId, marketplace } = job.data
  logger.info(`[Worker] Updating price for product=${productId} marketplace=${marketplace}`)

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { prices: true },
  })
  if (!product) return

  let newPrice: number | null = null
  const identifiers = product.identifiers as Record<string, string> || {}

  if (marketplace === 'amazon' && identifiers.asin) {
    const result = await scrapeAmazonProduct(identifiers.asin)
    if (result) newPrice = result.price
  }
  // Add other marketplaces here...

  if (!newPrice) return

  // Upsert current price
  await prisma.price.upsert({
    where: { productId_marketplace: { productId, marketplace } },
    update: { price: newPrice, updatedAt: new Date() },
    create: { productId, marketplace, price: newPrice, affiliateUrl: '' },
  })

  // Insert price history
  await prisma.priceHistory.create({ data: { productId, marketplace, price: newPrice } })

  // Check alerts
  const alerts = await prisma.priceAlert.findMany({
    where: { productId, fired: false, targetPrice: { gte: newPrice } },
  })
  for (const alert of alerts) {
    logger.info(`[Worker] Firing alert id=${alert.id} email=${alert.email}`)
    // TODO: Send email via nodemailer
    await prisma.priceAlert.update({ where: { id: alert.id }, data: { fired: true, firedAt: new Date() } })
  }
}, { connection, concurrency: 3 })

// ── SCHEDULER (seed periodic jobs) ──────────────────────────
export async function scheduleAllProducts() {
  const products = await prisma.product.findMany({ select: { id: true, category: true } })
  for (const p of products) {
    const repeatMs = ['mobiles', 'electronics'].includes(p.category) ? 30 * 60 * 1000 : 6 * 60 * 60 * 1000
    await priceQueue.add('update', { productId: p.id, marketplace: 'amazon' }, {
      repeat: { every: repeatMs },
      jobId: `${p.id}:amazon`,
    })
  }
  logger.info(`[Scheduler] Scheduled ${products.length} products`)
}

worker.on('completed', job => logger.info(`[Worker] Job ${job.id} done`))
worker.on('failed', (job, err) => logger.error(`[Worker] Job ${job?.id} failed`, err))

export default worker
