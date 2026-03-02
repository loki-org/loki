import { describe, expect, it } from 'bun:test'
import type { BinaryExpr, File, FnDecl, VarDecl } from '../ast/nodes.ts'
import { Lexer } from '../lexer/lexer.ts'
import { ParseError } from '../parser/parse_error.ts'
import { Parser } from '../parser/parser.ts'

function parse(source: string): File {
	const lex = new Lexer(source, '<test>')
	const parser = new Parser(lex)
	return parser.parse_file('<test>')
}

describe('parser — function declaration', () => {
	it('parses a no-param no-return fn', () => {
		const file = parse('fn main() {}')
		expect(file.items).toHaveLength(1)
		const fn = file.items[0] as FnDecl
		expect(fn.kind).toBe('fn_decl')
		expect(fn.name).toBe('main')
		expect(fn.params).toHaveLength(0)
		expect(fn.return_type).toBeNull()
	})

	it('parses params and return type', () => {
		const file = parse('fn f(x int, y float) int { return 0 }')
		const fn = file.items[0] as FnDecl
		expect(fn.kind).toBe('fn_decl')
		expect(fn.params).toHaveLength(2)
		expect(fn.params[0].name).toBe('x')
		expect(fn.params[1].name).toBe('y')
		expect(fn.return_type?.kind).toBe('named_type')
	})
})

describe('parser — variable declarations', () => {
	it('parses immutable var', () => {
		const file = parse('x := 42')
		const decl = file.items[0] as VarDecl
		expect(decl.kind).toBe('var_decl')
		expect(decl.name).toBe('x')
		expect(decl.mutable).toBe(false)
		expect(decl.init?.kind).toBe('int_lit')
	})

	it('parses mutable var', () => {
		const file = parse('mut y := 100')
		const decl = file.items[0] as VarDecl
		expect(decl.kind).toBe('var_decl')
		expect(decl.name).toBe('y')
		expect(decl.mutable).toBe(true)
	})

	it('parses const', () => {
		const file = parse('const PI := 3.14')
		const decl = file.items[0]
		expect(decl.kind).toBe('const_decl')
	})

	it('throws error when const used as statement', () => {
		expect(() => parse('fn f() { const X := 1 }')).toThrow(ParseError)
	})
})

describe('parser — operator precedence', () => {
	it('1 + 2 * 3 is add(1, mul(2, 3))', () => {
		const file = parse('r := 1 + 2 * 3')
		const decl = file.items[0] as VarDecl
		const add = decl.init as BinaryExpr
		expect(add.op).toBe('+')
		expect(add.left.kind).toBe('int_lit')
		const mul = add.right as BinaryExpr
		expect(mul.op).toBe('*')
	})

	it('parentheses override precedence', () => {
		const file = parse('r := (1 + 2) * 3')
		const decl = file.items[0] as VarDecl
		const mul = decl.init as BinaryExpr
		expect(mul.op).toBe('*')
		const add = mul.left as BinaryExpr
		expect(add.op).toBe('+')
	})

	it('assignment is right-associative', () => {
		// This requires a target — use idents inside a fn body
		const file = parse('fn f() { a = b = 1 }')
		const fn = file.items[0] as FnDecl
		const stmt = fn.body.stmts[0]
		expect(stmt.kind).toBe('expr_stmt')
		if (stmt.kind === 'expr_stmt') {
			const outer = stmt.expr
			expect(outer.kind).toBe('assign_expr')
			if (outer.kind === 'assign_expr') {
				expect(outer.value.kind).toBe('assign_expr')
			}
		}
	})
})

describe('parser — call / member / index', () => {
	it('parses call expression', () => {
		const file = parse('fn f() { foo(1, 2) }')
		const fn = file.items[0] as FnDecl
		const stmt = fn.body.stmts[0]
		expect(stmt.kind).toBe('expr_stmt')
		if (stmt.kind === 'expr_stmt') {
			expect(stmt.expr.kind).toBe('call_expr')
		}
	})

	it('parses member access', () => {
		const file = parse('fn f() { a.b }')
		const fn = file.items[0] as FnDecl
		const stmt = fn.body.stmts[0]
		if (stmt.kind === 'expr_stmt') {
			expect(stmt.expr.kind).toBe('member_expr')
		}
	})
})

describe('parser — if / while', () => {
	it('parses if-else', () => {
		const file = parse('fn f() { if x { } else { } }')
		const fn = file.items[0] as FnDecl
		const stmt = fn.body.stmts[0]
		expect(stmt.kind).toBe('if_stmt')
		if (stmt.kind === 'if_stmt') {
			expect(stmt.else_branch?.kind).toBe('block')
		}
	})

	it('parses while', () => {
		const file = parse('fn f() { while true { } }')
		const fn = file.items[0] as FnDecl
		expect(fn.body.stmts[0].kind).toBe('while_stmt')
	})

	it('parses break and continue', () => {
		const file = parse('fn f() { while true { break; continue } }')
		const fn = file.items[0] as FnDecl
		const loop = fn.body.stmts[0] as any
		expect(loop.body.stmts[0].kind).toBe('break_stmt')
		expect(loop.body.stmts[1].kind).toBe('continue_stmt')
	})
})

describe('parser — structs', () => {
	it('parses empty struct', () => {
		const file = parse('struct Empty {}')
		expect(file.items).toHaveLength(1)
		expect(file.items[0].kind).toBe('struct_decl')
		expect((file.items[0] as any).name).toBe('Empty')
	})

	it('parses struct with fields', () => {
		const file = parse('struct Point { x int, y int }')
		const s = file.items[0] as any
		expect(s.kind).toBe('struct_decl')
		expect(s.fields).toHaveLength(2)
		expect(s.fields[0].name).toBe('x')
		expect(s.fields[1].name).toBe('y')
	})

	it('parses struct with trailing comma', () => {
		const file = parse('struct Point { x int, y int, }')
		const s = file.items[0] as any
		expect(s.fields).toHaveLength(2)
	})

	it('throws error when used as statement', () => {
		expect(() => parse('fn f() { struct S {} }')).toThrow(ParseError)
	})
})

describe('parser — errors', () => {
	it('throws ParseError on bad syntax', () => {
		expect(() => parse('fn () {}')).toThrow(ParseError)
	})

	it('throws ParseError on unclosed block', () => {
		expect(() => parse('fn f() {')).toThrow(ParseError)
	})
})
