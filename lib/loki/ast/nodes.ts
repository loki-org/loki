import type { Span } from '../lexer/token.ts'

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface Ident {
	kind: 'ident'
	name: string
	span: Span
}

// ---------------------------------------------------------------------------
// Type expressions
// ---------------------------------------------------------------------------

export type TypeExpr = NamedType | ArrayType | OptionalType

export interface NamedType {
	kind: 'named_type'
	name: string
	span: Span
}

export interface ArrayType {
	kind: 'array_type'
	elem: TypeExpr
	span: Span
}

export interface OptionalType {
	kind: 'optional_type'
	inner: TypeExpr
	span: Span
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export type Expr =
	| IntLit
	| FloatLit
	| StringLit
	| BoolLit
	| NullLit
	| IdentExpr
	| BinaryExpr
	| UnaryExpr
	| CallExpr
	| IndexExpr
	| MemberExpr
	| AssignExpr

export interface IntLit {
	kind: 'int_lit'
	value: number
	span: Span
}

export interface FloatLit {
	kind: 'float_lit'
	value: number
	span: Span
}

export interface StringLit {
	kind: 'string_lit'
	value: string
	span: Span
}

export interface BoolLit {
	kind: 'bool_lit'
	value: boolean
	span: Span
}

export interface NullLit {
	kind: 'null_lit'
	span: Span
}

export interface IdentExpr {
	kind: 'ident_expr'
	name: string
	span: Span
}

export interface BinaryExpr {
	kind: 'binary_expr'
	op: string
	left: Expr
	right: Expr
	span: Span
}

export interface UnaryExpr {
	kind: 'unary_expr'
	op: string
	operand: Expr
	span: Span
}

export interface CallExpr {
	kind: 'call_expr'
	callee: Expr
	args: Expr[]
	span: Span
}

export interface IndexExpr {
	kind: 'index_expr'
	object: Expr
	index: Expr
	span: Span
}

export interface MemberExpr {
	kind: 'member_expr'
	object: Expr
	member: string
	span: Span
}

export interface AssignExpr {
	kind: 'assign_expr'
	target: Expr
	value: Expr
	span: Span
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export type Stmt =
	| LetDecl
	| ConstDecl
	| ReturnStmt
	| IfStmt
	| WhileStmt
	| ForStmt
	| Block
	| ExprStmt

export interface LetDecl {
	kind: 'let_decl'
	name: string
	type_ann: TypeExpr | null
	init: Expr | null
	span: Span
}

export interface ConstDecl {
	kind: 'const_decl'
	name: string
	type_ann: TypeExpr | null
	init: Expr
	span: Span
}

export interface ReturnStmt {
	kind: 'return_stmt'
	value: Expr | null
	span: Span
}

export interface IfStmt {
	kind: 'if_stmt'
	cond: Expr
	then_block: Block
	else_branch: Block | IfStmt | null
	span: Span
}

export interface WhileStmt {
	kind: 'while_stmt'
	cond: Expr
	body: Block
	span: Span
}

export interface ForStmt {
	kind: 'for_stmt'
	variable: string
	iterable: Expr
	body: Block
	span: Span
}

export interface Block {
	kind: 'block'
	stmts: Stmt[]
	span: Span
}

export interface ExprStmt {
	kind: 'expr_stmt'
	expr: Expr
	span: Span
}

// ---------------------------------------------------------------------------
// Top-level items
// ---------------------------------------------------------------------------

export type Item = FnDecl | LetDecl | ConstDecl | StructDecl

export interface Param {
	name: string
	type_ann: TypeExpr
	span: Span
}

export interface FnDecl {
	kind: 'fn_decl'
	name: string
	params: Param[]
	return_type: TypeExpr | null
	body: Block
	span: Span
}

export interface StructField {
	name: string
	type_ann: TypeExpr
	span: Span
}

export interface StructDecl {
	kind: 'struct_decl'
	name: string
	fields: StructField[]
	span: Span
}

// ---------------------------------------------------------------------------
// File root
// ---------------------------------------------------------------------------

export interface File {
	kind: 'file'
	path: string
	items: Item[]
	span: Span
}
