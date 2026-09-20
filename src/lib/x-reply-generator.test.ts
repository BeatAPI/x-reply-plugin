import assert from 'node:assert/strict'
import test from 'node:test'
import { GROWTH_PRODUCTS } from './product-catalog'
import { normalizeReplyPair, xWeightedLength } from './x-reply-generator'

test('normalizes value-only and product-link replies', () => {
	const product = GROWTH_PRODUCTS.beatdesign
	const result = normalizeReplyPair({
		valueOnly: 'A useful standalone observation https://example.com/',
		productLink: 'A contextual BeatDesign reply https://wrong.example/',
	}, product.url)

	assert.equal(result.valueOnly, 'A useful standalone observation')
	assert.equal(result.productLink, `A contextual BeatDesign reply\n\n${product.url}`)
})

test('counts a URL using the X shortened URL weight', () => {
	assert.equal(xWeightedLength('See https://example.com/very/long/path'), 27)
})
