import type { FastifyInstance } from 'fastify'
import { prisma } from '../index'
import bcrypt from 'bcryptjs'

export async function adminRoutes(server: FastifyInstance) {
  // Login
  server.post('/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string }
    const user = await prisma.adminUser.findUnique({ where: { email } })
    if (!user || !await bcrypt.compare(password, user.password)) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }
    const token = server.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' })
    return reply.send({ token })
  })

  // Stats (protected — verify in prod)
  server.get('/stats', async (_, reply) => {
    const [products, clicks, alerts] = await Promise.all([
      prisma.product.count(),
      prisma.clickLog.count(),
      prisma.priceAlert.count(),
    ])
    return reply.send({ products, clicks, alerts })
  })
}
