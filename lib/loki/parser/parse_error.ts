import type { Pos } from '../lexer/token.ts'

export class ParseError extends Error {
	constructor(
		message: string,
		public readonly file: string,
		public readonly pos: Pos,
	) {
		super(message)
		this.name = 'ParseError'
	}
}

export function format_error(err: ParseError): string {
	const { line, col } = err.pos
	return `${err.file}:${line}:${col}: error: ${err.message}`
}
