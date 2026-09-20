import { useEffect, useMemo, useState } from 'react'
import {
	Check,
	Copy,
	ExternalLink,
	Link2,
	LoaderCircle,
	MessageCircle,
	RefreshCw,
	Settings,
	ShieldCheck,
	Sparkles,
} from 'lucide-react'
import { Button } from './ui/Button'
import { Textarea } from './ui/Textarea'
import {
	generateReplyPair,
	type ReplyContext,
	type ReplyPair,
	xWeightedLength,
} from '@/lib/x-reply-generator'
import {
	DEFAULT_GROWTH_PRODUCT_ID,
	GROWTH_PRODUCT_LIST,
	getGrowthProduct,
	type GrowthProductId,
} from '@/lib/product-catalog'
import { getActiveProductId, setActiveProductId } from '@/lib/storage'

const TARGET_X_ACCOUNT = '@Eric_Kangg'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'
type GenerateState = 'idle' | 'generating' | 'ready' | 'error'
type ReplyMode = 'valueOnly' | 'productLink'

function isSupportedUrl(url: string): boolean {
	try {
		const hostname = new URL(url).hostname
		return hostname === 'x.com' || hostname === 'reddit.com' || hostname.endsWith('.reddit.com')
	} catch {
		return false
	}
}

async function getActiveSupportedTab(): Promise<chrome.tabs.Tab> {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
	const tab = tabs[0]
	if (!tab?.id || !tab.url || !isSupportedUrl(tab.url)) {
		throw new Error('Open a specific X post or Reddit post/comment in this window first.')
	}
	return tab
}

async function readCurrentPost(): Promise<ReplyContext> {
	const tab = await getActiveSupportedTab()
	try {
		const response = await chrome.tabs.sendMessage(tab.id!, {
			type: 'BEATAPI_X_GROWTH',
			action: 'extract_reply_context',
		})
		if (!response?.ok) throw new Error(response?.error || 'Failed to read the post.')
		return response.context as ReplyContext
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		if (message.includes('Receiving end does not exist') || message.includes('Could not establish connection')) {
			throw new Error('The extension is not connected to this page. Refresh the X or Reddit page and try again.')
		}
		throw error
	}
}

async function fillReply(context: ReplyContext, reply: string): Promise<void> {
	const tab = await getActiveSupportedTab()
	const response = await chrome.tabs.sendMessage(tab.id!, {
		type: 'BEATAPI_X_GROWTH',
		action: 'fill_reply',
		reply,
		platform: context.platform,
		contentId: context.contentId,
		expectedAccount: context.platform === 'x' ? TARGET_X_ACCOUNT : '',
	})
	if (!response?.ok) throw new Error(response?.error || 'Failed to fill the reply box.')
}

function CharacterCount({ context, value }: { context: ReplyContext; value: string }) {
	if (context.platform === 'reddit') {
		return <span className={value.length > 900 ? 'font-semibold text-warning' : 'text-muted-foreground'}>{value.length} chars</span>
	}
	const count = xWeightedLength(value)
	return <span className={count > 280 ? 'font-semibold text-red-600' : 'text-muted-foreground'}>{count}/280</span>
}

