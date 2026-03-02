import { describe, expect, it } from 'bun:test'
import { Lexer } from '../lexer/lexer.ts'
import { Parser } from '../parser/parser.ts'
import { JsGenerator } from '../gen/js.ts'

function gen_js(source: string): string {
	const lex = new Lexer(source, '<test>')
	const parser = new Parser(lex)
	const file = parser.parse_file('<test>')
	const gen = new JsGenerator()
	gen.gen_file(file)
	return gen.to_string().trim()
}

describe('gen — js', () => {
	it('generates a function', () => {
		const source = 'fn main() {}'
		const output = gen_js(source)
		expect(output).toBe('function main() {\n}')
	})

	it('generates a function with params', () => {
		const source = 'fn sum(a int, b int) {}'
		const output = gen_js(source)
		expect(output).toBe('function sum(a: number, b: number) {\n}')
	})

	it('generates variables', () => {
		const source = 'fn main() { x := 10; mut y := 20 }'
		const output = gen_js(source)
		expect(output).toContain('const x = 10;')
		expect(output).toContain('let y = 20;')
	})

	it('generates math assignments', () => {
		const source = 'fn main() { mut x := 10; x += 5 }'
		const output = gen_js(source)
		expect(output).toContain('x += 5;')
	})

	it('translates logical operators', () => {
		const source = 'fn main() { if true and not false {} }'
		const output = gen_js(source)
		expect(output).toContain('if ((true && (!false)))')
	})
})
