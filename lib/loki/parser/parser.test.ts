import { expect, test } from 'bun:test'
import { Lexer } from '../lexer'
import { parse_lexer, parse_text } from './parser'

test('parses an empty function declaration from source text', () => {
	const ast = parse_text('sample.lo', 'fun name() {}')

	expect(ast).toEqual({
		path: 'sample.lo',
		stmts: [
			{
				kind: 'FunDecl',
				name: 'name',
				params: [],
				body: [],
			},
		],
	})
})

test('parses from a lexer token stream into a function declaration', () => {
	const ast = parse_lexer('sample.lo', new Lexer('\nfun name() {}\n'))

	expect(ast.stmts).toHaveLength(1)
	expect(ast.stmts[0]).toEqual({
		kind: 'FunDecl',
		name: 'name',
		params: [],
		body: [],
	})
})

test('rejects non-fun declarations during parsing', () => {
	expect(() => parse_text('sample.lo', 'name() {}')).toThrow("parse error: expected 'fun' at 1:1")
})
