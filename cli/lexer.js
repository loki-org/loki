// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const KEYWORDS = [
]

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
			default:
				break
		}

		this.val = `unexpected char ${c}`
		return 'err'
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

export { Lexer }
