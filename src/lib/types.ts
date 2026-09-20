/** Product profile loaded from the local backlink workbench DB. */
export interface ProductLinkTarget {
	id: string
	label: string
	url: string
	defaultAnchor?: string
}

export interface ProductProfile {
	id: string
	/** Product code from the local workbench, e.g. WMhub or GPTimage. */
	recordId?: string
	name: string
	url: string
	linkTargets?: ProductLinkTarget[]
	tagline: string
	shortDesc: string
	longDesc: string
	categories: string[]
	useCase: string
	coreFeatures: string
	competition: string
	founderName: string
	founderEmail: string
	xHandle: string
	xUrl: string
	communityComment: string
	company: string
	pricingPlan: string
	createdAt?: number
	updatedAt?: number
}

export type ProductProfileInput = Omit<ProductProfile, 'id' | 'recordId' | 'createdAt' | 'updatedAt'>

export type MainSiteStatus = 'pending' | 'manual_review' | 'in_review' | 'done' | 'submit_failed' | 'site_unavailable'

export type SubmissionStatus =
	| 'not_started'
	| 'in_progress'
	| 'submitted'
	| 'approved'
	| 'rejected'
	| 'failed'
	| 'skipped'

/** Tracks per-site submission state in IndexedDB */
export interface SubmissionRecord {
	id: string
	siteName: string
	siteRecordId?: string
	productId: string
	status: SubmissionStatus
	rewrittenDesc?: string
	submittedAt?: number
	notes?: string
	createdAt: number
	updatedAt: number
}

/** One site record loaded from the local backlink workbench DB. */
export interface SiteData {
	recordId?: string
	name: string
	submit_url: string | null
	category: string
	lang?: string
	dr: number | null
	competitorCount?: number | null
	monthly_traffic: string
	pricing: string
	status?: string
	source?: string
	mainSiteStatus?: MainSiteStatus | null
	mainSitePriority?: SubmissionPriorityTier | null
	mainSiteSubmittedDate?: string | null
	mainSiteRemark?: string | null
	wmhubDomain?: string | null
	aiRemark?: string | null
	notes?: string
}

export type SubmissionPriorityTier = 'P0' | 'P1' | 'P2'

export interface StatusEventDailySummary {
	date: string
	total: number
	byCategory: {
		freeDirectory: number
		paidDirectory: number
		blogComment: number
	}
	byStatus: {
		pending: number
		manualReview: number
		reviewing: number
		completed: number
		failed: number
	}
}

/** LLM config persisted in chrome.storage.local — BeatAPI Text API only (OpenAI-compatible). */
export interface LLMSettings {
	apiKey: string
	baseUrl: string
	model: string
}

/** Preset model IDs from BeatAPI Text API docs (public catalogue). */
export interface BeatApiModelPreset {
	id: string
	label: string
	family: string
}

/** Extension-wide settings persisted in chrome.storage.local */
export interface ExtSettings {
	llm: LLMSettings
	language: 'en' | 'zh'
	autoRewriteDesc: boolean
}

/** Message types for background <-> content script communication */
export type MessageType = 'PAGE_CONTROL' | 'TAB_CONTROL' | 'TAB_CHANGE' | 'SUBMIT_CONTROL' | 'GET_STATUS'

export interface ExtMessage {
	type: MessageType
	action: string
	payload?: unknown
	targetTabId?: number
}
