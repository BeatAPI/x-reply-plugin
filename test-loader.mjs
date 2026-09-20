import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const extensionRoot = path.dirname(fileURLToPath(import.meta.url))

function resolveCandidate(basePath) {
	const candidates = [
		basePath,
		`${basePath}.ts`,
		`${basePath}.tsx`,
		path.join(basePath, 'index.ts'),
		path.join(basePath, 'index.tsx'),
	]

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return pathToFileURL(candidate).href
		}
	}

	return null
}

export async function resolve(specifier, context, defaultResolve) {
	if (specifier.startsWith('@/')) {
		const resolved = resolveCandidate(path.join(extensionRoot, 'src', specifier.slice(2)))
		if (resolved) {
			return { url: resolved, shortCircuit: true }
		}
	}

	if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier)) {
		const parentDir = context.parentURL
			? path.dirname(fileURLToPath(context.parentURL))
			: extensionRoot
		const resolved = resolveCandidate(path.resolve(parentDir, specifier))
		if (resolved) {
			return { url: resolved, shortCircuit: true }
		}
	}

	return defaultResolve(specifier, context, defaultResolve)
}
