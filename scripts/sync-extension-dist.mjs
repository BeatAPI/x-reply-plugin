import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, '.output', 'chrome-mv3')
const dest = join(root, 'extension-dist')
const assets = join(root, 'public', 'assets')

if (!existsSync(src)) {
  console.error('Missing .output/chrome-mv3 — run wxt build first')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
mkdirSync(join(dest, 'assets'), { recursive: true })
for (const name of ['icon-16.png', 'icon-48.png', 'icon-128.png']) {
  cpSync(join(assets, name), join(dest, 'assets', name))
}
console.log('Synced extension-dist from .output/chrome-mv3 (+ fresh icons)')
