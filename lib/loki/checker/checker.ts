import type * as ast from '../ast/nodes.ts'
import type { Pos } from '../lexer/token.ts'
import { CheckError } from './check_error.ts'
import * as types from './types.ts'

export class Checker {
	private errors: CheckError[] = []
	private file: string = ''

	constructor() {}

	check_file(node: ast.File): CheckError[] {
		this.errors = []
		this.file = node.path

		for (const item of node.items) {
			this.check_item(item)
		}

		return this.errors
	}

	private error(msg: string, pos: Pos) {
		this.errors.push(new CheckError(msg, this.file, pos))
	}

	// -------------------------------------------------------------------------
	// Items
	// -------------------------------------------------------------------------

	private check_item(node: ast.Item) {
		switch (node.kind) {
			case 'fn_decl':
				this.check_fn_decl(node)
				break
			case 'var_decl':
				this.check_var_decl(node)
				break
			case 'const_decl':
				this.check_const_decl(node)
				break
			case 'struct_decl':
				this.check_struct_decl(node)
				break
		}
	}

	private check_fn_decl(node: ast.FnDecl) {
		// Basic traversal for now
		this.check_block(node.body)
	}

	private check_struct_decl(node: ast.StructDecl) {
		// Basic traversal for now
	}

	// -------------------------------------------------------------------------
	// Statements
	// -------------------------------------------------------------------------

	private check_stmt(node: ast.Stmt) {
		switch (node.kind) {
			case 'var_decl':
				this.check_var_decl(node)
				break
			case 'const_decl':
				this.check_const_decl(node)
				break
			case 'return_stmt':
				if (node.value) this.check_expr(node.value)
				break
			case 'if_stmt':
				this.check_expr(node.cond)
				this.check_block(node.then_block)
				if (node.else_branch) {
					if (node.else_branch.kind === 'block') {
						this.check_block(node.else_branch)
					} else {
						this.check_stmt(node.else_branch)
					}
				}
				break
			case 'for_stmt':
				if (node.init) {
					if (node.init.kind === 'for_in_init') {
						this.check_expr(node.init.expr)
					} else {
						this.check_stmt(node.init)
					}
				}
				if (node.cond) this.check_expr(node.cond)
				if (node.post) this.check_stmt(node.post)
				this.check_block(node.body)
				break;
			case 'break_stmt':
			case 'continue_stmt':
				break
			case 'block':
				this.check_block(node)
				break
			case 'expr_stmt':
				this.check_expr(node.expr)
				break
		}
	}

	private check_block(node: ast.Block) {
		for (const stmt of node.stmts) {
			this.check_stmt(stmt)
		}
	}

	private check_var_decl(node: ast.VarDecl) {
		this.check_expr(node.init)
	}

	private check_const_decl(node: ast.ConstDecl) {
		this.check_expr(node.init)
	}

	// -------------------------------------------------------------------------
	// Expressions
	// -------------------------------------------------------------------------

	private check_expr(node: ast.Expr): types.Type {
		switch (node.kind) {
			case 'int_lit':
				return types.type_int
			case 'float_lit':
				return types.type_float
			case 'string_lit':
				return types.type_string
			case 'bool_lit':
				return types.type_bool
			case 'null_lit':
				return types.type_error // TODO: proper null type
			case 'ident_expr':
				return types.type_error // TODO: lookup
			case 'binary_expr':
				this.check_expr(node.left)
				this.check_expr(node.right)
				return types.type_error // TODO: result type
			case 'unary_expr':
				this.check_expr(node.operand)
				return types.type_error // TODO: result type
			case 'call_expr':
				this.check_expr(node.callee)
				for (const arg of node.args) {
					this.check_expr(arg)
				}
				return types.type_error // TODO: return type
			case 'index_expr':
				this.check_expr(node.object)
				this.check_expr(node.index)
				return types.type_error
			case 'member_expr':
				this.check_expr(node.object)
				return types.type_error
			case 'assign_expr':
				this.check_expr(node.target)
				this.check_expr(node.value)
				return types.type_error
		}
	}
}
