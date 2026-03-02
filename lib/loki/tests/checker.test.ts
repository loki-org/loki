import { describe, expect, it } from 'bun:test'
import { Lexer } from '../lexer/lexer.ts'
import { Parser } from '../parser/parser.ts'
import { Checker } from '../checker/checker.ts'

function check(source: string) {
	const lex = new Lexer(source, '<test>')
	const parser = new Parser(lex)
	const file = parser.parse_file('<test>')
	const checker = new Checker()
	return checker.check_file(file)
}

describe('checker — basics', () => {
	it('checks an empty file', () => {
		const errors = check('')
		expect(errors).toHaveLength(0)
	})

	it('checks simple declarations', () => {
		const source = `
			const X := 10
			fn main() {
				mut y := X
				y = 20
			}
		`
		const errors = check(source)
		expect(errors).toHaveLength(0)
	})

	it('checks loops and ifs', () => {
		const source = `
			fn main() {
				for i := 0; i < 10; i += 1 {
					if i == 5 {
						break
					}
				}
			}
		`
		const errors = check(source)
		expect(errors).toHaveLength(0)
	})
})
