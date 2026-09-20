import type { LLMSettings } from './types'
import { getLLMConfig } from './storage'
import type { GrowthProductProfile } from './product-catalog'

export type ReplyPlatform = 'x' | 'reddit'

export interface ReplyContext {
	platform: ReplyPlatform
	url: string
	contentId: string
	authorName: string
	authorHandle: string
	title: string
	text: string
	language: string
	postedAt: string
	quotedText: string
	metrics: string[]
	currentAccount: string
	canReply: boolean
	community: string
}

export interface ReplyPair {
	valueOnly: string
	productLink: string
}

function compact(value: string, maxLength: number): string {
	return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function stripCodeFence(value: string): string {
	return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
}

function removeUrls(value: string): string {
	return value.replace(/https?:\/\/\S+/gi, '').replace(/[ \t]+\n/g, '\n').replace(/ {2,}/g, ' ').trim()
}

export function normalizeReplyPair(input: Partial<ReplyPair>, productUrl: string): ReplyPair {
	const valueOnly = removeUrls(String(input.valueOnly || ''))
	const productBody = removeUrls(String(input.productLink || ''))
	const productLink = productBody ? `${productBody}\n\n${productUrl}` : productUrl
	return { valueOnly, productLink }
}

export function xWeightedLength(value: string): number {
	const urls = value.match(/https?:\/\/\S+/g) || []
	const withoutUrls = value.replace(/https?:\/\/\S+/g, '')
	return Array.from(withoutUrls).length + urls.length * 23
}

function platformStyle(platform: ReplyPlatform): string[] {
	if (platform === 'reddit') {
		return [
			'Write natural Reddit comments, not X-style one-liners or marketing copy.',
			'Use one compact paragraph or two short paragraphs, usually two to five sentences and under 900 characters.',
			'Answer the actual question or advance the discussion with a concrete explanation, tradeoff, example, or practical next step.',
		]
	}
	return [
		'Write idiomatic contemporary X replies at a real indie-builder altitude: direct, specific, and conversational.',
		'Keep each version to one to three short sentences and under 250 weighted characters.',
		'Prefer a concrete builder observation, implication, constraint, counterpoint, or sharp question.',
	]
}

function buildSystemPrompt(context: ReplyContext, product: GrowthProductProfile): string {
	return [
		`You write source-specific replies for ${context.platform === 'reddit' ? 'Reddit communities' : 'an English indie AI builder account on X'}.`,
		...platformStyle(context.platform),
		'Return exactly two complete versions: valueOnly and productLink.',
		'valueOnly is for building trust and influence. It must provide standalone value, must not mention the selected product or its company, must contain no URL, and must have no promotional CTA.',
		`productLink is for explicit promotion. It must first respond usefully to the source, then naturally mention ${product.name}, and include its exact URL once.`,
		'The two versions may use the same core observation, but each must read as a complete independent reply.',
		'Do not claim first-hand testing, user results, revenue, benchmarks, or capabilities not present in the provided facts.',
		'Do not summarize the source. Do not begin with generic praise such as Great post, Exactly, or Thanks for sharing.',
		'Use the source language. For English, write native, conversational English, never translated, corporate, or sales-deck English.',
		'Do not output a relevance score, fit judgment, recommendation, or warning. The user owns that decision.',
		'Return strict JSON only with keys: valueOnly, productLink.',
	].join('\n')
}

function buildUserPrompt(context: ReplyContext, product: GrowthProductProfile): string {
	return [
		`Platform: ${context.platform}`,
		context.community ? `Community: ${context.community}` : '',
		`Author: ${context.authorName} (${context.authorHandle})`,
		`URL: ${context.url}`,
		`Language: ${context.language}`,
		context.title ? `Title: ${compact(context.title, 500)}` : '',
		`Source: ${compact(context.text, 2400)}`,
		context.quotedText ? `Visible parent/quoted context: ${compact(context.quotedText, 1400)}` : '',
		'',
		'The selected product below is ONLY for productLink. Do not name or promote it in valueOnly.',
		`Selected product: ${product.name}`,
		`Positioning: ${product.positioning}`,
		`Audience: ${product.audiences.join('; ')}`,
		`User pains it addresses: ${product.painPoints.join('; ')}`,
		`Verified product facts: ${product.proofPoints.join('; ')}`,
		`Useful product angles: ${product.replyAngles.join('; ')}`,
		`Claims to avoid: ${product.avoidClaims.join('; ')}`,
		`Exact destination: ${product.url}`,
		'',
		'Generate both complete versions now. valueOnly must stand on its own with no product name and no link. productLink must provide value first, then mention the selected product and exact destination once.',
	].filter(Boolean).join('\n')
}

function isEvolink(config: LLMSettings): boolean {
	return config.baseUrl.toLowerCase().includes('evolink.ai') && config.model.toLowerCase().includes('gemini')
}

async function generateViaEvolink(config: LLMSettings, system: string, user: string): Promise<string> {
	const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/v1beta/models/${encodeURIComponent(config.model)}:generateContent`
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
		},
		body: JSON.stringify({
			contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
			generationConfig: { temperature: 0.72, maxOutputTokens: 900, responseMimeType: 'application/json' },
		}),
		signal: AbortSignal.timeout(25_000),
	})
	if (!response.ok) throw new Error(`Model request failed (${response.status})`)
	const data = await response.json()
	const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim()
	if (!text) throw new Error('The model returned no reply.')
	return text
}

async function generateViaChatCompletions(config: LLMSettings, system: string, user: string): Promise<string> {
	const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
		},
		body: JSON.stringify({
			model: config.model,
			messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
			temperature: 0.72,
			max_tokens: 900,
			response_format: { type: 'json_object' },
			...(config.baseUrl.includes('deepseek.com') ? { thinking: { type: 'disabled' } } : {}),
		}),
		signal: AbortSignal.timeout(25_000),
	})
	if (!response.ok) {
		if (response.status === 401 || response.status === 403) throw new Error('Model auth failed. Check your API key in settings.')
		if (response.status === 429) throw new Error('Rate limited. Try again shortly.')
		throw new Error(`Model request failed (${response.status})`)
	}
	const data = await response.json()
	const text = data.choices?.[0]?.message?.content?.trim()
	if (!text) throw new Error('The model returned no reply.')
	return text
}

export async function generateReplyPair(context: ReplyContext, product: GrowthProductProfile): Promise<ReplyPair> {
	const config = await getLLMConfig()
	if (!config.baseUrl || !config.model || !config.apiKey) {
		throw new Error('Configure a model and API key in settings first.')
	}
	const system = buildSystemPrompt(context, product)
	const user = buildUserPrompt(context, product)
	const raw = isEvolink(config)
		? await generateViaEvolink(config, system, user)
		: await generateViaChatCompletions(config, system, user)

	let parsed: Partial<ReplyPair>
	try {
		parsed = JSON.parse(stripCodeFence(raw)) as Partial<ReplyPair>
	} catch {
		throw new Error('Could not parse the model response. Generate again.')
	}
	const result = normalizeReplyPair(parsed, product.url)
	if (!result.valueOnly || !result.productLink) throw new Error('The model did not return both drafts. Generate again.')
	const valueOnlyLower = result.valueOnly.toLowerCase()
	const forbiddenProductTerms = [product.name, 'BeatAPI', 'BeatDesign', 'beatapi.io', 'design.beatapi.io']
	if (forbiddenProductTerms.some((term) => valueOnlyLower.includes(term.toLowerCase()))) {
		throw new Error('The value draft still mentions the product. Generate again.')
	}
	if (!result.productLink.toLowerCase().includes(product.name.toLowerCase())) {
		throw new Error('The promo draft does not mention the selected product. Generate again.')
	}
	return result
}
