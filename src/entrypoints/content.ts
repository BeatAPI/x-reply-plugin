type ReplyPlatform = 'x' | 'reddit'

interface ReplyContext {
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

type QueryRoot = Document | ShadowRoot

function cleanText(value: string | null | undefined): string {
	return (value || '').replace(/\s+/g, ' ').trim()
}

function visible(element: Element | null): element is HTMLElement {
	if (!(element instanceof HTMLElement)) return false
	const style = window.getComputedStyle(element)
	const rect = element.getBoundingClientRect()
	return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
}

function collectOpenRoots(): QueryRoot[] {
	const roots: QueryRoot[] = [document]
	for (let index = 0; index < roots.length; index += 1) {
		for (const element of Array.from(roots[index].querySelectorAll<HTMLElement>('*'))) {
			if (element.shadowRoot && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot)
		}
	}
	return roots
}

function queryAllDeep<T extends Element>(selector: string): T[] {
	return collectOpenRoots().flatMap((root) => Array.from(root.querySelectorAll<T>(selector)))
}

function firstDeep<T extends Element>(selectors: string[]): T | null {
	for (const selector of selectors) {
		const match = queryAllDeep<T>(selector)[0]
		if (match) return match
	}
	return null
}

function platformFromLocation(): ReplyPlatform {
	if (window.location.hostname === 'x.com') return 'x'
	if (window.location.hostname === 'reddit.com' || window.location.hostname.endsWith('.reddit.com')) return 'reddit'
	throw new Error('This page is not a supported X or Reddit page.')
}

function xStatusRoute(): { handle: string; contentId: string } | null {
	const match = window.location.pathname.match(/^\/([^/]+)\/status\/(\d+)/)
	if (!match) return null
	return { handle: decodeURIComponent(match[1]), contentId: match[2] }
}

function findXArticle(contentId: string): HTMLElement | null {
	const articles = Array.from(document.querySelectorAll<HTMLElement>('article'))
	return articles.find((article) => Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'))
		.some((anchor) => {
			try {
				return new URL(anchor.href, window.location.origin).pathname.split('/').includes(contentId)
			} catch {
				return false
			}
		})) ?? null
}

function extractXAccount(): string {
	const profileCandidates = [
		document.querySelector<HTMLAnchorElement>('a[data-testid="AppTabBar_Profile_Link"]'),
		document.querySelector<HTMLAnchorElement>('a[aria-label="Profile"]'),
		document.querySelector<HTMLAnchorElement>('a[aria-label="Profile"]'),
	]
	for (const candidate of profileCandidates) {
		const href = candidate?.getAttribute('href') || ''
		const match = href.match(/^\/([^/?#]+)$/)
		if (match && !['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) {
			return `@${decodeURIComponent(match[1])}`
		}
	}
	const switcher = document.querySelector<HTMLElement>('[data-testid="SideNav_AccountSwitcher_Button"]')
	const match = cleanText(switcher?.innerText || switcher?.getAttribute('aria-label')).match(/@[A-Za-z0-9_]+/)
	return match?.[0] || ''
}

function extractXAuthorName(article: HTMLElement, handle: string): string {
	const authorLink = Array.from(article.querySelectorAll<HTMLAnchorElement>('a'))
		.find((anchor) => anchor.getAttribute('href') === `/${handle}`)
	const labels = Array.from(authorLink?.querySelectorAll('span') || [])
		.map((span) => cleanText(span.textContent))
		.filter((text) => text && !text.startsWith('@'))
	return labels[0] || handle
}

function extractXMetrics(article: HTMLElement): string[] {
	const selectors = [
		'[data-testid="reply"]',
		'[data-testid="retweet"]',
		'[data-testid="like"]',
		'[data-testid="unlike"]',
		'[data-testid="bookmark"]',
		'a[href$="/analytics"]',
	]
	return Array.from(new Set(selectors.flatMap((selector) => Array.from(article.querySelectorAll<HTMLElement>(selector)))
		.map((element) => cleanText(element.getAttribute('aria-label') || element.innerText))
		.filter(Boolean)))
}

function extractXContext(): ReplyContext {
	const route = xStatusRoute()
	if (!route) throw new Error('Open a specific X post first (x.com/.../status/...).')
	const article = findXArticle(route.contentId)
	if (!article) throw new Error('Could not locate the current X post. Wait for the page to load, then refresh.')
	const textNodes = Array.from(article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'))
	const mainText = cleanText(textNodes[0]?.innerText)
	if (!mainText) throw new Error('This X post has no readable text.')
	const time = article.querySelector<HTMLTimeElement>('time')
	const replyButton = article.querySelector<HTMLElement>('[data-testid="reply"]')
	return {
		platform: 'x',
		url: `https://x.com/${route.handle}/status/${route.contentId}`,
		contentId: route.contentId,
		authorName: extractXAuthorName(article, route.handle),
		authorHandle: `@${route.handle}`,
		title: '',
		text: mainText,
		language: textNodes[0]?.getAttribute('lang') || 'unknown',
		postedAt: time?.dateTime || '',
		quotedText: textNodes.slice(1).map((node) => cleanText(node.innerText)).filter(Boolean).join('\n'),
		metrics: extractXMetrics(article),
		currentAccount: extractXAccount(),
		canReply: !!replyButton && replyButton.getAttribute('aria-disabled') !== 'true',
		community: '',
	}
}

function redditRoute(): { community: string; postId: string; commentId: string } | null {
	const match = window.location.pathname.match(/^\/r\/([^/]+)\/comments\/([a-z0-9]+)(?:\/[^/]+)?(?:\/([a-z0-9]+))?/i)
	if (!match) return null
	return {
		community: `r/${decodeURIComponent(match[1])}`,
		postId: match[2],
		commentId: match[3] || '',
	}
}

function findRedditPost(postId: string): HTMLElement | null {
	const escaped = CSS.escape(postId)
	return firstDeep<HTMLElement>([
		`shreddit-post[post-id="${escaped}"]`,
		`shreddit-post[thingid="t3_${escaped}"]`,
		`[data-testid="post-container"][id*="${escaped}"]`,
		`div[data-fullname="t3_${escaped}"]`,
		'shreddit-post',
		'[data-testid="post-container"]',
	])
}

function findRedditComment(commentId: string): HTMLElement | null {
	if (!commentId) return null
	const escaped = CSS.escape(commentId)
	return firstDeep<HTMLElement>([
		`shreddit-comment[thingid="t1_${escaped}"]`,
		`shreddit-comment[id="t1_${escaped}"]`,
		`#t1_${escaped}`,
		`[data-fullname="t1_${escaped}"]`,
		`[data-testid="comment"][id*="${escaped}"]`,
	])
}

function elementText(root: HTMLElement | null, selectors: string[]): string {
	if (!root) return ''
	for (const selector of selectors) {
		const element = root.querySelector<HTMLElement>(selector) || root.shadowRoot?.querySelector<HTMLElement>(selector)
		const text = cleanText(element?.innerText || element?.textContent)
		if (text) return text
	}
	return ''
}

function redditBody(root: HTMLElement | null, kind: 'post' | 'comment'): string {
	return elementText(root, kind === 'post'
		? ['[slot="text-body"]', '[data-post-click-location="text-body"]', '[id$="-post-rtjson-content"]', '.usertext-body .md', '.md']
		: ['[slot="comment"]', '[id$="-comment-rtjson-content"]', '[data-testid="comment"] .md', '.usertext-body .md', '.md'])
}

function redditAuthor(root: HTMLElement | null): string {
	if (!root) return ''
	const fromAttribute = root.getAttribute('author') || root.getAttribute('data-author')
	if (fromAttribute) return fromAttribute.replace(/^u\//, '')
	const link = root.querySelector<HTMLAnchorElement>('a[href^="/user/"], a[href^="https://www.reddit.com/user/"]')
	const match = link?.href.match(/\/user\/([^/?#]+)/)
	return match ? decodeURIComponent(match[1]) : cleanText(link?.textContent).replace(/^u\//, '')
}

function extractRedditAccount(): string {
	const links = queryAllDeep<HTMLAnchorElement>('header a[href*="/user/"], nav a[href*="/user/"], a[data-testid="user-drawer-button"][href*="/user/"]')
	for (const link of links) {
		const match = link.href.match(/\/user\/([^/?#]+)/)
		if (match) return `u/${decodeURIComponent(match[1])}`
	}
	const controls = queryAllDeep<HTMLElement>('[aria-label*="profile" i], [aria-label*="user menu" i], [id*="user-drawer" i]')
	for (const control of controls) {
		const match = cleanText(control.getAttribute('aria-label') || control.innerText).match(/(?:u\/)?([A-Za-z0-9_-]{3,20})/)
		if (match && !['profile', 'user', 'menu', 'open'].includes(match[1].toLowerCase())) return `u/${match[1]}`
	}
	return ''
}

function redditParentContext(comment: HTMLElement | null, post: HTMLElement): string {
	const parts: string[] = []
	const postTitle = post.getAttribute('post-title') || elementText(post, ['h1', '[slot="title"]', 'a[data-click-id="body"]'])
	const postBody = redditBody(post, 'post')
	if (postTitle) parts.push(`Original post: ${postTitle}`)
	if (postBody) parts.push(postBody)
	if (comment) {
		const parentId = comment.getAttribute('parentid') || comment.getAttribute('parent-id') || ''
		const parentMatch = parentId.match(/^t1_(.+)$/)
		const parent = parentMatch ? findRedditComment(parentMatch[1]) : (comment.parentElement?.closest<HTMLElement>('shreddit-comment') ?? null)
		const parentText = redditBody(parent, 'comment')
		if (parentText) parts.push(`Parent comment: ${parentText}`)
	}
	return parts.join('\n')
}

function extractRedditMetrics(root: HTMLElement): string[] {
	return Array.from(new Set(Array.from(root.querySelectorAll<HTMLElement>('[aria-label]'))
		.map((element) => cleanText(element.getAttribute('aria-label')))
		.filter((label) => /vote|comment|reply|award|upvote/i.test(label))
		.slice(0, 6)))
}

function extractRedditContext(): ReplyContext {
	const route = redditRoute()
	if (!route) throw new Error('Open a specific Reddit post or comment first.')
	const post = findRedditPost(route.postId)
	if (!post) throw new Error('Could not locate the current Reddit post. Wait for the page to load, then refresh.')
	const comment = findRedditComment(route.commentId)
	if (route.commentId && !comment) throw new Error('Could not locate the current Reddit comment. Wait for it to load, then refresh.')
	const target = comment || post
	const title = post.getAttribute('post-title') || elementText(post, ['h1', '[slot="title"]', 'a[data-click-id="body"]'])
	const text = comment ? redditBody(comment, 'comment') : redditBody(post, 'post') || title
	if (!text) throw new Error('This Reddit content has no readable text.')
	const author = redditAuthor(target)
	const time = target.querySelector<HTMLTimeElement>('time') || target.shadowRoot?.querySelector<HTMLTimeElement>('time')
	const locked = target.hasAttribute('locked') || target.hasAttribute('is-locked') || post.hasAttribute('locked') || post.hasAttribute('is-locked')
	return {
		platform: 'reddit',
		url: `${window.location.origin}${window.location.pathname}`,
		contentId: route.commentId || route.postId,
		authorName: author || 'Reddit user',
		authorHandle: author ? `u/${author}` : '',
		title,
		text,
		language: document.documentElement.lang || 'unknown',
		postedAt: time?.dateTime || '',
		quotedText: redditParentContext(comment, post),
		metrics: extractRedditMetrics(target),
		currentAccount: extractRedditAccount(),
		canReply: !locked,
		community: route.community,
	}
}

function extractReplyContext(): ReplyContext {
	return platformFromLocation() === 'x' ? extractXContext() : extractRedditContext()
}

function getVisibleXComposers(): HTMLElement[] {
	const selectors = [
		'[role="dialog"] [data-testid="tweetTextarea_0"][contenteditable="true"]',
		'[role="dialog"] div[role="textbox"][contenteditable="true"]',
		'[data-testid="tweetTextarea_0"][contenteditable="true"]',
		'div[role="textbox"][contenteditable="true"]',
	]
	const seen = new Set<HTMLElement>()
	const composers: HTMLElement[] = []
	for (const selector of selectors) {
		for (const candidate of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
			if (!visible(candidate) || seen.has(candidate)) continue
			seen.add(candidate)
			composers.push(candidate)
		}
	}
	return composers
}

function getVisibleRedditComposers(): HTMLElement[] {
	const selectors = [
		'shreddit-composer textarea',
		'shreddit-composer [contenteditable="true"]',
		'[data-testid="comment-submission-form"] textarea',
		'[data-testid="comment-submission-form"] [contenteditable="true"]',
		'textarea[name="text"]',
		'textarea[placeholder*="comment" i]',
		'[data-lexical-editor="true"][contenteditable="true"]',
	]
	const seen = new Set<HTMLElement>()
	return selectors.flatMap((selector) => queryAllDeep<HTMLElement>(selector)).filter((candidate) => {
		if (!visible(candidate) || seen.has(candidate)) return false
		if (candidate.getAttribute('role') === 'searchbox') return false
		seen.add(candidate)
		return true
	})
}

async function waitForComposer(platform: ReplyPlatform, previous: Set<HTMLElement>, timeoutMs = 7000): Promise<HTMLElement | null> {
	const startedAt = Date.now()
	while (Date.now() - startedAt < timeoutMs) {
		const composers = platform === 'x' ? getVisibleXComposers() : getVisibleRedditComposers()
		const newlyOpened = composers.find((candidate) => !previous.has(candidate))
		if (newlyOpened) return newlyOpened
		const focused = composers.find((candidate) => candidate === document.activeElement || candidate.contains(document.activeElement))
		if (focused) return focused
		const dialog = composers.find((candidate) => candidate.closest('[role="dialog"]'))
		if (dialog) return dialog
		if (composers.length === 1) return composers[0]
		await pause(150)
	}
	return null
}

function normalizeComparable(value: string): string {
	return cleanText(value).replace(/\u00a0/g, ' ')
}

function composerText(composer: HTMLElement): string {
	if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) return normalizeComparable(composer.value)
	return normalizeComparable(composer.innerText || composer.textContent || '')
}

function containsReply(composer: HTMLElement, reply: string): boolean {
	const expected = normalizeComparable(reply)
	return !!expected && composerText(composer).includes(expected)
}

function placeCaretAtEnd(composer: HTMLElement): void {
	const selection = window.getSelection()
	if (!selection) return
	const range = document.createRange()
	range.selectNodeContents(composer)
	range.collapse(false)
	selection.removeAllRanges()
	selection.addRange(range)
}

async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => window.setTimeout(resolve, ms))
}

function dispatchEditorInput(composer: HTMLElement, reply: string): void {
	composer.dispatchEvent(new InputEvent('input', {
		bubbles: true,
		composed: true,
		inputType: 'insertText',
		data: reply,
	}))
}

async function insertReply(composer: HTMLElement, reply: string): Promise<boolean> {
	composer.scrollIntoView({ block: 'center' })
	composer.focus({ preventScroll: true })
	if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
		const prototype = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
		const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
		setter?.call(composer, reply)
		dispatchEditorInput(composer, reply)
		composer.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
		await pause(300)
		return containsReply(composer, reply)
	}

	placeCaretAtEnd(composer)
	const inserted = document.execCommand('insertText', false, reply)
	if (inserted) dispatchEditorInput(composer, reply)
	await pause(300)
	if (containsReply(composer, reply)) {
		await pause(400)
		return containsReply(composer, reply)
	}

	try {
		const clipboardData = new DataTransfer()
		clipboardData.setData('text/plain', reply)
		composer.dispatchEvent(new ClipboardEvent('paste', {
			bubbles: true,
			cancelable: true,
			composed: true,
			clipboardData,
		}))
	} catch {
		// A few Chromium environments do not expose DataTransfer to extensions.
	}
	await pause(300)
	if (containsReply(composer, reply)) return true

	composer.focus({ preventScroll: true })
	placeCaretAtEnd(composer)
	composer.dispatchEvent(new InputEvent('beforeinput', {
		bubbles: true,
		cancelable: true,
		composed: true,
		inputType: 'insertText',
		data: reply,
	}))
	if (!containsReply(composer, reply)) composer.replaceChildren(document.createTextNode(reply))
	dispatchEditorInput(composer, reply)
	await pause(650)
	return containsReply(composer, reply)
}

async function fillXReply(reply: string, contentId: string, expectedAccount: string): Promise<void> {
	const context = extractXContext()
	if (context.contentId !== contentId) throw new Error('The post changed. Read it again before filling.')
	if (!context.currentAccount) throw new Error('Could not confirm the current X account. Expand the account area on the left and retry.')
	if (expectedAccount && context.currentAccount.toLowerCase() !== expectedAccount.toLowerCase()) {
		throw new Error(`Current account is ${context.currentAccount}; switch to ${expectedAccount}.`)
	}
	if (!context.canReply) throw new Error('This X post cannot be replied to.')
	const article = findXArticle(contentId)
	const replyButton = article?.querySelector<HTMLElement>('[data-testid="reply"]')
	if (!replyButton) throw new Error('Could not find the Reply button for this post.')
	const previous = new Set(getVisibleXComposers())
	replyButton.scrollIntoView({ block: 'center' })
	replyButton.click()
	const composer = await waitForComposer('x', previous)
	if (!composer) throw new Error('The X reply composer did not open.')
	await fillComposerSafely(composer, reply, 'X')
}

function findRedditReplyTrigger(target: HTMLElement): HTMLElement | null {
	const candidates = Array.from(target.querySelectorAll<HTMLElement>('button, a'))
		.concat(target.shadowRoot ? Array.from(target.shadowRoot.querySelectorAll<HTMLElement>('button, a')) : [])
	return candidates.find((candidate) => {
		const label = cleanText(candidate.getAttribute('aria-label') || candidate.innerText || candidate.textContent)
		return /^(reply|add a comment|comment)$/i.test(label) && candidate.getAttribute('aria-disabled') !== 'true'
	}) ?? null
}

async function fillRedditReply(reply: string, contentId: string): Promise<void> {
	const context = extractRedditContext()
	if (context.contentId !== contentId) throw new Error('The Reddit content changed. Read it again before filling.')
	if (!context.canReply) throw new Error('This Reddit content cannot be replied to.')
	const route = redditRoute()!
	const post = findRedditPost(route.postId)!
	const target = findRedditComment(route.commentId) || post
	const previous = new Set(getVisibleRedditComposers())
	let composer = previous.size === 1 ? Array.from(previous)[0] : null
	if (!composer) {
		const trigger = findRedditReplyTrigger(target) || (target !== post ? findRedditReplyTrigger(post) : null)
		if (trigger) {
			trigger.scrollIntoView({ block: 'center' })
			trigger.click()
		}
		composer = await waitForComposer('reddit', previous)
	}
	if (!composer) throw new Error('Could not find the Reddit composer. Open the comment box manually, then fill.')
	await fillComposerSafely(composer, reply, 'Reddit')
}

async function fillComposerSafely(composer: HTMLElement, reply: string, platformLabel: string): Promise<void> {
	await pause(250)
	const existing = composerText(composer)
	if (existing && existing !== normalizeComparable(reply)) {
		throw new Error(`${platformLabel}: the reply box already has text; stopped to avoid overwriting it.`)
	}
	if (!existing && !(await insertReply(composer, reply))) {
		throw new Error(`${platformLabel}: composer opened but did not accept automated input.`)
	}
	composer.focus()
}

async function fillReply(reply: string, platform: ReplyPlatform, contentId: string, expectedAccount: string): Promise<void> {
	if (platform !== platformFromLocation()) throw new Error('The page platform changed. Read again.')
	if (platform === 'x') return fillXReply(reply, contentId, expectedAccount)
	return fillRedditReply(reply, contentId)
}

export default defineContentScript({
	matches: [
		'https://x.com/*',
		'https://reddit.com/*',
		'https://www.reddit.com/*',
		'https://new.reddit.com/*',
		'https://old.reddit.com/*',
	],
	runAt: 'document_end',
	main() {
		console.debug('[BeatAPI X Growth] X/Reddit content script ready')
		chrome.runtime.onMessage.addListener((message, _sender, sendResponse): true | undefined => {
			if (message.type !== 'BEATAPI_X_GROWTH') return
			if (message.action === 'extract_reply_context' || message.action === 'extract_x_context') {
				try {
					sendResponse({ ok: true, context: extractReplyContext() })
				} catch (error) {
					sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
				}
				return true
			}
			if (message.action === 'fill_reply' || message.action === 'fill_x_reply') {
				const platform = message.platform === 'reddit' ? 'reddit' : 'x'
				void fillReply(String(message.reply || ''), platform, String(message.contentId || message.statusId || ''), String(message.expectedAccount || ''))
					.then(() => sendResponse({ ok: true }))
					.catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }))
				return true
			}
			sendResponse({ ok: false, error: 'Unknown BeatAPI X Growth action.' })
			return true
		})
	},
})
