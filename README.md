# PriceSpy 🔍💰
> The modern price-comparison engine — beautiful, fast, and built for India's multi-marketplace ecosystem.

**Best price across 15+ stores • सस्ता → Fastest route to buy.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TailwindCSS, Framer Motion |
| **Backend** | Node.js + Fastify (TypeScript) |
| **Search** | Typesense (self-hosted) with Postgres fallback |
| **Database** | PostgreSQL via Prisma ORM |
| **Cache** | Redis (ioredis) |
| **Queue** | BullMQ |
| **Scrapers** | Playwright (Node) with rotating proxy support |
| **Deploy** | Docker + Vercel (frontend) + AWS (backend) |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yourorg/pricespy && cd pricespy

# 2. Set up environment
cp .env.example .env
# Edit .env — add your affiliate keys, JWT secret

# 3. Start services (Postgres, Redis, Typesense)
docker compose up -d db redis typesense

# 4. Install all deps
npm install

# 5. Run DB migrations
npm run migrate

# 6. Seed 200 sample products
npm run seed

# 7. Index into Typesense
npm run index

# 8. Run development server
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## Affiliate Keys Setup

Open `.env` and add your keys:

```bash
AFFILIATE_AMAZON_TAG=pricespy-21        # Amazon Associates tag
AFFILIATE_FLIPKART_ID=pricespy123       # Flipkart Affiliate ID
AFFILIATE_MYNTRA_ID=your_myntra_id      # Myntra Affiliate ID
```

Get keys from:
- Amazon: https://affiliate-program.amazon.in
- Flipkart: https://affiliate.flipkart.com
- Myntra: https://affiliates.myntra.com

---

## Architecture

```
Browser
  │
  ▼
Next.js 14 Frontend (Vercel)
  │   REST + SSR
  ▼
Fastify API (Port 4000)
  ├── /search     ──► Typesense
  ├── /products   ──► PostgreSQL + Redis cache
  ├── /out        ──► Click log + affiliate redirect
  └── /alerts     ──► Price alert storage
       │
  BullMQ Workers
       │
  Playwright Scrapers ──► Amazon, Flipkart, Myntra...
```

---

## Key Commands

```bash
npm run dev        # Start both frontend (3000) and backend (4000)
npm run build      # Production build
npm run migrate    # Run Prisma migrations
npm run seed       # Seed 200 products into DB
npm run index      # Index products into Typesense
npm run scrape     # Run price update scrapers manually
npm run test       # Run all tests
npm run lint       # Lint all code
npm run db:backup  # Backup Postgres to ./backups/
npm run db:restore # Restore from latest backup
```

---

## Adding a New Marketplace

1. Copy `backend/src/scrapers/amazon.ts` → `backend/src/scrapers/newstore.ts`
2. Implement the `scrapeNewstoreProduct()` function
3. Add affiliate link builder in `backend/src/services/affiliate.ts`
4. Add BullMQ job in `backend/src/workers/price-update.worker.ts`
5. Add logo to `frontend/public/logos/newstore.svg`
6. Update `MARKETPLACE_COLORS` in `frontend/src/components/product/ProductCard.tsx`

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Add env vars in Vercel dashboard → Settings → Environment Variables
```

### Backend + Workers → AWS EC2

```bash
# On server:
docker compose -f docker-compose.prod.yml up -d
# Or use ECS Fargate for auto-scaling workers
```

### Database → AWS RDS (recommended for prod)

Set `DATABASE_URL` to your RDS PostgreSQL connection string.

---

## Security Checklist

- [ ] Change `JWT_SECRET` to 32+ random chars
- [ ] Set strong `ADMIN_PASSWORD`
- [ ] Restrict CORS to your domain in `backend/src/index.ts`
- [ ] Enable HTTPS (Vercel handles it for frontend; use nginx for backend)
- [ ] Never commit `.env` to git (already in `.gitignore`)
- [ ] Rotate scraper proxies to avoid bans
- [ ] Prefer official Affiliate APIs over scraping (better rate limits + legal)
- [ ] Respect `robots.txt` of target sites

---

## SEO Features

- ✅ Server-side rendered product pages (Next.js SSR)
- ✅ schema.org/Product structured data on every product page
- ✅ OG meta tags for social sharing
- ✅ Dynamic sitemap at `/sitemap.xml`
- ✅ robots.txt at `/robots.txt`
- ✅ Canonical URLs

---

## Legal & Disclosure

- Affiliate disclosure in Footer (required by law)
- Privacy policy template at `/privacy`
- Users must agree to terms before setting alerts
- Do not scrape sites that prohibit it in their TOS

---

## Microcopy Reference (EN + HI)

| Context | English | Hindi |
|---|---|---|
| Hero tagline | "Best price across 15+ stores" | "15+ स्टोर पर सबसे सस्ता" |
| Search prompt | "Sasta → Fastest route to buy" | "सस्ता शॉपिंग, स्मार्ट शॉपिंग" |
| Alert set | "We'll notify you when price drops" | "कीमत गिरने पर ईमेल पाएं" |
| Loading | "Finding best prices..." | "सबसे अच्छी कीमत ढूंढ रहे हैं..." |
