import { useState } from 'react'
import { XReplyAssistant } from '@/components/XReplyAssistant'
import { XSettingsPanel } from '@/components/XSettingsPanel'

export default function App() {
	const [view, setView] = useState<'assistant' | 'settings'>('assistant')
	return view === 'settings'
		? <XSettingsPanel onBack={() => setView('assistant')} />
		: <XReplyAssistant onOpenSettings={() => setView('settings')} />
}