export function XReplyAssistant({ onOpenSettings }: { onOpenSettings: () => void }) {
	const [context, setContext] = useState<ReplyContext | null>(null)
	const [loadState, setLoadState] = useState<LoadState>('idle')
	const [generateState, setGenerateState] = useState<GenerateState>('idle')
	const [error, setError] = useState('')
	const [pair, setPair] = useState<ReplyPair | null>(null)
	const [productId, setProductId] = useState<GrowthProductId>(DEFAULT_GROWTH_PRODUCT_ID)
	const [mode, setMode] = useState<ReplyMode>('valueOnly')
	const [copiedMode, setCopiedMode] = useState<ReplyMode | null>(null)
	const [fillState, setFillState] = useState<'idle' | 'filling' | 'done'>('idle')

	const accountMatch = !!context && (context.platform === 'reddit'
		|| context.currentAccount.toLowerCase() === TARGET_X_ACCOUNT.toLowerCase())
	const product = getGrowthProduct(productId)
	const selectedReply = pair?.[mode] || ''
	const canFill = !!context && !!selectedReply && accountMatch && (context.platform === 'reddit' || xWeightedLength(selectedReply) <= 280)

	const refresh = async () => {
		setLoadState('loading')
		setError('')
		setPair(null)
		setGenerateState('idle')
		setFillState('idle')
		try {
			const next = await readCurrentPost()
			setContext(next)
			setLoadState('ready')
		} catch (nextError) {
			setContext(null)
			setLoadState('error')
			setError(nextError instanceof Error ? nextError.message : String(nextError))
		}
	}

	useEffect(() => {
		void refresh()
		void getActiveProductId().then(setProductId)
	}, [])

	const selectProduct = (nextProductId: GrowthProductId) => {
		setProductId(nextProductId)
		setPair(null)
		setGenerateState('idle')
		setFillState('idle')
		setError('')
		void setActiveProductId(nextProductId)
	}

	const generate = async () => {
		if (!context) return
		setGenerateState('generating')
		setError('')
		setFillState('idle')
		try {
			const next = await generateReplyPair(context, product)
			setPair(next)
			setMode('valueOnly')
			setGenerateState('ready')
		} catch (nextError) {
			setGenerateState('error')
			setError(nextError instanceof Error ? nextError.message : String(nextError))
		}
	}

	const updateReply = (target: ReplyMode, value: string) => {
		setPair((previous) => previous ? { ...previous, [target]: value } : previous)
		setFillState('idle')
	}

	const copy = async (target: ReplyMode) => {
		if (!pair) return
		await navigator.clipboard.writeText(pair[target])
		setCopiedMode(target)
		window.setTimeout(() => setCopiedMode(null), 1600)
	}

	const fill = async () => {
		if (!context || !selectedReply) return
		setFillState('filling')
		setError('')
		try {
			await navigator.clipboard.writeText(selectedReply)
			await fillReply(context, selectedReply)
			setFillState('done')
		} catch (nextError) {
			setFillState('idle')
			const message = nextError instanceof Error ? nextError.message : String(nextError)
			setError(`${message} Copied. Paste into the reply box with Cmd+V.`)
		}
	}

	const sourcePreview = useMemo(() => {
		if (!context) return ''
		const source = context.title && context.text !== context.title ? `${context.title}\n${context.text}` : context.text
		return source.length > 420 ? `${source.slice(0, 420)}…` : source
	}, [context])

	return (
		<div className="min-h-screen bg-background pb-28">
		<header className="signal-grid sticky top-0 z-20 border-b border-border/75 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-xl">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="brand-mark"><img src={chrome.runtime.getURL("assets/logo-light.png")} alt="X Reply" /></div>
					<div>
						<div className="eyebrow">X REPLY</div>
						<h1 className="text-[17px] font-semibold tracking-[-0.025em]">X Growth</h1>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<button className="icon-button" type="button" onClick={() => void refresh()} aria-label="Refresh post">
						<RefreshCw size={16} className={loadState === 'loading' ? 'animate-spin' : ''} />
					</button>
					<button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Settings">
						<Settings size={16} />
					</button>
				</div>
			</div>
			<div className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/80 px-3 py-2 shadow-sm">
				<div className="flex min-w-0 items-center gap-2">
					<span className={`status-dot ${accountMatch ? 'is-online' : 'is-warning'}`} />
					<div className="min-w-0">
						<div className="truncate text-xs font-semibold">{context?.currentAccount || 'Account unknown'}</div>
						<div className="text-[10px] text-muted-foreground">
							{context?.platform === 'reddit' ? 'Current Reddit account' : `Target account ${TARGET_X_ACCOUNT}`}
						</div>
					</div>
				</div>
				<div className={`account-pill ${accountMatch ? 'is-match' : ''}`}>{accountMatch ? 'Account OK' : 'Check account'}</div>
			</div>
			<div className="mt-2 rounded-xl border border-border/80 bg-card/80 p-1.5 shadow-sm">
				<div className="mb-1.5 flex items-center justify-between px-1">
					<span className="text-[10px] font-semibold text-muted-foreground">Product for promo draft</span>
					<span className="text-[9px] text-muted-foreground">Value draft never mentions product</span>
				</div>
				<div className="grid grid-cols-2 gap-1.5">
					{GROWTH_PRODUCT_LIST.map((item) => (
						<button
							key={item.id}
							type="button"
							className={`product-switch-button ${productId === item.id ? 'is-active' : ''}`}
							onClick={() => selectProduct(item.id)}
							disabled={generateState === 'generating'}
						>
							<span>{item.name}</span>
							<small>{item.shortLabel}</small>
						</button>
					))}
				</div>
			</div>
		</header>

		<main className="space-y-4 p-4">
			<section className="paper-panel overflow-hidden">
				<div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
					<div className="flex items-center gap-2 text-xs font-semibold">
						<MessageCircle size={14} /> Current post
					</div>
					{context && <span className="mono-label">{context.platform === 'reddit' ? 'REDDIT' : 'X'} · #{context.contentId.slice(-7)}</span>}
				</div>
				<div className="p-4">
					{loadState === 'loading' && (
						<div className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><LoaderCircle size={16} className="animate-spin" /> Reading current post…</div>
					)}
					{context && (
						<div className="fade-up">
							<div className="flex items-baseline gap-2">
								<span className="text-sm font-semibold">{context.authorName}</span>
								<span className="text-xs text-muted-foreground">{context.authorHandle}</span>
							</div>
							<p className="mt-2 text-[13px] leading-[1.65] text-foreground/90">{sourcePreview}</p>
							<div className="mt-3 flex flex-wrap gap-1.5">
								{context.community && <span className="meta-chip">{context.community}</span>}
								<span className="meta-chip">{context.language}</span>
								<span className={`meta-chip ${context.canReply ? 'text-emerald-700' : 'text-red-600'}`}>{context.canReply ? 'Can reply' : 'Cannot reply'}</span>
								{context.metrics.slice(0, 3).map((metric) => <span key={metric} className="meta-chip">{metric}</span>)}
							</div>
						</div>
					)}
					{loadState === 'error' && <p className="py-4 text-sm leading-6 text-red-600">{error}</p>}
				</div>
			</section>

			{context && !pair && (
				<section className="paper-panel p-4">
					<div className="flex items-start gap-3">
						<div className="spark-box"><Sparkles size={17} /></div>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-semibold">Generate value + promo drafts</div>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">First draft joins the discussion only; second promotes {product.name} with the official URL.</p>
						</div>
					</div>
					<Button className="mt-4 w-full" onClick={() => void generate()} disabled={generateState === 'generating'}>
						{generateState === 'generating' ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
						{generateState === 'generating' ? 'Generating…' : 'Generate both drafts'}
					</Button>
				</section>
			)}

			{pair && context && (
				<div className="space-y-3 fade-up">
					{(['valueOnly', 'productLink'] as ReplyMode[]).map((target, index) => {
						const linked = target === 'productLink'
						const value = pair[target]
						const selected = mode === target
						return (
							<section key={target} className={`reply-card ${selected ? 'is-selected' : ''}`}>
								<button className="w-full text-left" type="button" onClick={() => { setMode(target); setFillState('idle') }}>
									<div className="flex items-center justify-between gap-3 px-4 pt-4">
										<div className="flex items-center gap-2.5">
											<span className="version-index">0{index + 1}</span>
											<div>
												<div className="text-sm font-semibold">{linked ? 'Promo · with link' : 'High-value comment'}</div>
												<div className="mt-0.5 text-[10px] text-muted-foreground">{linked ? `${product.name} · ${product.url}` : 'No product · no link'}</div>
											</div>
										</div>
										<span className={`selection-ring ${selected ? 'is-selected' : ''}`}>{selected && <Check size={12} />}</span>
									</div>
								</button>
								<div className="px-4 pb-4 pt-3">
								<Textarea value={value} onChange={(event) => updateReply(target, event.target.value)} className="min-h-[112px] resize-none border-0 bg-muted/45 text-[13px] leading-6 focus:ring-1" />
								<div className="mt-2 flex items-center justify-between text-[11px]">
									<CharacterCount context={context} value={value} />
										<button type="button" className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground" onClick={() => void copy(target)}>
											{copiedMode === target ? <Check size={12} /> : <Copy size={12} />}
											{copiedMode === target ? 'Copied' : 'Copy'}
										</button>
									</div>
								</div>
							</section>
						)
					})}
				</div>
			)}

			{error && loadState !== 'error' && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{error}</div>
			)}
		</main>

		{pair && context && (
			<footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xl">
				{!accountMatch && (
					<div className="mb-2 flex items-center gap-2 text-[11px] text-warning">
						<ShieldCheck size={13} /> Switch to and confirm {TARGET_X_ACCOUNT} before filling
					</div>
				)}
				<div className="grid grid-cols-[92px_1fr] gap-2">
					<Button variant="outline" onClick={() => void copy(mode)}><Copy size={14} />Copy</Button>
					<Button onClick={() => void fill()} disabled={!canFill || fillState === 'filling'}>
						{fillState === 'filling' ? <LoaderCircle size={15} className="animate-spin" /> : fillState === 'done' ? <Check size={15} /> : <ExternalLink size={15} />}
						{fillState === 'done' ? `Filled — review on ${context.platform === 'reddit' ? 'Reddit' : 'X'}` : fillState === 'filling' ? 'Filling…' : `Fill ${mode === 'productLink' ? 'promo draft' : 'value draft'}`}
					</Button>
				</div>
				<div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Link2 size={10} /> This extension never clicks the final Reply button</div>
			</footer>
		)}
	</div>
)}
