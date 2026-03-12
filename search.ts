import type { FastifyInstance } from 'fastify'
import { typesense } from '../lib/typesense'
import { prisma, redis } from '../index'

export async function searchRoutes(server: FastifyInstance) {
  // Full search
  server.get('/', async (req, reply) => {
    const { q = '', category, marketplace, minRating, sort = 'relevance', page = '1', limit = '24' } = req.query as Record<string, string>

    const filterParts: string[] = []
    if (category) filterParts.push(`category:=${category}`)
    if (marketplace) filterParts.push(`marketplaces:=[${marketplace}]`)
    if (minRating) filterParts.push(`rating:>=${minRating}`)

    const sortBy = sort === 'price_asc' ? 'bestPrice:asc'
      : sort === 'price_desc' ? 'bestPrice:desc'
      : sort === 'discount' ? 'discount:desc'
      : sort === 'rating' ? 'rating:desc'
      : '_text_match:desc'

    try {
      const results = await typesense.collections('products').documents().search({
        q: q || '*',
        query_by: 'title,brand,specSnippet',
        filter_by: filterParts.join(' && ') || undefined,
        sort_by: sortBy,
        page: parseInt(page),
        per_page: parseInt(limit),
        facet_by: 'brand,category,marketplaces',
      })

      // Enrich with DB prices
      const ids = (results.hits || []).map((h: any) => h.document.id)
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        include: { prices: { orderBy: { price: 'asc' } } },
      })
      const byId = Object.fromEntries(products.map(p => [p.id, p]))
      const ordered = ids.map((id: string) => byId[id]).filter(Boolean)

      return reply.send({
        products: ordered,
        total: results.found,
        page: parseInt(page),
        perPage: parseInt(limit),
        facets: results.facet_counts,
      })
    } catch (err) {
      // Fallback to DB search
      const where: Record<string, unknown> = {}
      if (q) where.title = { contains: q, mode: 'insensitive' }
      if (category) where.category = category
      const [products, total] = await Promise.all([
        prisma.product.findMany({ where, include: { prices: { orderBy: { price: 'asc' } } }, take: parseInt(limit), skip: (parseInt(page) - 1) * parseInt(limit) }),
        prisma.product.count({ where }),
      ])
      return reply.send({ products, total, page: parseInt(page), perPage: parseInt(limit) })
    }
  })

  // Autocomplete suggestions
  server.get('/suggest', async (req, reply) => {
    const { q = '' } = req.query as { q: string }
    if (q.length < 2) return reply.send({ suggestions: [] })

    const cacheKey = `suggest:${q.toLowerCase()}`
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send({ suggestions: JSON.parse(cached) })

    try {
      const results = await typesense.collections('products').documents().search({
        q, query_by: 'title,brand', per_page: 8, prefix: true,
      })
      const suggestions = [...new Set((results.hits || []).map((h: any) => h.document.title))].slice(0, 8)
      await redis.setex(cacheKey, 60, JSON.stringify(suggestions)).catch(() => null)
      return reply.send({ suggestions })
    } catch {
      const products = await prisma.product.findMany({
        where: { title: { contains: q, mode: 'insensitive' } }, take: 8, select: { title: true },
      })
      return reply.send({ suggestions: products.map(p => p.title) })
    }
  })
}
