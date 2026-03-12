/**
 * Affiliate redirect endpoint
 * Logs the click then redirects to the affiliate URL.
 * POST /out — logs click and returns redirect URL
 * GET /out?to=<encoded>&src=<campaign> — redirect
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../index'

export async function outRoutes(server: FastifyInstance) {
  // POST — called from client before opening new tab
  server.post('/', async (req, reply) => {
    const { marketplace, url, productId, campaign } = req.body as Record<string, string>
    await prisma.clickLog.create({
      data: {
        productId: productId || '',
        marketplace: marketplace || '',
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        campaign: campaign || 'site',
      },
    }).catch(() => null) // Non-blocking
    return reply.send({ ok: true })
  })

  // GET — server-side redirect (for SEO / deep linking)
  server.get('/', async (req, reply) => {
    const { to, src = 'site', pid } = req.query as Record<string, string>
    if (!to) return reply.status(400).send({ error: 'Missing `to` param' })

    const url = Buffer.from(to, 'base64').toString('utf-8')

    // Validate URL (basic)
    try { new URL(url) } catch { return reply.status(400).send({ error: 'Invalid URL' }) }

    // Log click
    if (pid) {
      await prisma.clickLog.create({
        data: { productId: pid, marketplace: 'unknown', ip: req.ip, userAgent: req.headers['user-agent'] || '', campaign: src },
      }).catch(() => null)
    }

    return reply.redirect(302, url)
  })
}
