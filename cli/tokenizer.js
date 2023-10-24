// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const KEYWORDS = ['fn']

function tokenize(text) {
	let tokens = []
	let pos = 0

	while (pos < text.length) {
		const c = text[pos]
		pos++

		// Skip whitespace
		if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
			continue
		}

		// Names
		const NAME_START_REGEX = /[a-zA-Z_]/
		const NAME_REGEX = /[a-zA-Z0-9_]/
		if (NAME_START_REGEX.test(c)) {
			let val = c

			while (pos < text.length && NAME_REGEX.test(text[pos])) {
				val += text[pos]
				pos++
			}

			if (KEYWORDS.includes(val)) {
				tokens.push({ kind: `key_${val}`, value: '' })
				continue
			}

			tokens.push({ kind: 'name', value: val })
			continue
		}

		// Numbers
		const NUMBER_REGEX = /[0-9]/
		if (NUMBER_REGEX.test(c)) {
			let val = c

			while (pos < text.length && NUMBER_REGEX.test(text[pos])) {
				val += text[pos]
				pos++
			}

			tokens.push({ kind: 'number', value: val })
			continue
		}

		switch (c) {
			case '(': {
				tokens.push({ kind: 'lpar', value: '' })
				continue
			}
			case ')': {
				tokens.push({ kind: 'rpar', value: '' })
				continue
			}
			case '{': {
				tokens.push({ kind: 'lcur', value: '' })
				continue
			}
			case '}': {
				tokens.push({ kind: 'rcur', value: '' })
				continue
			}
			case '[': {
				tokens.push({ kind: 'lsbr', value: '' })
				continue
			}
			case ']': {
				tokens.push({ kind: 'rsbr', value: '' })
				continue
			}
			case ',': {
				tokens.push({ kind: 'comma', value: '' })
				continue
			}
			case ':': {
				if (text[pos] === '=') {
					tokens.push({ kind: 'decl_assign', value: '' })
					pos++
					continue
				}
				break
			}
			default:
				break
		}

		throw new Error(`Unknown character: ${c}`)
	}

	return tokens
}

export { tokenize }
