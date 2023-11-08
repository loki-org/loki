// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const KEYWORDS = ['false', 'fun', 'mut', 'return', 'true']

const PRECEDENCE = (tok) => {
	switch (tok.kind) {
		case 'mul':
		case 'div':
			return 2
		case 'plus':
		case 'minus':
			return 1
		default:
			return 0
	}
}

function is_infix(tok) {
	return ['plus', 'minus', 'mul', 'div'].includes(tok.kind)
}

function is_assign(tok) {
	return ['assign', 'decl_assign'].includes(tok.kind)
}

function is_math_assign(tok) {
	return ['plus_assign', 'minus_assign', 'mul_assign', 'div_assign'].includes(tok.kind)
}

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
			case '"': {
				let val = ''
				while (pos < text.length && text[pos] !== '"') {
					val += text[pos]
					pos++
				}
				pos++
				tokens.push({ kind: 'string', value: val })
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
			case '=': {
				tokens.push({ kind: 'assign', value: '' })
				continue
			}
			case '+': {
				if (text[pos] === '=') {
					tokens.push({ kind: 'plus_assign', value: '' })
					pos++
					continue
				}
				tokens.push({ kind: 'plus', value: '' })
				continue
			}
			case '-': {
				if (text[pos] === '=') {
					tokens.push({ kind: 'minus_assign', value: '' })
					pos++
					continue
				}
				tokens.push({ kind: 'minus', value: '' })
				continue
			}
			case '*': {
				if (text[pos] === '=') {
					tokens.push({ kind: 'mul_assign', value: '' })
					pos++
					continue
				}
				tokens.push({ kind: 'mul', value: '' })
				continue
			}
			case '/': {
				if (text[pos] === '/') {
					pos++
					let val = ''
					while (pos < text.length && text[pos] !== '\n') {
						val += text[pos]
						pos++
					}
					tokens.push({ kind: 'comment', value: val })
					continue
				}
				if (text[pos] === '=') {
					tokens.push({ kind: 'div_assign', value: '' })
					pos++
					continue
				}
				tokens.push({ kind: 'div', value: '' })
				continue
			}
			default:
				break
		}

		throw new Error(`Unknown character: ${c}`)
	}

	return tokens
}

export { PRECEDENCE, tokenize, is_infix, is_assign, is_math_assign }
