import type { Pos } from '../lexer/token.ts'

export class CheckError extends Error {
	constructor(
		message: string,
		public readonly file: string,
		public readonly pos: Pos,
	) {
		super(message)
		this.name = 'CheckError'
	}
}

export function format_check_error(err: CheckError): string {
	const { line, col } = err.pos
	return `${err.file}:${line}:${col}: semantic error: ${err.message}`
}
