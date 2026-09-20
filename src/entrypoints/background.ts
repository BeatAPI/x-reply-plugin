export default defineBackground(() => {
	console.log('[BeatAPI X Growth] Background service worker started')
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})
