import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import type { LLMSettings } from '@/lib/types'
import { getLLMConfig, setLLMConfig } from '@/lib/storage'
import { testLLMConnection } from '@/lib/llm-test'
import {
	BEATAPI_DEFAULT_BASE_URL,
	BEATAPI_DEFAULT_MODEL,
	BEATAPI_MODEL_PRESETS,
	emptyBeatApiSettings,
} from '@/lib/beatapi-models'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export function XSettingsPanel({ onBack }: { onBack: () => void }) {
	const [config, setConfig] = useState<LLMSettings>(emptyBeatApiSettings())
	const [showKey, setShowKey] = useState(false)
	const [customModel, setCustomModel] = useState(false)
	const [showEndpoint, setShowEndpoint] = useState(false)
	const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
	const [testMessage, setTestMessage] = useState('')

	useEffect(() => {
		void getLLMConfig().then((value) => {
			setConfig(value)
			const isPreset = BEATAPI_MODEL_PRESETS.some((preset) => preset.id === value.model)
			setCustomModel(!isPreset)
			const endpointCustom =
				Boolean(value.baseUrl) &&
				value.baseUrl.replace(/\/$/, '') !== BEATAPI_DEFAULT_BASE_URL.replace(/\/$/, '')
			setShowEndpoint(endpointCustom)
		})
	}, [])

	const update = (field: keyof LLMSettings, value: string) => {
		setConfig((previous) => ({ ...previous, [field]: value }))
		setTestState('idle')
	}

	const families = useMemo(() => {
		const map = new Map<string, typeof BEATAPI_MODEL_PRESETS>()
		for (const preset of BEATAPI_MODEL_PRESETS) {
			const list = map.get(preset.family) ?? []
			list.push(preset)
			map.set(preset.family, list)
		}
		return [...map.entries()]
	}, [])

	const selectedPreset = BEATAPI_MODEL_PRESETS.find((preset) => preset.id === config.model)

	const testConnection = async () => {
		setTestState('testing')
		const result = await testLLMConnection(config)
		if (result.ok) {
			setTestState('ok')
			setTestMessage('Connected')
		} else {
			setTestState('error')
			setTestMessage(result.detail || 'Connection failed. Check your API key, base URL, and model ID.')
		}
	}

	const save = async () => {
		await setLLMConfig({
			...config,
			baseUrl: (config.baseUrl.trim() || BEATAPI_DEFAULT_BASE_URL).replace(/\/$/, ''),
			model: config.model.trim() || BEATAPI_DEFAULT_MODEL,
		})
		onBack()
	}

	const logoUrl = chrome.runtime.getURL('assets/logo-light.png')

	return (
		<div className="min-h-screen bg-background">
			<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/80 bg-background/95 px-4 py-4 backdrop-blur">
				<button className="icon-button" type="button" onClick={onBack} aria-label="Back">
					<ArrowLeft size={17} />
				</button>
				<div className="brand-mark">
					<img src={logoUrl} alt="" />
				</div>
				<div>
					<div className="eyebrow">X REPLY</div>
					<h1 className="mt-0.5 text-[17px] font-semibold tracking-tight">Provider</h1>
				</div>
			</header>

			<main className="space-y-4 p-4">
				<section className="paper-panel space-y-4 p-4">
					{/* Provider is fixed — BeatAPI Text */}
					<div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-3 py-3">
						<div className="brand-mark shrink-0">
							<img src={logoUrl} alt="" />
						</div>
						<div className="min-w-0">
							<div className="text-sm font-semibold tracking-tight">BeatAPI</div>
							<div className="text-[11px] text-muted-foreground">Text API · OpenAI-compatible</div>
						</div>
						<span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
							FIXED
						</span>
					</div>

					<Input
						label="API key"
						type={showKey ? 'text' : 'password'}
						value={config.apiKey}
						placeholder="sk-…"
						onChange={(event) => update('apiKey', event.target.value)}
						suffix={
							<button type="button" onClick={() => setShowKey((value) => !value)} className="text-muted-foreground">
								{showKey ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						}
					/>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="model-select">
							Model
						</label>
						<div className="relative">
							<select
								id="model-select"
								className="model-select"
								value={
									customModel
										? '__custom__'
										: selectedPreset
											? config.model
											: '__custom__'
								}
								onChange={(event) => {
									const value = event.target.value
									if (value === '__custom__') {
										setCustomModel(true)
										return
									}
									setCustomModel(false)
									update('model', value)
								}}
							>
								{families.map(([family, presets]) => (
									<optgroup key={family} label={family}>
										{presets.map((preset) => (
											<option key={preset.id} value={preset.id}>
												{preset.label}
											</option>
										))}
									</optgroup>
								))}
								<option value="__custom__">Custom model ID…</option>
							</select>
							<ChevronDown
								size={16}
								className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
						{selectedPreset && !customModel && (
							<p className="text-[11px] text-muted-foreground">
								{selectedPreset.family} · <span className="font-mono">{selectedPreset.id}</span>
							</p>
						)}
						{(customModel || !selectedPreset) && (
							<Input
								label="Custom model ID"
								value={config.model}
								onChange={(event) => update('model', event.target.value)}
								placeholder={BEATAPI_DEFAULT_MODEL}
							/>
						)}
					</div>

					{/* Endpoint: allowed, but quiet */}
					<div className="border-t border-border/70 pt-3">
						<button
							type="button"
							className="flex w-full items-center justify-between text-left text-[11px] font-semibold tracking-wide text-muted-foreground"
							onClick={() => setShowEndpoint((value) => !value)}
						>
							<span>Custom endpoint</span>
							<span className="font-mono font-normal opacity-80">{showEndpoint ? 'hide' : 'show'}</span>
						</button>
						{showEndpoint && (
							<div className="mt-2 space-y-2">
								<Input
									label="Base URL"
									value={config.baseUrl}
									onChange={(event) => update('baseUrl', event.target.value)}
									placeholder={BEATAPI_DEFAULT_BASE_URL}
									className="font-mono text-xs"
								/>
								<button
									type="button"
									className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
									onClick={() => update('baseUrl', BEATAPI_DEFAULT_BASE_URL)}
								>
									Reset to BeatAPI default
								</button>
							</div>
						)}
					</div>

					<Button variant="outline" className="w-full" onClick={testConnection} disabled={testState === 'testing'}>
						{testState === 'testing' ? (
							<LoaderCircle size={15} className="animate-spin" />
						) : testState === 'ok' ? (
							<Check size={15} />
						) : null}
						Test connection
					</Button>
					{testState !== 'idle' && testState !== 'testing' && (
						<p
							className={`rounded-lg px-3 py-2 text-xs ${
								testState === 'ok'
									? 'border border-border bg-muted text-foreground'
									: 'border border-destructive/40 bg-destructive/10 text-destructive'
							}`}
						>
							{testMessage}
						</p>
					)}
				</section>

				<Button className="w-full" onClick={save}>
					Save
				</Button>
			</main>
		</div>
	)
}
