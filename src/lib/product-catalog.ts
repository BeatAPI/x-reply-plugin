export type GrowthProductId = 'beatdesign' | 'beatapi'

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

export const DEFAULT_GROWTH_PRODUCT_ID: GrowthProductId = 'beatdesign'

/**
 * Distilled from internal marketing product notes.
 * Keep claims inside the shipped/current product boundary when updating.
 */
export const GROWTH_PRODUCTS: Record<GrowthProductId, GrowthProductProfile> = {
	beatdesign: {
		id: 'beatdesign',
		name: 'BeatDesign',
		shortLabel: 'Local creative workspace',
		url: 'https://design.beatapi.io/',
		positioning: 'A free, open-source, local-first workspace for AI image and video creation. It connects an infinite Canvas, shared Assets, a short-form Editor, and MCP access in one local Project.',
		audiences: [
			'AI image and video creators already using hosted generation tools',
			'AI builders and indie hackers who work with Codex, Claude Code, Cursor, or another MCP-capable agent',
			'designers and small creative teams who need local project ownership and reusable generation history',
		],
		painPoints: [
			'creative history and unfinished client assets are trapped in hosted tools',
			'canvas exploration and timeline editing are split across disconnected products',
			'proprietary sidebar agents can talk about a project but cannot operate a local workspace the user owns',
			'monthly subscriptions keep charging during idle periods',
		],
		proofPoints: [
			'projects, media, Canvas state, timelines, and generation history stay in a local SQLite-backed workspace',
			'importing, arranging, editing, previewing, and exporting MP4 do not require an account or API key',
			'files are sent to a provider only after the user confirms a remote generation or analysis action',
			'Canvas outputs become shared Assets that can move into the browser-native short-form Editor',
			'26 local MCP tools let compatible agents inspect and update the same Project visible in the browser',
			'Apache-2.0 and designed to be forked or extended',
		],
		replyAngles: [
			'local ownership of creative projects and references',
			'Canvas-to-timeline continuity instead of isolated generations',
			'any MCP-capable agent working in the same local Project',
			'paying for confirmed generation rather than an idle creative-tool subscription',
			'agent-native without forcing creators into a built-in chatbot',
		],
		avoidClaims: [
			'do not claim a signed desktop installer or hosted collaboration',
			'do not call it a full CapCut replacement or a complete agent NLE',
			'do not claim cinematic quality or model breadth beats hosted competitors',
			'do not imply an official relationship with Higgsfield',
		],
	},
	beatapi: {
		id: 'beatapi',
		name: 'BeatAPI',
		shortLabel: 'AI media workflow API',
		url: 'https://beatapi.io/',
		positioning: 'A developer-facing API for image generation, video generation, versioned Effects, and asynchronous media workflows, with stable BeatAPI model and workflow IDs instead of exposing provider-specific plumbing.',
		audiences: [
			'indie developers and AI engineers adding image or video generation to a product',
			'n8n, Make, Zapier, and Pipedream workflow builders',
			'product and creative-automation teams running repeatable or batch media jobs',
		],
		painPoints: [
			'long-running media generation does not fit a fragile synchronous request',
			'provider-specific task states, uploads, retries, and result handling create integration work',
			'generation cost and failure state can be hard to reconcile before a workflow scales',
			'teams need a durable handoff from task creation to polling or webhook delivery and hosted output',
		],
		proofPoints: [
			'API keys, task creation, polling, customer webhooks, file upload, usage inspection, and hosted output URLs',
			'asynchronous task IDs and explicit status handling for long-running media jobs',
			'stable BeatAPI-first model and workflow IDs while provider routing stays private',
			'public image, video, Effect, music-video, ecommerce-video, and video-analysis task routes',
			'usage is represented in USD so builders can inspect balance and task cost without a separate token exchange rate',
		],
		replyAngles: [
			'async task architecture for production media generation',
			'polling versus webhook handoff in automation workflows',
			'predictable task state, output delivery, and usage visibility',
			'one stable integration surface instead of provider-specific plumbing',
			'n8n or product integration patterns for image and video jobs',
		],
		avoidClaims: [
			'do not present BeatAPI as a consumer click-to-generate web editor',
			'do not claim it has every model, the fastest inference, or the best output quality',
			'do not invent savings percentages, benchmarks, uptime, user results, or refund outcomes',
			'do not reduce the product to a grey API relay or shared-key reseller',
		],
	},
}

export const GROWTH_PRODUCT_LIST = Object.values(GROWTH_PRODUCTS)

export function isGrowthProductId(value: unknown): value is GrowthProductId {
	return value === 'beatdesign' || value === 'beatapi'
}

export function getGrowthProduct(id: GrowthProductId): GrowthProductProfile {
	return GROWTH_PRODUCTS[id]
}
