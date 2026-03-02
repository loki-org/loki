export interface Pos {
	offset: number // byte offset of first character
	line: number
	col: number
	len: number // byte length
}

export enum TokenKind {
	// Literals
	int,
	float,
	string,
	true_,
	false_,
	null_,

	// Identifiers
	ident,

	// Keywords
	fn,
	let,
	const_,
	if_,
	else_,
	return_,
	and,
	or,
	not,
	import_,
	export_,
	struct_,
	enum_,
	match_,
	for_,
	while_,
	break_,
	continue_,

	// Punctuation
	l_paren, // (
	r_paren, // )
	l_brace, // {
	r_brace, // }
	l_bracket, // [
	r_bracket, // ]
	comma, // ,
	semi, // ;
	colon, // :
	dot, // .
	dot_dot, // ..
	arrow, // ->

	// Operators
	plus, // +
	minus, // -
	star, // *
	slash, // /
	percent, // %
	eq, // =
	eq_eq, // ==
	bang_eq, // !=
	lt, // <
	lt_eq, // <=
	gt, // >
	gt_eq, // >=

	// Special
	eof,
	error,
}

const KEYWORDS: Record<string, TokenKind> = {
	fn: TokenKind.fn,
	let: TokenKind.let,
	const: TokenKind.const_,
	if: TokenKind.if_,
	else: TokenKind.else_,
	return: TokenKind.return_,
	true: TokenKind.true_,
	false: TokenKind.false_,
	null: TokenKind.null_,
	and: TokenKind.and,
	or: TokenKind.or,
	not: TokenKind.not,
	import: TokenKind.import_,
	export: TokenKind.export_,
	struct: TokenKind.struct_,
	enum: TokenKind.enum_,
	match: TokenKind.match_,
	for: TokenKind.for_,
	while: TokenKind.while_,
	break: TokenKind.break_,
	continue: TokenKind.continue_,
}

export function keyword_kind(text: string): TokenKind | undefined {
	return KEYWORDS[text]
}

export interface Token {
	kind: TokenKind
	text: string
	pos: Pos
}

export function make_token(kind: TokenKind, text: string, pos: Pos): Token {
	return { kind, text, pos }
}
