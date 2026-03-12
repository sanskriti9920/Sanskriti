import Typesense from 'typesense'

export const typesense = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.TYPESENSE_PORT || '8108'),
    protocol: (process.env.TYPESENSE_PROTOCOL || 'http') as 'http' | 'https',
  }],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz123localdev',
  connectionTimeoutSeconds: 5,
})

// Product collection schema
export const PRODUCT_SCHEMA = {
  name: 'products',
  fields: [
    { name: 'id',           type: 'string' as const },
    { name: 'slug',         type: 'string' as const },
    { name: 'title',        type: 'string' as const },
    { name: 'brand',        type: 'string' as const, facet: true },
    { name: 'category',     type: 'string' as const, facet: true },
    { name: 'specSnippet',  type: 'string' as const, optional: true },
    { name: 'bestPrice',    type: 'float'  as const },
    { name: 'rating',       type: 'float'  as const, optional: true },
    { name: 'discount',     type: 'float'  as const, optional: true },
    { name: 'images',       type: 'string[]' as const },
    { name: 'marketplaces', type: 'string[]' as const, facet: true },
  ],
  default_sorting_field: 'bestPrice',
}

export async function ensureCollection() {
  try {
    await typesense.collections('products').retrieve()
  } catch {
    await typesense.collections().create(PRODUCT_SCHEMA)
  }
}
