
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

			tokens.push({ kind: 'name', value: val })
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
			default:
				break
		}

		throw new Error(`Invalid character: ${c}`)
	}

	return tokens
}

export { tokenize }
