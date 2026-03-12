import type { FastifyInstance } from 'fastify'
import { prisma } from '../index'
import { z } from 'zod'

const alertSchema = z.object({
  productId: z.string(),
  email: z.string().email(),
  targetPrice: z.number().positive(),
})

export async function alertRoutes(server: FastifyInstance) {
  server.post('/', async (req, reply) => {
    const body = alertSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const alert = await prisma.priceAlert.create({ data: body.data })
    return reply.status(201).send(alert)
  })
}
