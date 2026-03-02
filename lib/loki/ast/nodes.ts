import type { Pos } from '../lexer/token.ts'

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface Ident {
	kind: 'ident'
	name: string
	pos: Pos
}

// ---------------------------------------------------------------------------
// Type expressions
// ---------------------------------------------------------------------------

export type TypeExpr = NamedType | ArrayType | OptionalType

export interface NamedType {
	kind: 'named_type'
	name: string
	pos: Pos
}

export interface ArrayType {
	kind: 'array_type'
	elem: TypeExpr
	pos: Pos
}

export interface OptionalType {
	kind: 'optional_type'
	inner: TypeExpr
	pos: Pos
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
	pos: Pos
}

export interface FloatLit {
	kind: 'float_lit'
	value: number
	pos: Pos
}

export interface StringLit {
	kind: 'string_lit'
	value: string
	pos: Pos
}

export interface BoolLit {
	kind: 'bool_lit'
	value: boolean
	pos: Pos
}

export interface NullLit {
	kind: 'null_lit'
	pos: Pos
}

export interface IdentExpr {
	kind: 'ident_expr'
	name: string
	pos: Pos
}

export interface BinaryExpr {
	kind: 'binary_expr'
	op: string
	left: Expr
	right: Expr
	pos: Pos
}

export interface UnaryExpr {
	kind: 'unary_expr'
	op: string
	operand: Expr
	pos: Pos
}

export interface CallExpr {
	kind: 'call_expr'
	callee: Expr
	args: Expr[]
	pos: Pos
}

export interface IndexExpr {
	kind: 'index_expr'
	object: Expr
	index: Expr
	pos: Pos
}

export interface MemberExpr {
	kind: 'member_expr'
	object: Expr
	member: string
	pos: Pos
}

export interface AssignExpr {
	kind: 'assign_expr'
	target: Expr
	value: Expr
	pos: Pos
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export type Stmt =
	| VarDecl
	| ConstDecl
	| ReturnStmt
	| IfStmt
	| WhileStmt
	| ForStmt
	| BreakStmt
	| ContinueStmt
	| Block
	| ExprStmt

export interface VarDecl {
	kind: 'var_decl'
	name: string
	mutable: boolean
	init: Expr
	pos: Pos
}

export interface ConstDecl {
	kind: 'const_decl'
	name: string
	type_ann: TypeExpr | null
	init: Expr
	pos: Pos
}

export interface ReturnStmt {
	kind: 'return_stmt'
	value: Expr | null
	pos: Pos
}

export interface IfStmt {
	kind: 'if_stmt'
	cond: Expr
	then_block: Block
	else_branch: Block | IfStmt | null
	pos: Pos
}

export interface WhileStmt {
	kind: 'while_stmt'
	cond: Expr
	body: Block
	pos: Pos
}

export interface ForStmt {
	kind: 'for_stmt'
	variable: string
	iterable: Expr
	body: Block
	pos: Pos
}

export interface Block {
	kind: 'block'
	stmts: Stmt[]
	pos: Pos
}

export interface ExprStmt {
	kind: 'expr_stmt'
	expr: Expr
	pos: Pos
}

export interface BreakStmt {
	kind: 'break_stmt'
	pos: Pos
}

export interface ContinueStmt {
	kind: 'continue_stmt'
	pos: Pos
}

// ---------------------------------------------------------------------------
// Top-level items
// ---------------------------------------------------------------------------

export type Item = FnDecl | VarDecl | ConstDecl | StructDecl

export interface Param {
	name: string
	type_ann: TypeExpr
	pos: Pos
}

export interface FnDecl {
	kind: 'fn_decl'
	name: string
	params: Param[]
	return_type: TypeExpr | null
	body: Block
	pos: Pos
}

export interface StructField {
	name: string
	type_ann: TypeExpr
	pos: Pos
}

export interface StructDecl {
	kind: 'struct_decl'
	name: string
	fields: StructField[]
	pos: Pos
}

// ---------------------------------------------------------------------------
// File root
// ---------------------------------------------------------------------------

export interface File {
	kind: 'file'
	path: string
	items: Item[]
	pos: Pos
}
