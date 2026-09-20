import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react'
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
	const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
	const [testMessage, setTestMessage] = useState('')

	useEffect(() => {
		void getLLMConfig().then((value) => {
			setConfig(value)
			setCustomModel(!BEATAPI_MODEL_PRESETS.some((preset) => preset.id === value.model))
		})
	}, [])

	const update = (field: keyof LLMSettings, value: string) => {
		setConfig((previous) => ({ ...previous, [field]: value }))
		setTestState('idle')
	}

	const testConnection = async () => {
		setTestState('testing')
		const result = await testLLMConnection(config)
		if (result.ok) {
			setTestState('ok')
			setTestMessage('Connected')
		} else {
			setTestState('error')
			setTestMessage(result.detail || 'Connection failed. Check your BeatAPI key and model ID.')
		}
	}

	const save = async () => {
		await setLLMConfig({
			...config,
			baseUrl: config.baseUrl.trim() || BEATAPI_DEFAULT_BASE_URL,
			model: config.model.trim() || BEATAPI_DEFAULT_MODEL,
		})
		onBack()
	}

	return (
		<div className="min-h-screen bg-background">
		<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/80 bg-background/95 px-4 py-4 backdrop-blur">
			<button className="icon-button" type="button" onClick={onBack} aria-label="Back">
				<ArrowLeft size={17} />
			</button>
			<div>
				<div className="eyebrow">BEATAPI X REPLY</div>
				<h1 className="mt-0.5 text-[17px] font-semibold tracking-tight">Model settings</h1>
			</div>
		</header>

		<main className="space-y-4 p-4">
			<section className="paper-panel space-y-4 p-4">
				<div>
					<div className="text-sm font-semibold">BeatAPI Text API</div>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						One BeatAPI key. Pick a catalogue model (default DeepSeek Flash) or type any public model ID.
						Keys stay in this extension&apos;s Chrome local storage — never shipped in the repo.
					</p>
				</div>

				<Input
					label="BeatAPI API Key"
					type={showKey ? 'text' : 'password'}
					value={config.apiKey}
					placeholder="sk-..."
					onChange={(event) => update('apiKey', event.target.value)}
					suffix={
						<button type="button" onClick={() => setShowKey((value) => !value)} className="text-muted-foreground">
							{showKey ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					}
				/>

				<div className="space-y-1.5">
					<label className="text-xs font-medium text-muted-foreground">Model</label>
					<select
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						value={customModel ? '__custom__' : (BEATAPI_MODEL_PRESETS.some((p) => p.id === config.model) ? config.model : '__custom__')}
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
						{BEATAPI_MODEL_PRESETS.map((preset) => (
							<option key={preset.id} value={preset.id}>
								{preset.family} · {preset.label}
							</option>
						))}
						<option value="__custom__">Custom model ID…</option>
					</select>
					{(customModel || !BEATAPI_MODEL_PRESETS.some((p) => p.id === config.model)) && (
						<Input
							label="Custom model ID"
							value={config.model}
							onChange={(event) => update('model', event.target.value)}
							placeholder={BEATAPI_DEFAULT_MODEL}
						/>
					)}
				</div>

				<Input
					label="Base URL"
					value={config.baseUrl}
					onChange={(event) => update('baseUrl', event.target.value)}
					placeholder={BEATAPI_DEFAULT_BASE_URL}
				/>

				<Button variant="outline" className="w-full" onClick={testConnection} disabled={testState === 'testing'}>
					{testState === 'testing' ? <LoaderCircle size={15} className="animate-spin" /> : testState === 'ok' ? <Check size={15} /> : null}
					Test connection
				</Button>
				{testState !== 'idle' && testState !== 'testing' && (
					<p className={`rounded-lg px-3 py-2 text-xs ${testState === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
						{testMessage}
					</p>
				)}
			</section>

			<Button className="w-full" onClick={save}>Save</Button>
		</main>
		</div>
	)
}
