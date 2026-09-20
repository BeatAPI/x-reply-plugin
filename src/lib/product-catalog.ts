export type GrowthProductId = string

export interface GrowthProductProfile {
	id: GrowthProductId
	name: string
	shortLabel: string
	url: string
	positioning: string
	audiences: string[]
	painPoints: string[]
	proofPoints: string[]
	replyAngles: string[]
	avoidClaims: string[]
}

/**
 * Open-source default: one placeholder product.
 * For private builds, put your real catalogue in `local/product-catalog.ts`
 * (gitignored). `wxt.config.ts` prefers that file when present.
 */
export const DEFAULT_GROWTH_PRODUCT_ID: GrowthProductId = 'example'

export const GROWTH_PRODUCTS: Record<string, GrowthProductProfile> = {
	example: {
		id: 'example',
		name: 'Example Product',
		shortLabel: 'Your product',
		url: 'https://example.com',
		positioning: 'Replace this catalogue with your own product notes before shipping growth replies.',
		audiences: ['builders evaluating tools in public threads'],
		painPoints: ['generic advice with no concrete next step'],
		proofPoints: ['you control the claims that appear in product-link replies'],
		replyAngles: ['offer a concrete workflow tip, then optionally link your product'],
		avoidClaims: ['do not invent metrics, partnerships, or unreleased features'],
	},
}

export const GROWTH_PRODUCT_LIST = Object.values(GROWTH_PRODUCTS)

export function isGrowthProductId(value: unknown): value is GrowthProductId {
	return typeof value === 'string' && value in GROWTH_PRODUCTS
}

export function getGrowthProduct(id: GrowthProductId): GrowthProductProfile {
	return GROWTH_PRODUCTS[id] ?? GROWTH_PRODUCTS[DEFAULT_GROWTH_PRODUCT_ID]
}
