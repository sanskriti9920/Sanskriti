/**
 * PriceSpy Backend — Fastify API Server
 * Exposes REST endpoints for products, search, prices, alerts, and click tracking.
 */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

// Route handlers
import { productRoutes } from './routes/products'
import { searchRoutes } from './routes/search'
import { alertRoutes } from './routes/alerts'
import { outRoutes } from './routes/out'
import { adminRoutes } from './routes/admin'
import { healthRoutes } from './routes/health'
import { logger } from './lib/logger'

// ── Global instances ──────────────────────────────────────
export const prisma = new PrismaClient({ log: ['warn', 'error'] })
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

const server = Fastify({ logger: false })

async function bootstrap() {
  // ── Plugins ──
  await server.register(helmet, { contentSecurityPolicy: false })
  await server.register(cors, {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  })
  await server.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    redis,
    keyGenerator: req => req.ip,
  })
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  })

  // ── Routes ──
  await server.register(healthRoutes, { prefix: '/health' })
  await server.register(productRoutes, { prefix: '/products' })
  await server.register(searchRoutes, { prefix: '/search' })
  await server.register(alertRoutes, { prefix: '/alerts' })
  await server.register(outRoutes, { prefix: '/out' })
  await server.register(adminRoutes, { prefix: '/admin' })

  // ── Connect DB & Redis ──
  await redis.connect().catch(() => logger.warn('Redis connect failed — caching disabled'))
  await prisma.$connect()

  const port = parseInt(process.env.API_PORT || '4000')
  await server.listen({ port, host: '0.0.0.0' })
  logger.info(`🚀 PriceSpy API running on http://0.0.0.0:${port}`)
}

bootstrap().catch(err => {
  logger.error('Failed to start server', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.close()
  await prisma.$disconnect()
  redis.disconnect()
  process.exit(0)
})
