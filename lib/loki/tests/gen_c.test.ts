import { describe, expect, it } from 'bun:test'
import { Lexer } from '../lexer/lexer.ts'
import { Parser } from '../parser/parser.ts'
import { CGenerator } from '../gen/c.ts'

function gen_c(source: string): string {
	const lex = new Lexer(source, '<test>')
	const parser = new Parser(lex)
	const file = parser.parse_file('<test>')
	const gen = new CGenerator()
	gen.gen_file(file)
	return gen.to_string().trim()
}

describe('gen — c', () => {
	it('generates a function', () => {
		const source = 'fn main() {}'
		const output = gen_c(source)
		expect(output).toContain('int main() {')
	})

	it('generates a function with params', () => {
		const source = 'fn sum(a int, b int) {}'
		const output = gen_c(source)
		expect(output).toContain('void sum(int a, int b) {')
	})

	it('generates variables', () => {
		const source = 'fn main() { x := 10; mut y := 20 }'
		const output = gen_c(source)
		expect(output).toContain('const int x = 10;')
		expect(output).toContain('int y = 20;')
	})

	it('translates logical operators', () => {
		const source = 'fn main() { if true and not false {} }'
		const output = gen_c(source)
		expect(output).toContain('if ((true && (!false)))')
	})
})
