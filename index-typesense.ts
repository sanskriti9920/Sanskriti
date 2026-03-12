// scripts/index-typesense.ts
// Index all products from Postgres into Typesense

import { prisma } from '../src/lib/db/prisma';
import { ensureCollections, indexProduct, typesenseClient } from '../src/lib/search/typesense';

async function main() {
  console.log('[Index] Starting Typesense indexing...');

  // Ensure collections exist
  await ensureCollections();

  // Fetch all active products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      prices: {
        include: { marketplace: true },
        orderBy: { price: 'asc' },
      },
    },
  });

  console.log(`[Index] Found ${products.length} products to index`);

  let indexed = 0;
  let failed  = 0;
  const batchSize = 50;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // Prepare batch documents
    const docs = batch.map((p) => ({
      id:             p.id,
      slug:           p.slug,
      title:          p.title,
      normalizedTitle:p.normalizedTitle,
      brand:          p.brand,
      model:          p.model ?? '',
      category:       p.category.name,
      categorySlug:   p.category.slug,
      description:    (p.description ?? '').slice(0, 500),
      thumbnailUrl:   p.thumbnailUrl ?? '',
      lowestPrice:    p.lowestPrice ?? 0,
      highestPrice:   p.highestPrice ?? 0,
      averageRating:  p.averageRating ?? 0,
      reviewCount:    p.reviewCount,
      isFeatured:     p.isFeatured,
      isTrending:     p.isTrending,
      marketplaces:   [...new Set(p.prices.map((pr) => pr.marketplace.name))],
      maxDiscount:    Math.max(...p.prices.map((pr) => pr.discount ?? 0), 0),
      inStock:        p.prices.some((pr) => pr.inStock),
      updatedAt:      Math.floor(p.updatedAt.getTime() / 1000),
    }));

    try {
      const result = await typesenseClient
        .collections('products')
        .documents()
        .import(docs, { action: 'upsert' });

      const errors = result.filter((r: any) => !r.success);
      indexed += docs.length - errors.length;
      failed  += errors.length;

      if (errors.length > 0) {
        console.warn(`[Index] Batch ${i / batchSize + 1}: ${errors.length} errors`);
      }
    } catch (err) {
      console.error(`[Index] Batch ${i / batchSize + 1} failed:`, err);
      failed += batch.length;
    }

    process.stdout.write(`\r[Index] Progress: ${Math.min(i + batchSize, products.length)}/${products.length}`);
  }

  console.log(`\n[Index] ✅ Done! Indexed: ${indexed}, Failed: ${failed}`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[Index] Fatal error:', err);
  process.exit(1);
});
