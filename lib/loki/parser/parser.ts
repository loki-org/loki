import type * as ast from '../ast/nodes.ts'
import type { Lexer } from '../lexer/lexer.ts'
import { type Span, type Token, TokenKind } from '../lexer/token.ts'
import { ParseError } from './parse_error.ts'

// ---------------------------------------------------------------------------
// Pratt precedence levels (higher = tighter binding)
// ---------------------------------------------------------------------------
enum Prec {
	none = 0,
	assign = 1, // =
	or = 2, // or, ||
	and = 3, // and, &&
	equality = 4, // == !=
	relational = 5, // < <= > >=
	additive = 6, // + -
	multiplica = 7, // * / %
	unary = 8, // - ! not  (prefix, handled separately)
	postfix = 9, // () [] .  (handled in parse_postfix)
}

function infix_prec(kind: TokenKind): Prec {
	switch (kind) {
		case TokenKind.eq:
			return Prec.assign
		case TokenKind.or:
		case TokenKind.pipe_pipe:
			return Prec.or
		case TokenKind.and:
		case TokenKind.amp_amp:
			return Prec.and
		case TokenKind.eq_eq:
		case TokenKind.bang_eq:
			return Prec.equality
		case TokenKind.lt:
		case TokenKind.lt_eq:
		case TokenKind.gt:
		case TokenKind.gt_eq:
			return Prec.relational
		case TokenKind.plus:
		case TokenKind.minus:
			return Prec.additive
		case TokenKind.star:
		case TokenKind.slash:
		case TokenKind.percent:
			return Prec.multiplica
		default:
			return Prec.none
	}
}

