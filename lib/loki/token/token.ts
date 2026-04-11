export enum TokenKind {
	// With value
	name,

	// Simple tokens
	eof,
	lpar, // (
	rpar, // )
	lcurly, // {
	rcurly, // }

	// Keywords
	k_pub,
	k_fun,
}

export type Pos = {
	line: number
	col: number
}

export type Token = {
	kind: TokenKind
	val: string
	pos: Pos
}
