import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index'
import { z } from 'zod'

const CACHE_TTL = 300

export async function productRoutes(server: FastifyInstance) {
  server.get('/', async (req, reply) => {
    const { category, brand, sort = 'createdAt', limit = '24', page = '1' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const cacheKey = `products:${JSON.stringify(req.query)}`
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return reply.send(JSON.parse(cached))

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (brand) where.brand = brand

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: parseInt(limit), include: { prices: { orderBy: { price: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ])

    const result = { products, total, page: parseInt(page), perPage: parseInt(limit) }
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)).catch(() => null)
    return reply.send(result)
  })

  server.get('/slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string }
    const cached = await redis.get(`product:${slug}`).catch(() => null)
    if (cached) return reply.send(JSON.parse(cached))
    const product = await prisma.product.findUnique({ where: { slug }, include: { prices: { orderBy: { price: 'asc' } } } })
    if (!product) return reply.status(404).send({ error: 'Not found' })
    await redis.setex(`product:${slug}`, CACHE_TTL, JSON.stringify(product)).catch(() => null)
    return reply.send(product)
  })

  server.get('/:id/history', async (req, reply) => {
    const { id } = req.params as { id: string }
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const history = await prisma.priceHistory.findMany({ where: { productId: id, recordedAt: { gte: since } }, orderBy: { recordedAt: 'asc' } })
    const grouped = history.reduce((acc: Record<string, unknown[]>, h) => {
      if (!acc[h.marketplace]) acc[h.marketplace] = []
      ;(acc[h.marketplace] as unknown[]).push({ date: h.recordedAt.toISOString().split('T')[0], price: h.price })
      return acc
    }, {})
    return reply.send(Object.entries(grouped).map(([marketplace, data]) => ({ marketplace, data })))
  })
}
