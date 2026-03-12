// workers/price-updater.worker.ts
// BullMQ worker: processes price update jobs from the queue

import { Worker, Queue, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../src/lib/db/prisma';
import { indexProduct } from '../src/lib/search/typesense';
import { AmazonScraper } from '../scrapers/amazon.scraper';

// ── Redis connection ──────────────────────────────────────────────
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ── Queue definitions ─────────────────────────────────────────────
export const priceUpdateQueue = new Queue('price-updates', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const priceAlertQueue = new Queue('price-alerts', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 },
  },
});

// ── Worker ────────────────────────────────────────────────────────
const scraper = new AmazonScraper();

const priceWorker = new Worker(
  'price-updates',
  async (job: Job) => {
    const { productId, marketplace } = job.data as {
      productId: string;
      marketplace: string;
    };

    console.log(`[Worker] Processing price update: product=${productId} marketplace=${marketplace}`);

    // Fetch current price record
    const currentPrice = await prisma.price.findFirst({
      where: { productId, marketplace: { slug: marketplace } },
      include: { marketplace: true, product: true },
    });

    if (!currentPrice) {
      console.warn(`[Worker] No price record found for product=${productId} marketplace=${marketplace}`);
      return;
    }

    let newPriceData: { price: number; inStock: boolean; discount?: number | null } | null = null;

    // Route to appropriate scraper based on marketplace
    if (marketplace === 'amazon' && currentPrice.product.asin) {
      const scraped = await scraper.scrapeProduct(currentPrice.product.asin);
      if (scraped && scraped.price) {
        newPriceData = {
          price:    scraped.price,
          inStock:  scraped.inStock,
          discount: scraped.discount,
        };
      }
    }
    // TODO: Add Flipkart, Myntra scrapers here

    if (!newPriceData) {
      console.warn(`[Worker] No price data scraped for product=${productId}`);
      return;
    }

    // Update price in DB
    await prisma.price.update({
      where: { id: currentPrice.id },
      data: {
        price:    newPriceData.price,
        discount: newPriceData.discount,
        inStock:  newPriceData.inStock,
        scrapedAt: new Date(),
      },
    });

    // Record price history
    await prisma.priceHistory.create({
      data: {
        productId,
        marketplaceId: currentPrice.marketplaceId,
        price:    newPriceData.price,
        discount: newPriceData.discount,
        inStock:  newPriceData.inStock,
      },
    });

    // Update product aggregate lowestPrice
    const allPrices = await prisma.price.findMany({
      where: { productId, inStock: true },
      select: { price: true },
    });

    if (allPrices.length > 0) {
      const lowestPrice = Math.min(...allPrices.map((p) => p.price));
      await prisma.product.update({
        where: { id: productId },
        data: { lowestPrice, updatedAt: new Date() },
      });

      // Re-index in Typesense
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          prices: { include: { marketplace: true } },
        },
      });
      if (product) await indexProduct(product).catch(console.error);
    }

    // Check price alerts
    const prevPrice = currentPrice.price;
    const newPrice  = newPriceData.price;

    if (newPrice < prevPrice) {
      const alerts = await prisma.priceAlert.findMany({
        where: {
          productId,
          isActive: true,
          targetPrice: { gte: newPrice },
        },
        include: { user: true, product: true },
      });

      for (const alert of alerts) {
        await priceAlertQueue.add('send-alert', {
          alertId:   alert.id,
          userId:    alert.userId,
          email:     alert.user.email,
          productTitle: alert.product.title,
          targetPrice:  alert.targetPrice,
          actualPrice:  newPrice,
          productSlug:  alert.product.slug,
        });
      }
    }

    console.log(`[Worker] ✅ Updated ${marketplace} price for product=${productId}: ₹${newPriceData.price}`);
  },
  {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    limiter: {
      max: 10,
      duration: 60_000, // max 10 jobs per minute per worker
    },
  },
);

priceWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

priceWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

// ── Scheduler: enqueue price update jobs ─────────────────────────
export async function scheduleUpdates() {
  const ELECTRONICS_INTERVAL = Number(process.env.PRICE_UPDATE_INTERVAL_ELECTRONICS || 900_000);
  const OTHER_INTERVAL       = Number(process.env.PRICE_UPDATE_INTERVAL_OTHERS || 86_400_000);

  const ELECTRONICS_CATEGORIES = ['mobiles', 'electronics', 'laptops'];

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      prices: {
        select: { marketplaceId: true, marketplace: { select: { slug: true } } },
      },
      category: { select: { slug: true } },
    },
  });

  let scheduled = 0;

  for (const product of products) {
    const isElectronics = ELECTRONICS_CATEGORIES.includes(product.category.slug);
    const delay = isElectronics ? ELECTRONICS_INTERVAL : OTHER_INTERVAL;

    for (const price of product.prices) {
      await priceUpdateQueue.add(
        'update-price',
        { productId: product.id, marketplace: price.marketplace.slug },
        {
          delay,
          jobId: `price-${product.id}-${price.marketplace.slug}`,
          removeOnComplete: true,
        },
      );
      scheduled++;
    }
  }

  console.log(`[Scheduler] Scheduled ${scheduled} price update jobs`);
}

// ── Main entrypoint ───────────────────────────────────────────────
async function main() {
  console.log('[Workers] Starting price update worker...');
  await scheduleUpdates();

  // Re-schedule every hour
  setInterval(scheduleUpdates, 60 * 60 * 1000);

  process.on('SIGTERM', async () => {
    await priceWorker.close();
    await scraper.close();
    process.exit(0);
  });
}

main().catch(console.error);
