import type { Span } from '../lexer/token.ts'

export class ParseError extends Error {
	constructor(
		message: string,
		public readonly span: Span,
	) {
		super(message)
		this.name = 'ParseError'
	}
}

export function format_error(err: ParseError): string {
	const { file, line, col } = err.span
	return `${file}:${line}:${col}: error: ${err.message}`
}
