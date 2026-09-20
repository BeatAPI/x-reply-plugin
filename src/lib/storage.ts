import type { ExtSettings, LLMSettings } from './types'
import { DEFAULT_GROWTH_PRODUCT_ID, isGrowthProductId, type GrowthProductId } from './product-catalog'
import {
	BEATAPI_DEFAULT_BASE_URL,
	BEATAPI_DEFAULT_MODEL,
	emptyBeatApiSettings,
} from './beatapi-models'

const STORAGE_KEYS = {
	llmConfig: 'beatapiXGrowth_llmConfig',
	/** @deprecated multi-provider storage; migrated into llmConfig */
	providerConfigs: 'beatapiXGrowth_providerConfigs',
	language: 'beatapiXGrowth_language',
	autoRewrite: 'beatapiXGrowth_autoRewrite',
	activeProductId: 'beatapiXGrowth_activeProductId',
	targetPageUrlsByProduct: 'beatapiXGrowth_targetPageUrlsByProduct',
	floatButtonEnabled: 'beatapiXGrowth_floatButtonEnabled',
} as const

function normalizeLlm(raw?: Partial<LLMSettings> | null): LLMSettings {
	const defaults = emptyBeatApiSettings()
	const apiKey = typeof raw?.apiKey === 'string' ? raw.apiKey : ''
	let baseUrl = typeof raw?.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim() : defaults.baseUrl
	// Always keep BeatAPI origin for this open-source plugin unless user overrides to api.beatapi.io
	if (!baseUrl.includes('beatapi.io')) {
		baseUrl = BEATAPI_DEFAULT_BASE_URL
	}
	baseUrl = baseUrl.replace(/\/+$/, '')
	if (!baseUrl.endsWith('/v1')) {
		baseUrl = `${baseUrl}/v1`
	}
	const model = typeof raw?.model === 'string' && raw.model.trim() ? raw.model.trim() : BEATAPI_DEFAULT_MODEL
	return { apiKey, baseUrl, model }
}

function migrateFromLegacyProviders(stored: unknown): LLMSettings | null {
	if (!stored || typeof stored !== 'object') return null
	const pc = stored as { active?: string; configs?: Record<string, Partial<LLMSettings>> }
	const configs = pc.configs
	if (!configs) return null
	// Prefer an already-selected BeatAPI slot, else any apiKey the user had typed.
	const preferred =
		configs.beatapi ||
		(pc.active && configs[pc.active]) ||
		configs.custom ||
		configs.openai ||
		configs.deepseek ||
		null
	if (!preferred) return null
	const migrated = normalizeLlm({
		apiKey: preferred.apiKey || '',
		baseUrl: BEATAPI_DEFAULT_BASE_URL,
		model: preferred.model?.includes('deepseek') ? preferred.model : BEATAPI_DEFAULT_MODEL,
	})
	// Never carry obfuscated third-party keys into the OSS BeatAPI-only build.
	if (migrated.apiKey && !preferred.apiKey) {
		migrated.apiKey = ''
	}
	return migrated
}

export async function getLLMConfig(): Promise<LLMSettings> {
	const result = await chrome.storage.local.get([STORAGE_KEYS.llmConfig, STORAGE_KEYS.providerConfigs])
	const direct = result[STORAGE_KEYS.llmConfig] as Partial<LLMSettings> | undefined
	if (direct && (direct.apiKey !== undefined || direct.model || direct.baseUrl)) {
		return normalizeLlm(direct)
	}
	const migrated = migrateFromLegacyProviders(result[STORAGE_KEYS.providerConfigs])
	if (migrated) {
		await chrome.storage.local.set({ [STORAGE_KEYS.llmConfig]: migrated })
		return migrated
	}
	return emptyBeatApiSettings()
}

export async function setLLMConfig(config: LLMSettings): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEYS.llmConfig]: normalizeLlm(config) })
}

export async function getLanguage(): Promise<'en' | 'zh'> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.language)
	return (result[STORAGE_KEYS.language] as 'en' | 'zh') ?? 'en'
}

export async function setLanguage(lang: 'en' | 'zh'): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEYS.language]: lang })
}

export async function getAutoRewrite(): Promise<boolean> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.autoRewrite)
	return (result[STORAGE_KEYS.autoRewrite] as boolean) ?? true
}

export async function setAutoRewrite(value: boolean): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEYS.autoRewrite]: value })
}

export async function getFloatButtonEnabled(): Promise<boolean> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.floatButtonEnabled)
	return (result[STORAGE_KEYS.floatButtonEnabled] as boolean) ?? true
}

export async function setFloatButtonEnabled(value: boolean): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEYS.floatButtonEnabled]: value })
}

export async function getActiveProductId(): Promise<GrowthProductId> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.activeProductId)
	const stored = result[STORAGE_KEYS.activeProductId]
	return isGrowthProductId(stored) ? stored : DEFAULT_GROWTH_PRODUCT_ID
}

export async function setActiveProductId(id: GrowthProductId): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEYS.activeProductId]: id })
}

export async function getProductTargetPageUrl(productKey: string): Promise<string | null> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.targetPageUrlsByProduct)
	const urls = result[STORAGE_KEYS.targetPageUrlsByProduct] as Record<string, string> | undefined
	return urls?.[productKey] ?? null
}

export async function setProductTargetPageUrl(productKey: string, url: string): Promise<void> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.targetPageUrlsByProduct)
	const urls = result[STORAGE_KEYS.targetPageUrlsByProduct] as Record<string, string> | undefined
	await chrome.storage.local.set({
		[STORAGE_KEYS.targetPageUrlsByProduct]: {
			...(urls ?? {}),
			[productKey]: url,
		},
	})
}

export async function getExtSettings(): Promise<ExtSettings> {
	const [llm, language, autoRewriteDesc] = await Promise.all([
		getLLMConfig(),
		getLanguage(),
		getAutoRewrite(),
	])
	return { llm, language, autoRewriteDesc }
}
