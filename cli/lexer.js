// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const KEYWORDS = [
	'const',
	'else',
	'for',
	'fun',
	'if',
	'impl',
	'mut',
	'pub',
	'return',
	'self',
	'struct',
]

const PRECEDENCE = (tok) => {
	switch (tok) {
		case 'lsqr':
			return 7
		case 'dot':
			return 6
		case 'not':
			return 5
		case 'mul':
		case 'div':
		case 'mod':
		case 'lshift':
		case 'rshift':
		case 'bit_and':
			return 4
		case 'plus':
		case 'minus':
		case 'bit_or':
		case 'bit_xor':
			return 3
		case 'eq':
		case 'ne':
		case 'gt':
		case 'ge':
		case 'lt':
		case 'le':
			return 2
		// TODO logical &&, ||
		default:
			return 0
	}
}

function is_infix(tok) {
	return is_math(tok) || is_comparison(tok) || is_bitwise(tok)
}

function is_math(tok) {
	return ['mul', 'div', 'mod', 'plus', 'minus'].includes(tok)
}

function is_comparison(tok) {
	return ['eq', 'ne', 'gt', 'ge', 'lt', 'le'].includes(tok)
}

function is_bitwise(tok) {
	return ['bit_and', 'bit_or', 'bit_xor', 'lshift', 'rshift'].includes(tok)
}

function is_assign(tok) {
	return ['decl_assign', 'assign', 'mul_assign', 'div_assign', 'mod_assign', 'plus_assign', 'minus_assign'].includes(tok)
}

class Lexer{
	constructor(text) {
		this.text = text
		this.val = ''

		this.line_breaks = [-1]
		this.line = 0
		this.start = 0
		this.pos = 0
	}

	get_val() {
		return this.val
	}

	get_pos() {
		return {
			line: this.line + 1,
			col: this.start - this.line_breaks[this.line],
		}
	}

	next() {
		this.skip_whitespace()

		this.start = this.pos

		if (this.pos >= this.text.length) {
			return 'eof'
		}

		const c = this.text[this.pos]
		this.pos++

		// Name or keyword
		if (/[a-zA-Z]/.test(c)) {
			while (this.pos < this.text.length && /[a-zA-Z0-9_]/.test(this.text[this.pos])) {
				this.pos++
			}
			this.val = this.text.slice(this.start, this.pos)

			if (KEYWORDS.includes(this.val)) {
				return this.val
			}

			return 'name'
		}

		// Number
		if (/[0-9]/.test(c)) {
			if (c === '0' && this.text[this.pos] === 'x') {
				this.advance_hex_num()
			} else {
				this.advance_decimal_num()
			}

			this.val = this.text.slice(this.start, this.pos)
			return 'integer'
		}

		// Simple token
		switch (c) {
			case "'":
			case '"':
				this.string_val(c)
				return 'string'
			case '/': {
				// Skip comments
				if (this.text[this.pos] === '/') {
					do {
						this.skip_line()
						this.skip_whitespace()
					} while (this.text[this.pos] === '/' && this.text[this.pos + 1] === '/')

					return this.next()
				}

				if (this.text[this.pos] === '=') {
					this.pos++
					return 'div_assign'
				}
				return 'div'
			}
			case ',':
				return 'comma'
			case ';':
				return 'semi'
			case '.':
				return 'dot'
			case ':': {
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'decl_assign'
				}
				break
			}
			case '=':
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'eq'
				}
				return 'assign'
			case '!':
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'ne'
				}
				return 'not'
			case '<': {
				const nc = this.text[this.pos]
				if (nc === '=') {
					this.pos++
					return 'le'
				}
				if (nc === '<') {
					this.pos++
					return 'lshift'
				}
				return 'lt'
			}
			case '>': {
				const nc = this.text[this.pos]
				if (nc === '=') {
					this.pos++
					return 'ge'
				}
				if (nc === '>') {
					this.pos++
					return 'rshift'
				}
				return 'gt'
			}
			case '+':
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'plus_assign'
				}
				return 'plus'
			case '-':
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'minus_assign'
				}
				return 'minus'
			case '*':
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'mul_assign'
				}
				return 'mul'
			case '%':
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'mod_assign'
				}
				return 'mod'
			case '&':
				return 'bit_and'
			case '^':
				return 'bit_xor'
			case '|':
				return 'bit_or'
			case '(':
				return 'lpar'
			case ')':
				return 'rpar'
			case '[':
				return 'lsqr'
			case ']':
				return 'rsqr'
			case '{':
				return 'lcur'
			case '}':
				return 'rcur'
			case '@':
				return 'at'
			case '#':
				return 'hash'
			default:
				break
		}

		this.val = `unexpected char ${c}`
		return 'err'
	}

	advance_decimal_num() {
		while (this.pos < this.text.length && /[0-9]/.test(this.text[this.pos])) {
			this.pos++
		}
	}

	advance_hex_num() {
		this.pos += 1
		while (this.pos < this.text.length && /[0-9a-fA-F]/.test(this.text[this.pos])) {
			this.pos++
		}
	}

	string_val(quote) {
		const start = this.pos

		while (this.pos < this.text.length) {
			const c = this.text[this.pos]
			this.pos++

			if (c === '\\') {
				this.pos++
			} else if (c === quote) {
				break
			}
		}

		this.val = this.text.slice(start, this.pos - 1)
	}

	skip_whitespace() {
		while (this.pos < this.text.length) {
			const c = this.text[this.pos]
			if (c === ' ' || c === '\t' || c === '\r') {
				this.pos++
			} else if (c === '\n') {
				this.inc_line()
				this.pos++
			} else {
				break
			}
		}
	}

	skip_line() {
		while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
			this.pos++
		}
		this.inc_line()
		this.pos++
	}

	inc_line() {
		this.line_breaks.push(this.pos)
		this.line++
	}
}

export {
	PRECEDENCE,
	is_infix,
	is_math,
	is_comparison,
	is_assign,
	Lexer,
}
