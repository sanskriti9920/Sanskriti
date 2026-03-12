/**
 * Seed script — populates Postgres + Typesense with sample products
 * Run: npm run seed (from backend dir)
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import products from '../../seed/products.json'
import { logger } from './lib/logger'

const prisma = new PrismaClient()

async function main() {
  logger.info(`Seeding ${products.length} products...`)

  // Create admin user
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10)
  await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@pricespy.in' },
    update: {},
    create: { email: process.env.ADMIN_EMAIL || 'admin@pricespy.in', password: hash, role: 'admin' },
  })

  // Seed products
  for (const p of products as any[]) {
    const { prices, ...productData } = p

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: { ...productData, updatedAt: new Date() },
      create: {
        id: productData.id,
        slug: productData.slug,
        title: productData.title,
        brand: productData.brand,
        category: productData.category,
        sku: productData.sku,
        images: productData.images,
        specSnippet: productData.specSnippet,
        specs: productData.specs,
        rating: productData.rating,
        reviewCount: productData.reviewCount,
        identifiers: productData.identifiers,
        sponsored: productData.sponsored || false,
      },
    })

    // Seed prices
    for (const price of prices || []) {
      await prisma.price.upsert({
        where: { productId_marketplace: { productId: product.id, marketplace: price.marketplace } },
        update: { price: price.price, mrp: price.mrp, coupon: price.coupon, deliveryETA: price.deliveryETA, sellerRating: price.sellerRating, affiliateUrl: price.affiliateUrl },
        create: { productId: product.id, marketplace: price.marketplace, price: price.price, mrp: price.mrp, coupon: price.coupon, deliveryETA: price.deliveryETA, sellerRating: price.sellerRating, affiliateUrl: price.affiliateUrl },
      })

      // Add initial price history entry
      await prisma.priceHistory.create({
        data: { productId: product.id, marketplace: price.marketplace, price: price.price },
      }).catch(() => null)
    }
  }

  logger.info('✅ Seeding complete!')
  logger.info(`   Products: ${products.length}`)
  logger.info('   Admin user: admin@pricespy.in')
}

main().catch(e => { logger.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
