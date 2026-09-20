import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'
import { mkdirSync } from 'node:fs'

const chromeProfile = '.wxt/chrome-data'
mkdirSync(chromeProfile, { recursive: true })

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	webExt: {
		chromiumProfile: chromeProfile,
		keepProfileChanges: true,
		chromiumArgs: ['--hide-crash-restore-bubble'],
	},
	vite: () => ({
		plugins: [tailwindcss()],
		define: {
			__VERSION__: JSON.stringify('0.3.1'),
		},
		build: {
			minify: false,
			chunkSizeWarningLimit: 2000,
		},
	}),
	zip: {
		artifactTemplate: 'x-reply-plugin-{{version}}-{{browser}}.zip',
	},
	manifest: {
		name: 'BeatAPI X Reply Plugin',
		description: 'Read an X or Reddit discussion, draft a value-first reply and a product-link reply, then fill the version you choose. Powered by BeatAPI Text API.',
		permissions: ['tabs', 'sidePanel', 'storage', 'activeTab', 'scripting'],
		host_permissions: ['<all_urls>'],
		icons: {
			16: 'assets/icon-16.png',
			48: 'assets/icon-48.png',
			128: 'assets/icon-128.png',
		},
		action: {
			default_title: 'BeatAPI X Reply Plugin',
		},
		side_panel: {
			default_path: 'sidepanel/index.html',
		},
	},
})
