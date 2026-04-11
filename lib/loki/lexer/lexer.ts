import { type Pos, type Token, TokenKind } from '../token'

const IDENTIFIER_START_PATTERN = /[A-Za-z_]/
const IDENTIFIER_CONTINUE_PATTERN = /[A-Za-z0-9_]/

function failLex(message: string): never {
	throw new Error(`lex error: ${message}`)
}

function isWhitespace(char: string | undefined): boolean {
	return char !== undefined && /\s/.test(char)
}

function clonePos(pos: Pos): Pos {
	return { line: pos.line, col: pos.col }
}

function advancePos(pos: Pos, char: string): void {
	if (char === '\n') {
		pos.line++
		pos.col = 1
		return
	}

	pos.col++
}

export class Lexer {
	private readonly sourceText: string
	private index: number
	private readonly pos: Pos
	private current: Token

	constructor(sourceText: string) {
		this.sourceText = sourceText
		this.index = 0
		this.pos = { line: 1, col: 1 }
		this.current = this.lexOneToken()
	}

	tok(): Token {
		return this.current
	}

	next_tok(): Token {
		if (this.current.kind === TokenKind.eof) {
			return this.current
		}
		this.current = this.lexOneToken()
		return this.current
	}

	private lexOneToken(): Token {
		while (this.index < this.sourceText.length) {
			const char = this.sourceText[this.index]

			if (isWhitespace(char)) {
				advancePos(this.pos, char)
				this.index++
				continue
			}

			if (IDENTIFIER_START_PATTERN.test(char)) {
				const start = this.index
				const startPos = clonePos(this.pos)
				this.index++
				advancePos(this.pos, char)
				while (
					this.index < this.sourceText.length &&
					IDENTIFIER_CONTINUE_PATTERN.test(this.sourceText[this.index])
				) {
					advancePos(this.pos, this.sourceText[this.index])
					this.index++
				}

				const val = this.sourceText.slice(start, this.index)
				if (val === 'pub') {
					return {
						kind: TokenKind.k_pub,
						val,
						pos: startPos,
					}
				}
				return {
					kind: val === 'fun' ? TokenKind.k_fun : TokenKind.name,
					val,
					pos: startPos,
				}
			}

			if (char === '(') {
				const token = { kind: TokenKind.lpar, val: char, pos: clonePos(this.pos) }
				advancePos(this.pos, char)
				this.index++
				return token
			}

			if (char === ')') {
				const token = { kind: TokenKind.rpar, val: char, pos: clonePos(this.pos) }
				advancePos(this.pos, char)
				this.index++
				return token
			}

			if (char === '{') {
				const token = { kind: TokenKind.lcurly, val: char, pos: clonePos(this.pos) }
				advancePos(this.pos, char)
				this.index++
				return token
			}

			if (char === '}') {
				const token = { kind: TokenKind.rcurly, val: char, pos: clonePos(this.pos) }
				advancePos(this.pos, char)
				this.index++
				return token
			}

			failLex(`unexpected character '${char}' at ${this.pos.line}:${this.pos.col}`)
		}

		return { kind: TokenKind.eof, val: '', pos: clonePos(this.pos) }
	}
}
