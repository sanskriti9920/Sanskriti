import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index'

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (_, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redis.ping().then(r => r === 'PONG').catch(() => false),
    ])
    return reply.send({ status: dbOk && redisOk ? 'ok' : 'degraded', db: dbOk, redis: redisOk, ts: new Date().toISOString() })
  })
}
