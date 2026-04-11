import { readFileSync } from 'node:fs'
import type { File, Stmt } from '../ast'
import { Lexer } from '../lexer'
import { type Token, TokenKind } from '../token'

function failParse(message: string): never {
	throw new Error(`parse error: ${message}`)
}

function tokenLabel(kind: TokenKind): string {
	switch (kind) {
		case TokenKind.name:
			return 'name'
		case TokenKind.k_pub:
			return 'pub'
		case TokenKind.k_fun:
			return 'fun'
		case TokenKind.lpar:
			return '('
		case TokenKind.rpar:
			return ')'
		case TokenKind.lcurly:
			return '{'
		case TokenKind.rcurly:
			return '}'
		case TokenKind.eof:
			return 'end of file'
	}

	return `token ${kind}`
}

function formatPos(token: Token): string {
	return `${token.pos.line}:${token.pos.col}`
}

class Parser {
	private readonly lexer: Lexer

	constructor(lexer: Lexer) {
		this.lexer = lexer
	}

	parseFile(filePath: string): File {
		const stmts: Stmt[] = []

		while (this.lexer.tok().kind !== TokenKind.eof) {
			stmts.push(this.parseFunctionDeclaration())
		}

		return {
			path: filePath,
			stmts,
		}
	}

	private expectWordToken(expected: string): Token {
		const token = this.lexer.tok()
		if (token.kind !== TokenKind.k_fun) {
			failParse(`expected '${expected}' at ${formatPos(token)}`)
		}
		if (token.val !== expected) {
			failParse(`expected '${expected}' at ${formatPos(token)}`)
		}
		this.lexer.next_tok()
		return token
	}

	private consumeOptionalWordToken(expected: string): boolean {
		const token = this.lexer.tok()
		if (token.kind === TokenKind.k_pub && token.val === expected) {
			this.lexer.next_tok()
			return true
		}
		return false
	}

	private expectToken(kind: TokenKind): Token {
		const token = this.lexer.tok()
		if (token.kind !== kind) {
			failParse(`expected '${tokenLabel(kind)}' at ${formatPos(token)}`)
		}
		this.lexer.next_tok()
		return token
	}

	private parseFunctionDeclaration(): Stmt {
		this.consumeOptionalWordToken('pub')
		this.expectWordToken('fun')
		const functionName = this.expectToken(TokenKind.name)
		this.expectToken(TokenKind.lpar)
		this.expectToken(TokenKind.rpar)
		this.expectToken(TokenKind.lcurly)
		this.expectToken(TokenKind.rcurly)

		return {
			kind: 'FunDecl',
			name: functionName.val,
			params: [],
			body: [],
		}
	}
}

export function parse_lexer(filePath: string, lexer: Lexer): File {
	return new Parser(lexer).parseFile(filePath)
}

export function parse_text(filePath: string, text: string): File {
	return parse_lexer(filePath, new Lexer(text))
}

export function parse_file(filePath: string): File {
	const sourceText = readFileSync(filePath, 'utf8')
	return parse_text(filePath, sourceText)
}
