export interface Price {
  marketplace: string
  price: number
  mrp?: number
  coupon?: string
  deliveryETA?: string
  sellerRating?: number
  affiliateUrl: string
  updatedAt: string
}

export interface Product {
  id: string
  slug: string
  title: string
  brand: string
  sku?: string
  category: string
  images: string[]
  specSnippet?: string
  specs?: Record<string, string>
  rating?: number
  reviewCount?: number
  prices: Price[]
  identifiers?: { asin?: string; flipkartId?: string }
  sponsored?: boolean
  createdAt: string
  updatedAt: string
}

export interface SearchResult {
  products: Product[]
  total: number
  page: number
  perPage: number
  facets?: Record<string, Array<{ value: string; count: number }>>
}

export interface PriceHistory {
  marketplace: string
  data: Array<{ date: string; price: number }>
}
