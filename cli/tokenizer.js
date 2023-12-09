// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const KEYWORDS = ['as', 'break', 'continue', 'else', 'false', 'for', 'fun', 'if', 'mut', 'pub', 'return', 'struct', 'true']

const PRECEDENCE = (tok) => {
	switch (tok.kind) {
		case 'lsbr':
			return 15
		case 'dot':
			return 12
		case 'mul':
		case 'div':
			return 9
		case 'plus':
		case 'minus':
			return 6
		case 'key_as':
			return 4
		case 'eq':
		case 'ne':
		case 'gt':
		case 'ge':
		case 'lt':
		case 'le':
			return 3
		case 'and':
		case 'or':
			return 1
		default:
			return 0
	}
}

const NAME_START_REGEX = /[a-zA-Z_]/
const NAME_REGEX = /[a-zA-Z0-9_]/
const NUMBER_REGEX = /[0-9]/
const HEX_RE = /[0-9a-fA-F]/

function is_infix(tok) {
	return is_math(tok) || is_logical(tok) || is_comparison(tok)
}

function is_math(tok) {
	return ['plus', 'minus', 'mul', 'div'].includes(tok.kind)
}

function is_logical(tok) {
	return ['and', 'or'].includes(tok.kind)
}

function is_comparison(tok) {
	return ['eq', 'ne', 'gt', 'ge', 'lt', 'le'].includes(tok.kind)
}

function is_assign(tok) {
	return ['assign', 'decl_assign'].includes(tok.kind)
}

function is_math_assign(tok) {
	return ['plus_assign', 'minus_assign', 'mul_assign', 'div_assign'].includes(tok.kind)
}

class Tokenizer {
	constructor(text) {
		this.text = text
		this.pos = 0
		this.tokens = []
	}

	add_token(kind, value = '') {
		this.tokens.push({ kind, value })
	}

	tokenize() {
		while (this.pos < this.text.length) {
			const c = this.text[this.pos]
			this.pos++

			// Skip whitespace
			if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
				continue
			}

			// Names
			if (NAME_START_REGEX.test(c)) {
				const val = this.name_val()

				if (KEYWORDS.includes(val)) {
					this.add_token(`key_${val}`)
					continue
				}

				this.add_token('name', val)
				continue
			}

			// Numbers
			if (NUMBER_REGEX.test(c)) {
				if (c === '0' && this.text[this.pos] === 'x') {
					this.add_token('number', this.hex_number())
				} else {
					this.add_token('number', this.dec_number())
				}
				continue
			}

			switch (c) {
				case '(': {
					this.add_token('lpar')
					continue
				}
				case ')': {
					this.add_token('rpar')
					continue
				}
				case '{': {
					this.add_token('lcur')
					continue
				}
				case '}': {
					this.add_token('rcur')
					continue
				}
				case '[': {
					this.add_token('lsbr')
					continue
				}
				case ']': {
					this.add_token('rsbr')
					continue
				}
				case "'":
				case '"': {
					this.add_token('string', this.string_val(c))
					continue
				}
				case ',': {
					this.add_token('comma')
					continue
				}
				case '.': {
					this.add_token('dot')
					continue
				}
				case ';': {
					this.add_token('semi')
					continue
				}
				case ':': {
					if (this.text[this.pos] === '=') {
						this.add_token('decl_assign')
						this.pos++
						continue
					}
					break
				}
				case '&': {
					if (this.text[this.pos] === '&') {
						this.add_token('and')
						this.pos++
						continue
					}
					break
				}
				case '|': {
					if (this.text[this.pos] === '|') {
						this.add_token('or')
						this.pos++
						continue
					}
					break
				}
				case '<': {
					if (this.text[this.pos] === '=') {
						this.add_token('le')
						this.pos++
						continue
					}
					this.add_token('lt')
					continue
				}
				case '>': {
					if (this.text[this.pos] === '=') {
						this.add_token('ge')
						this.pos++
						continue
					}
					this.add_token('gt')
					continue
				}
				case '!': {
					if (this.text[this.pos] === '=') {
						this.add_token('ne')
						this.pos++
						continue
					}
					break
				}
				case '=': {
					if (this.text[this.pos] === '=') {
						this.add_token('eq')
						this.pos++
						continue
					}
					this.add_token('assign')
					continue
				}
				case '+': {
					if (this.text[this.pos] === '=') {
						this.add_token('plus_assign')
						this.pos++
						continue
					}
					this.add_token('plus')
					continue
				}
				case '-': {
					if (this.text[this.pos] === '=') {
						this.add_token('minus_assign')
						this.pos++
						continue
					}
					this.add_token('minus')
					continue
				}
				case '*': {
					if (this.text[this.pos] === '=') {
						this.add_token('mul_assign')
						this.pos++
						continue
					}
					this.add_token('mul')
					continue
				}
				case '/': {
					if (this.text[this.pos] === '/') {
						this.pos++
						let val = ''
						while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
							val += this.text[this.pos]
							this.pos++
						}
						this.add_token('comment', val)
						continue
					}
					if (this.text[this.pos] === '=') {
						this.add_token('div_assign')
						this.pos++
						continue
					}
					this.add_token('div')
					continue
				}
				case '$': {
					this.add_token('dollar')
					continue
				}
				case '@': {
					this.add_token('at')
					continue
				}
				case '#': {
					this.pos++
					const name = this.name_val()
					this.add_token('hash', name)
					continue
				}
				default:
					break
			}

			throw new Error(`Unknown character: ${c}`)
		}

		return this.tokens
	}

	name_val() {
		let val = this.text[this.pos - 1]

		while (this.pos < this.text.length && NAME_REGEX.test(this.text[this.pos])) {
			val += this.text[this.pos]
			this.pos++
		}

		return val
	}

	string_val(quote) {
		let c = ""
		let start = this.pos

		while (this.pos < this.text.length) {
			c = this.text[this.pos]
			this.pos++

			if (c === '\\') {
				this.pos++
			} else if (c === quote) {
				break
			}
		}

		return this.text.slice(start, this.pos - 1)
	}

	dec_number() {
		const start = this.pos - 1

		while (this.pos < this.text.length && NUMBER_REGEX.test(this.text[this.pos])) {
			this.pos++
		}

		return this.text.slice(start, this.pos)
	}

	hex_number() {
		const start = this.pos - 1
		this.pos++

		while (this.pos < this.text.length && HEX_RE.test(this.text[this.pos])) {
			this.pos++
		}

		return this.text.slice(start, this.pos)
	}
}

export { PRECEDENCE, Tokenizer, is_infix, is_math, is_logical, is_comparison, is_assign, is_math_assign }
