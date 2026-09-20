/**
 * Public BeatAPI Text API model presets.
 * IDs taken from docs.beatapi.io/text-api/* (2026-09).
 * Users may still type a custom model ID in settings.
 */
import type { BeatApiModelPreset } from './types'

export const BEATAPI_DEFAULT_BASE_URL = 'https://api.beatapi.io/v1'

/** Default generation model for X Reply drafts. */
export const BEATAPI_DEFAULT_MODEL = 'deepseek-v4.1-flash'

export const BEATAPI_MODEL_PRESETS: BeatApiModelPreset[] = [
	{ id: 'deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash', family: 'DeepSeek' },
	{ id: 'deepseek-v4-flash-0731', label: 'DeepSeek V4 Flash', family: 'DeepSeek' },
	{ id: 'deepseek-v4-pro-0813', label: 'DeepSeek V4 Pro', family: 'DeepSeek' },
	{ id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', family: 'GPT' },
	{ id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', family: 'GPT' },
	{ id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', family: 'GPT' },
	{ id: 'gpt-6-astra', label: 'GPT-6 Astra', family: 'GPT' },
	{ id: 'claude-fable-5-1', label: 'Claude Fable 5.1', family: 'Claude' },
	{ id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', family: 'Gemini' },
	{ id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', family: 'Gemini' },
	{ id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', family: 'Gemini' },
	{ id: 'grok-4.6', label: 'Grok 4.6', family: 'Grok' },
	{ id: 'kimi-k3', label: 'Kimi K3', family: 'Kimi' },
	{ id: 'glm-5.3-flash', label: 'GLM 5.3 Flash', family: 'GLM' },
	{ id: 'glm-5.3', label: 'GLM 5.3', family: 'GLM' },
	{ id: 'qwen3.8-flash', label: 'Qwen 3.8 Flash', family: 'Qwen' },
	{ id: 'qwen3.8-max', label: 'Qwen 3.8 Max', family: 'Qwen' },
	{ id: 'MiniMax-M3', label: 'MiniMax M3', family: 'MiniMax' },
	{ id: 'mimo-v2.5', label: 'MiMo V2.5', family: 'MiMo' },
	{ id: 'mimo-v2.5-pro', label: 'MiMo V2.5 Pro', family: 'MiMo' },
]

export function emptyBeatApiSettings(): { apiKey: string; baseUrl: string; model: string } {
	return {
		apiKey: '',
		baseUrl: BEATAPI_DEFAULT_BASE_URL,
		model: BEATAPI_DEFAULT_MODEL,
	}
}
