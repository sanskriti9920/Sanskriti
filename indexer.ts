/**
 * Typesense Indexer — pushes all DB products into Typesense for fast search
 * Run: npm run index
 */
import { PrismaClient } from '@prisma/client'
import { typesense, ensureCollection } from './lib/typesense'
import { logger } from './lib/logger'

const prisma = new PrismaClient()

async function main() {
  await ensureCollection()
  logger.info('Indexing products into Typesense...')

  const products = await prisma.product.findMany({ include: { prices: { orderBy: { price: 'asc' } } } })
  const BATCH = 100

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH).map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      category: p.category,
      specSnippet: p.specSnippet || '',
      bestPrice: p.prices[0]?.price || 0,
      rating: p.rating || 0,
      discount: p.prices[0]?.mrp ? Math.round(((p.prices[0].mrp - p.prices[0].price) / p.prices[0].mrp) * 100) : 0,
      images: p.images,
      marketplaces: p.prices.map(pr => pr.marketplace),
    }))

    await typesense.collections('products').documents().import(batch, { action: 'upsert' })
    logger.info(`Indexed ${Math.min(i + BATCH, products.length)}/${products.length}`)
  }

  logger.info('✅ Indexing complete!')
}

main().catch(e => { logger.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
