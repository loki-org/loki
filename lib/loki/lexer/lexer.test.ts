import { expect, test } from 'bun:test'
import { TokenKind } from '../token'
import { Lexer } from './lexer'

test('lexes a function declaration into tokens with positions', () => {
	const lexer = new Lexer('fun name() {}')
	const kinds: TokenKind[] = []
	const tokens = []

	while (true) {
		const token = lexer.tok()
		tokens.push(token)
		kinds.push(token.kind)
		if (token.kind === TokenKind.eof) {
			break
		}
		lexer.next_tok()
	}

	expect(kinds).toEqual([
		TokenKind.k_fun,
		TokenKind.name,
		TokenKind.lpar,
		TokenKind.rpar,
		TokenKind.lcurly,
		TokenKind.rcurly,
		TokenKind.eof,
	])
	expect(tokens[0]).toEqual({
		kind: TokenKind.k_fun,
		val: 'fun',
		pos: { line: 1, col: 1 },
	})
	expect(tokens[1]).toEqual({
		kind: TokenKind.name,
		val: 'name',
		pos: { line: 1, col: 5 },
	})
})

test('lexes pub fun declaration keywords', () => {
	const lexer = new Lexer('pub fun name() {}')
	const kinds: TokenKind[] = []

	while (true) {
		const token = lexer.tok()
		kinds.push(token.kind)
		if (token.kind === TokenKind.eof) {
			break
		}
		lexer.next_tok()
	}

	expect(kinds).toEqual([
		TokenKind.k_pub,
		TokenKind.k_fun,
		TokenKind.name,
		TokenKind.lpar,
		TokenKind.rpar,
		TokenKind.lcurly,
		TokenKind.rcurly,
		TokenKind.eof,
	])
})
