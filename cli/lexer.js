// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const KEYWORDS = [
	'const',
	'fun',
	'mut',
	'pub',
	'struct',
]

const PRECEDENCE = (tok) => {
	switch (tok) {
		case 'lsqr':
			return 1
		default:
			return 0
	}
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
			case '/': {
				// Skip comments
				if (this.text[this.pos] === '/') {
					do {
						this.skip_line()
						this.skip_whitespace()
					} while (this.text[this.pos] === '/' && this.text[this.pos + 1] === '/')

					return this.next()
				}
			}
			case ',':
				return 'comma'
			case ':': {
				if (this.text[this.pos] === '=') {
					this.pos++
					return 'decl_assign'
				}
				break
			}
			case '=':
				return 'assign'
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

export { PRECEDENCE, Lexer }