// Assignment is right-associative — parse right side at same level.
function right_assoc(kind: TokenKind): boolean {
	return kind === TokenKind.eq
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class Parser {
	private lex: Lexer

	constructor(lex: Lexer) {
		this.lex = lex
		// Advance once so that `lex.current` is the first real token.
		this.lex.next()
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	private cur(): Token {
		return this.lex.current
	}
	private peek(): Token {
		return this.lex.peek
	}

	private advance(): Token {
		const tok = this.cur() // snapshot: this is the token being consumed
		this.lex.next() // slide: current ← peek ← scan()
		return tok
	}

	private at(kind: TokenKind): boolean {
		return this.cur().kind === kind
	}

	private peek_at(kind: TokenKind): boolean {
		return this.peek().kind === kind
	}

	private eat(kind: TokenKind): Token | null {
		if (this.at(kind)) return this.advance()
		return null
	}

	private expect(kind: TokenKind): Token {
		if (this.at(kind)) return this.advance()
		throw new ParseError(
			`expected '${TokenKind[kind]}', got '${this.cur().text || TokenKind[this.cur().kind]}'`,
			this.cur().span,
		)
	}

	private error(msg: string): never {
		throw new ParseError(msg, this.cur().span)
	}

	private span_from(start: Span): Span {
		// Extend start span to cover everything up to (and including) the last
		// consumed token. Use byte offsets so len is correct across line breaks.
		const end = this.cur().span
		return {
			file: start.file,
			offset: start.offset,
			line: start.line,
			col: start.col,
			len: end.offset + end.len - start.offset,
		}
	}

	// -------------------------------------------------------------------------
	// Entry point
	// -------------------------------------------------------------------------

	parse_file(path: string): ast.File {
		const start = this.cur().span
		const items: ast.Item[] = []

		while (!this.at(TokenKind.eof)) {
			items.push(this.parse_item())
		}

		return {
			kind: 'file',
			path,
			items,
			span: this.span_from(start),
		}
	}

	// -------------------------------------------------------------------------
	// Top-level items
	// -------------------------------------------------------------------------

	private parse_item(): ast.Item {
		if (this.at(TokenKind.fn)) return this.parse_fn_decl()
		if (this.at(TokenKind.let)) return this.parse_let_decl() as ast.LetDecl
		if (this.at(TokenKind.const_)) return this.parse_const_decl()
		this.error(`expected a top-level item (fn, let, const), got '${this.cur().text}'`)
	}

	private parse_fn_decl(): ast.FnDecl {
		const start = this.cur().span
		this.expect(TokenKind.fn)
		const name_tok = this.expect(TokenKind.ident)
		const name = name_tok.text

		this.expect(TokenKind.l_paren)
		const params = this.parse_param_list()
		this.expect(TokenKind.r_paren)

		let return_type: ast.TypeExpr | null = null
		if (this.eat(TokenKind.arrow)) {
			return_type = this.parse_type_expr()
		}

		const body = this.parse_block()

		return {
			kind: 'fn_decl',
			name,
			params,
			return_type,
			body,
			span: this.span_from(start),
		}
	}

	private parse_param_list(): ast.Param[] {
		const params: ast.Param[] = []
		while (!this.at(TokenKind.r_paren) && !this.at(TokenKind.eof)) {
			const start = this.cur().span
			const name_tok = this.expect(TokenKind.ident)
			this.expect(TokenKind.colon)
			const type_ann = this.parse_type_expr()
			params.push({ name: name_tok.text, type_ann, span: this.span_from(start) })
			if (!this.eat(TokenKind.comma)) break
		}
		return params
	}

	// -------------------------------------------------------------------------
	// Type expressions
	// -------------------------------------------------------------------------

	private parse_type_expr(): ast.TypeExpr {
		// [T]  — array type
		if (this.at(TokenKind.l_bracket)) {
			const start = this.cur().span
			this.advance()
			const elem = this.parse_type_expr()
			this.expect(TokenKind.r_bracket)
			return { kind: 'array_type', elem, span: this.span_from(start) } satisfies ast.ArrayType
		}

		// Named type (possibly optional with trailing ?)
		const start = this.cur().span
		const name_tok = this.expect(TokenKind.ident)
		const named: ast.NamedType = {
			kind: 'named_type',
			name: name_tok.text,
			span: this.span_from(start),
		}

		// Optional type sugar: T?
		// (We check peek because `?` is not a dedicated token yet — use `bang` if
		// we add it later; for now we skip optional types and leave room for it.)
		return named
	}

	// -------------------------------------------------------------------------
	// Statements
	// -------------------------------------------------------------------------

	private parse_block(): ast.Block {
		const start = this.cur().span
		this.expect(TokenKind.l_brace)
		const stmts: ast.Stmt[] = []
		while (!this.at(TokenKind.r_brace) && !this.at(TokenKind.eof)) {
			stmts.push(this.parse_stmt())
		}
		this.expect(TokenKind.r_brace)
		return { kind: 'block', stmts, span: this.span_from(start) }
	}

	private parse_stmt(): ast.Stmt {
		if (this.at(TokenKind.let)) return this.parse_let_decl()
		if (this.at(TokenKind.const_)) return this.parse_const_decl()
		if (this.at(TokenKind.return_)) return this.parse_return_stmt()
		if (this.at(TokenKind.if_)) return this.parse_if_stmt()
		if (this.at(TokenKind.while_)) return this.parse_while_stmt()
		if (this.at(TokenKind.for_)) return this.parse_for_stmt()
		if (this.at(TokenKind.l_brace)) return this.parse_block()
		return this.parse_expr_stmt()
	}

	private parse_let_decl(): ast.LetDecl {
		const start = this.cur().span
		this.expect(TokenKind.let)
		const name_tok = this.expect(TokenKind.ident)

		let type_ann: ast.TypeExpr | null = null
		if (this.eat(TokenKind.colon)) {
			type_ann = this.parse_type_expr()
		}

		let init: ast.Expr | null = null
		if (this.eat(TokenKind.eq)) {
			init = this.parse_expr()
		}

		this.eat(TokenKind.semi)
		return { kind: 'let_decl', name: name_tok.text, type_ann, init, span: this.span_from(start) }
	}

	private parse_const_decl(): ast.ConstDecl {
		const start = this.cur().span
		this.expect(TokenKind.const_)
		const name_tok = this.expect(TokenKind.ident)

		let type_ann: ast.TypeExpr | null = null
		if (this.eat(TokenKind.colon)) {
			type_ann = this.parse_type_expr()
		}

		this.expect(TokenKind.eq)
		const init = this.parse_expr()
		this.eat(TokenKind.semi)
		return { kind: 'const_decl', name: name_tok.text, type_ann, init, span: this.span_from(start) }
	}

	private parse_return_stmt(): ast.ReturnStmt {
		const start = this.cur().span
		this.expect(TokenKind.return_)
		// A return with no expression: `return` followed by `}` or `;`
		let value: ast.Expr | null = null
		if (!this.at(TokenKind.r_brace) && !this.at(TokenKind.semi) && !this.at(TokenKind.eof)) {
			value = this.parse_expr()
		}
		this.eat(TokenKind.semi)
		return { kind: 'return_stmt', value, span: this.span_from(start) }
	}

	private parse_if_stmt(): ast.IfStmt {
		const start = this.cur().span
		this.expect(TokenKind.if_)
		const cond = this.parse_expr()
		const then_block = this.parse_block()

		let else_branch: ast.Block | ast.IfStmt | null = null
		if (this.eat(TokenKind.else_)) {
			if (this.at(TokenKind.if_)) {
				else_branch = this.parse_if_stmt()
			} else {
				else_branch = this.parse_block()
			}
		}

		return { kind: 'if_stmt', cond, then_block, else_branch, span: this.span_from(start) }
	}

	private parse_while_stmt(): ast.WhileStmt {
		const start = this.cur().span
		this.expect(TokenKind.while_)
		const cond = this.parse_expr()
		const body = this.parse_block()
		return { kind: 'while_stmt', cond, body, span: this.span_from(start) }
	}

	private parse_for_stmt(): ast.ForStmt {
		const start = this.cur().span
		this.expect(TokenKind.for_)
		const var_tok = this.expect(TokenKind.ident)
		this.expect(TokenKind.ident) // `in` — treat as contextual keyword for now
		const iterable = this.parse_expr()
		const body = this.parse_block()
		return { kind: 'for_stmt', variable: var_tok.text, iterable, body, span: this.span_from(start) }
	}

	private parse_expr_stmt(): ast.ExprStmt {
		const start = this.cur().span
		const expr = this.parse_expr()
		this.eat(TokenKind.semi)
		return { kind: 'expr_stmt', expr, span: this.span_from(start) }
	}

	// -------------------------------------------------------------------------
	// Expressions — Pratt parser
	// -------------------------------------------------------------------------

	parse_expr(): ast.Expr {
		return this.parse_pratt(Prec.none)
	}

	private parse_pratt(min_prec: Prec): ast.Expr {
		let left = this.parse_unary()

		while (true) {
			const prec = infix_prec(this.cur().kind)
			if (prec <= min_prec) break

			const op_tok = this.advance()
			const next_prec = right_assoc(op_tok.kind) ? prec - 1 : prec
			const right = this.parse_pratt(next_prec)

			if (op_tok.kind === TokenKind.eq) {
				left = {
					kind: 'assign_expr',
					target: left,
					value: right,
					span: this.span_from(left.span),
				} satisfies ast.AssignExpr
			} else {
				left = {
					kind: 'binary_expr',
					op: op_tok.text,
					left,
					right,
					span: this.span_from(left.span),
				} satisfies ast.BinaryExpr
			}
		}

		return left
	}

	private parse_unary(): ast.Expr {
		const start = this.cur().span

		if (this.at(TokenKind.minus) || this.at(TokenKind.bang) || this.at(TokenKind.not)) {
			const op = this.advance().text
			const operand = this.parse_unary()
			return {
				kind: 'unary_expr',
				op,
				operand,
				span: this.span_from(start),
			} satisfies ast.UnaryExpr
		}

		return this.parse_postfix()
	}

	private parse_postfix(): ast.Expr {
		let expr = this.parse_primary()

		while (true) {
			if (this.at(TokenKind.l_paren)) {
				// Call expression
				const start = expr.span
				this.advance()
				const args = this.parse_arg_list()
				this.expect(TokenKind.r_paren)
				expr = {
					kind: 'call_expr',
					callee: expr,
					args,
					span: this.span_from(start),
				} satisfies ast.CallExpr
			} else if (this.at(TokenKind.l_bracket)) {
				// Index expression
				const start = expr.span
				this.advance()
				const index = this.parse_expr()
				this.expect(TokenKind.r_bracket)
				expr = {
					kind: 'index_expr',
					object: expr,
					index,
					span: this.span_from(start),
				} satisfies ast.IndexExpr
			} else if (this.at(TokenKind.dot)) {
				// Member expression
				const start = expr.span
				this.advance()
				const member_tok = this.expect(TokenKind.ident)
				expr = {
					kind: 'member_expr',
					object: expr,
					member: member_tok.text,
					span: this.span_from(start),
				} satisfies ast.MemberExpr
			} else {
				break
			}
		}

		return expr
	}

	private parse_arg_list(): ast.Expr[] {
		const args: ast.Expr[] = []
		while (!this.at(TokenKind.r_paren) && !this.at(TokenKind.eof)) {
			args.push(this.parse_expr())
			if (!this.eat(TokenKind.comma)) break
		}
		return args
	}

	private parse_primary(): ast.Expr {
		const tok = this.cur()
		const span = tok.span

		switch (tok.kind) {
			case TokenKind.int: {
				this.advance()
				return { kind: 'int_lit', value: Number.parseInt(tok.text, 10), span } satisfies ast.IntLit
			}
			case TokenKind.float: {
				this.advance()
				return { kind: 'float_lit', value: Number.parseFloat(tok.text), span } satisfies ast.FloatLit
			}
			case TokenKind.string: {
				this.advance()
				return { kind: 'string_lit', value: tok.text, span } satisfies ast.StringLit
			}
			case TokenKind.true_: {
				this.advance()
				return { kind: 'bool_lit', value: true, span } satisfies ast.BoolLit
			}
			case TokenKind.false_: {
				this.advance()
				return { kind: 'bool_lit', value: false, span } satisfies ast.BoolLit
			}
			case TokenKind.null_: {
				this.advance()
				return { kind: 'null_lit', span } satisfies ast.NullLit
			}
			case TokenKind.ident: {
				this.advance()
				return { kind: 'ident_expr', name: tok.text, span } satisfies ast.IdentExpr
			}
			case TokenKind.l_paren: {
				this.advance()
				const expr = this.parse_expr()
				this.expect(TokenKind.r_paren)
				return expr
			}
			default:
				this.error(`unexpected token '${tok.text || TokenKind[tok.kind]}' in expression`)
		}
	}
}
