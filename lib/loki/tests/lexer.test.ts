import { describe, expect, it } from 'bun:test'
import { Lexer } from '../lexer/lexer.ts'
import { TokenKind } from '../lexer/token.ts'

function lex_all(source: string) {
	const l = new Lexer(source, '<test>')
	const tokens = []
	// Prime: advance past the bootstrap
	let tok = l.next()
	while (tok.kind !== TokenKind.eof) {
		tokens.push(tok)
		tok = l.next()
	}
	return tokens
}

describe('lexer — keywords', () => {
	it('recognises fn', () => {
		const [tok] = lex_all('fn')
		expect(tok.kind).toBe(TokenKind.fn)
		expect(tok.text).toBe('fn')
	})

	it('recognises all reserved words', () => {
		const src =
			'mut const if else return true false null and or not import export struct enum match for in break continue'
		const toks = lex_all(src)
		const kinds = toks.map((t) => t.kind)
		expect(kinds).toEqual([
			TokenKind.mut,
			TokenKind.const_,
			TokenKind.if_,
			TokenKind.else_,
			TokenKind.return_,
			TokenKind.true_,
			TokenKind.false_,
			TokenKind.null_,
			TokenKind.and,
			TokenKind.or,
			TokenKind.not,
			TokenKind.import_,
			TokenKind.export_,
			TokenKind.struct_,
			TokenKind.enum_,
			TokenKind.match_,
			TokenKind.for_,
			TokenKind.in_,
			TokenKind.break_,
			TokenKind.continue_,
		])
	})
})

describe('lexer — literals', () => {
	it('lexes integer', () => {
		const [tok] = lex_all('42')
		expect(tok.kind).toBe(TokenKind.int)
		expect(tok.text).toBe('42')
	})

	it('lexes float', () => {
		const [tok] = lex_all('3.14')
		expect(tok.kind).toBe(TokenKind.float)
		expect(tok.text).toBe('3.14')
	})

	it('lexes string with escapes', () => {
		const [tok] = lex_all('"hello\\nworld"')
		expect(tok.kind).toBe(TokenKind.string)
		expect(tok.text).toBe('hello\nworld')
	})
})

describe('lexer — operators', () => {
	it('lexes two-char operators', () => {
		const src = '== != <= >= -> .. := += -= *= /= %='
		const toks = lex_all(src)
		expect(toks.map((t) => t.kind)).toEqual([
			TokenKind.eq_eq,
			TokenKind.bang_eq,
			TokenKind.lt_eq,
			TokenKind.gt_eq,
			TokenKind.arrow,
			TokenKind.dot_dot,
			TokenKind.col_eq,
			TokenKind.plus_eq,
			TokenKind.minus_eq,
			TokenKind.star_eq,
			TokenKind.slash_eq,
			TokenKind.percent_eq,
		])
	})
})

describe('lexer — comments', () => {
	it('skips line comments', () => {
		const toks = lex_all('// this is a comment\n42')
		expect(toks.length).toBe(1)
		expect(toks[0].kind).toBe(TokenKind.int)
	})

	it('skips block comments', () => {
		const toks = lex_all('/* block */ 99')
		expect(toks.length).toBe(1)
		expect(toks[0].kind).toBe(TokenKind.int)
	})
})

describe('lexer — positions', () => {
	it('tracks line and column', () => {
		const l = new Lexer('fn foo', '<test>')
		l.next() // advance bootstrap
		const t1 = l.current // fn
		l.next()
		const t2 = l.current // foo
		expect(t1.pos.line).toBe(1)
		expect(t1.pos.col).toBe(1)
		expect(t2.pos.col).toBe(4)
	})
})

describe('lexer — lookahead', () => {
	it('peek does not consume', () => {
		const l = new Lexer('1 2', '<test>')
		l.next() // prime
		expect(l.peek.kind).toBe(TokenKind.int)
		expect(l.peek.text).toBe('2')
		expect(l.current.text).toBe('1')
	})

	it('next advances current and updates peek', () => {
		const l = new Lexer('a b c', '<test>')
		l.next() // current = a, peek = b
		expect(l.current.text).toBe('a')
		expect(l.peek.text).toBe('b')
		l.next() // current = b, peek = c
		expect(l.current.text).toBe('b')
		expect(l.peek.text).toBe('c')
	})
})

describe('lexer — error token', () => {
	it('produces error token for unknown char', () => {
		const [tok] = lex_all('@')
		expect(tok.kind).toBe(TokenKind.error)
	})
})
