import { keyword_kind, make_token, type Span, type Token, TokenKind } from './token.ts'

export class Lexer {
	private source: string
	private file: string
	private pos: number = 0
	private line: number = 1
	private col: number = 1

	// One-token lookahead buffer: current is the last consumed token,
	// peek_buf is the next token (pre-scanned).
	current: Token
	private peek_buf: Token

	constructor(source: string, file: string) {
		this.source = source
		this.file = file
		// Bootstrap: scan the first token into peek_buf, set current to a
		// synthetic Eof that will never be observed before the first advance().
		this.peek_buf = this.scan()
		this.current = this.peek_buf // placeholder, overwritten by first next()
	}

	/** The next token without consuming it. */
	get peek(): Token {
		return this.peek_buf
	}

	/** Consume and return the next token. Updates `current`. */
	next(): Token {
		this.current = this.peek_buf
		this.peek_buf = this.scan()
		return this.current
	}

	/**
	 * Assert the next token has the given kind, consume it, and return it.
	 * Throws a `LexError` on mismatch.
	 */
	expect(kind: TokenKind): Token {
		const tok = this.next()
		if (tok.kind !== kind) {
			throw new LexError(
				`expected ${TokenKind[kind]}, got ${TokenKind[tok.kind]} ('${tok.text}')`,
				tok.span,
			)
		}
		return tok
	}

	// -------------------------------------------------------------------------
	// Internal scanning
	// -------------------------------------------------------------------------

	private span_here(start_pos: number, start_line: number, start_col: number): Span {
		return {
			file: this.file,
			offset: start_pos,
			line: start_line,
			col: start_col,
			len: this.pos - start_pos,
		}
	}

	private peek_char(): string {
		return this.source[this.pos] ?? '\0'
	}

	private peek_char2(): string {
		return this.source[this.pos + 1] ?? '\0'
	}

	private advance_char(): string {
		const ch = this.source[this.pos] ?? '\0'
		this.pos++
		if (ch === '\n') {
			this.line++
			this.col = 1
		} else {
			this.col++
		}
		return ch
	}

	private skip_line_comment() {
		while (this.pos < this.source.length && this.peek_char() !== '\n') {
			this.advance_char()
		}
	}

	private skip_block_comment() {
		// Already consumed '/*'
		while (this.pos < this.source.length) {
			if (this.peek_char() === '*' && this.peek_char2() === '/') {
				this.advance_char()
				this.advance_char()
				return
			}
			this.advance_char()
		}
		// Unterminated block comment — we'll just stop at EOF silently.
	}

	private scan_string(start_pos: number, start_line: number, start_col: number): Token {
		// Opening '"' already consumed.
		let value = ''
		while (this.pos < this.source.length) {
			const ch = this.advance_char()
			if (ch === '"') {
				return make_token(TokenKind.string, value, this.span_here(start_pos, start_line, start_col))
			}
			if (ch === '\\') {
				const esc = this.advance_char()
				switch (esc) {
					case 'n':
						value += '\n'
						break
					case 't':
						value += '\t'
						break
					case 'r':
						value += '\r'
						break
					case '"':
						value += '"'
						break
					case '\\':
						value += '\\'
						break
					default:
						value += esc
				}
			} else {
				value += ch
			}
		}
		// Unterminated string
		return make_token(TokenKind.error, value, this.span_here(start_pos, start_line, start_col))
	}

	private scan(): Token {
		// Skip whitespace and comments
		while (this.pos < this.source.length) {
			const ch = this.peek_char()
			if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
				this.advance_char()
				continue
			}
			if (ch === '/' && this.peek_char2() === '/') {
				this.advance_char()
				this.advance_char()
				this.skip_line_comment()
				continue
			}
			if (ch === '/' && this.peek_char2() === '*') {
				this.advance_char()
				this.advance_char()
				this.skip_block_comment()
				continue
			}
			break
		}

		if (this.pos >= this.source.length) {
			return make_token(TokenKind.eof, '', {
				file: this.file,
				offset: this.pos,
				line: this.line,
				col: this.col,
				len: 0,
			})
		}

		const start_pos = this.pos
		const start_line = this.line
		const start_col = this.col
		const ch = this.advance_char()

		const span = () => this.span_here(start_pos, start_line, start_col)
		const tok = (kind: TokenKind, text: string) => make_token(kind, text, span())

		// String literal
		if (ch === '"') {
			return this.scan_string(start_pos, start_line, start_col)
		}

		// Number literal
		if (is_digit(ch)) {
			let text = ch
			while (is_digit(this.peek_char())) {
				text += this.advance_char()
			}
			if (this.peek_char() === '.' && is_digit(this.peek_char2())) {
				text += this.advance_char() // '.'
				while (is_digit(this.peek_char())) {
					text += this.advance_char()
				}
				return tok(TokenKind.float, text)
			}
			return tok(TokenKind.int, text)
		}

		// Identifier / keyword
		if (is_ident_start(ch)) {
			let text = ch
			while (is_ident_cont(this.peek_char())) {
				text += this.advance_char()
			}
			const kw = keyword_kind(text)
			return tok(kw ?? TokenKind.ident, text)
		}

		// Operators and punctuation
		switch (ch) {
			case '(':
				return tok(TokenKind.l_paren, ch)
			case ')':
				return tok(TokenKind.r_paren, ch)
			case '{':
				return tok(TokenKind.l_brace, ch)
			case '}':
				return tok(TokenKind.r_brace, ch)
			case '[':
				return tok(TokenKind.l_bracket, ch)
			case ']':
				return tok(TokenKind.r_bracket, ch)
			case ',':
				return tok(TokenKind.comma, ch)
			case ';':
				return tok(TokenKind.semi, ch)
			case ':':
				return tok(TokenKind.colon, ch)
			case '+':
				return tok(TokenKind.plus, ch)
			case '*':
				return tok(TokenKind.star, ch)
			case '%':
				return tok(TokenKind.percent, ch)
			case '&':
			case '|':
				return tok(TokenKind.error, ch)
			case '.':
				if (this.peek_char() === '.') {
					this.advance_char()
					return tok(TokenKind.dot_dot, '..')
				}
				return tok(TokenKind.dot, ch)
			case '-':
				if (this.peek_char() === '>') {
					this.advance_char()
					return tok(TokenKind.arrow, '->')
				}
				return tok(TokenKind.minus, ch)
			case '=':
				if (this.peek_char() === '=') {
					this.advance_char()
					return tok(TokenKind.eq_eq, '==')
				}
				return tok(TokenKind.eq, ch)
			case '!':
				if (this.peek_char() === '=') {
					this.advance_char()
					return tok(TokenKind.bang_eq, '!=')
				}
				return tok(TokenKind.error, ch)
			case '<':
				if (this.peek_char() === '=') {
					this.advance_char()
					return tok(TokenKind.lt_eq, '<=')
				}
				return tok(TokenKind.lt, ch)
			case '>':
				if (this.peek_char() === '=') {
					this.advance_char()
					return tok(TokenKind.gt_eq, '>=')
				}
				return tok(TokenKind.gt, ch)
			case '/':
				return tok(TokenKind.slash, ch)
			default:
				return tok(TokenKind.error, ch)
		}
	}
}

export class LexError extends Error {
	constructor(
		message: string,
		public readonly span: Span,
	) {
		super(message)
		this.name = 'LexError'
	}
}

function is_digit(ch: string): boolean {
	return ch >= '0' && ch <= '9'
}

function is_ident_start(ch: string): boolean {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function is_ident_cont(ch: string): boolean {
	return is_ident_start(ch) || is_digit(ch)
}
