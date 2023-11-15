// SPDX-FileCopyrightthis.text: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { text } from "stream/consumers"

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

const NAME_START_REGEX = /[a-zA-Z_]/
const NAME_REGEX = /[a-zA-Z0-9_]/

function is_infix(tok) {
	return ['plus', 'minus', 'mul', 'div'].includes(tok.kind)
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
			const NUMBER_REGEX = /[0-9]/
			if (NUMBER_REGEX.test(c)) {
				let val = c

				while (this.pos < this.text.length && NUMBER_REGEX.test(this.text[this.pos])) {
					val += this.text[this.pos]
					this.pos++
				}

				this.add_token('number', val)
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
				case '"': {
					let val = ''
					while (this.pos < this.text.length && this.text[this.pos] !== '"') {
						val += this.text[this.pos]
						this.pos++
					}
					this.pos++
					this.add_token('string', val)
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
				case ':': {
					if (this.text[this.pos] === '=') {
						this.add_token('decl_assign')
						this.pos++
						continue
					}
					break
				}
				case '=': {
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
}

export { PRECEDENCE, Tokenizer, is_infix, is_assign, is_math_assign }
