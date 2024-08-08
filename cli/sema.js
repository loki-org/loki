// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from "./table.js"
import { Scope } from "./scope.js"

class Sema {
	constructor(table) {
		this.table = table
		this.scope = this.table.global_scope
	}

	check(ast) {
		this.stmts(ast.body)
	}

	stmts(stmts) {
		for (const stmt of stmts) {
			this.stmt(stmt)
		}
	}

	stmt(stmt) {
		switch (stmt.kind) {
			case 'assign': {
				this.assign_stmt(stmt)
				break
			}
			case 'const_decl': {
				this.const_decl(stmt)
				break
			}
			case 'fun_decl': {
				this.fun_decl(stmt)
				break
			}
			case 'struct_decl': {
				this.struct_decl(stmt)
				break
			}
			default: {
				throw new Error(`cannot check ${stmt.kind}`)
			}
		}
	}

	assign_stmt(node) {
		if (node.op === 'decl_assign') {
			this.decl_assign(node)
			return
		}

		// TODO check if left is assignable
		// TODO check types match
		this.expr(node.left)
		this.expr(node.right)
	}

	decl_assign(node) {
		const rhs = this.expr(node.right)
		if (node.left.kind === 'ident') {
			this.scope.insert(node.left.name, rhs)
			this.expr(node.left)
		}
	}

	const_decl(node) {
		node.type = this.expr(node.expr)
	}

	fun_decl(node) {
		this.open_scope()
		this.stmts(node.body)
		this.close_scope()
	}

	struct_decl(node) {
		// no checks yet
	}

	expr(node) {
		switch (node.kind) {
			case 'cast_expr':
				return this.cast_expr(node)
			case 'ident':
				return this.ident(node)
			case 'integer':
				return IDXS.i32
			case 'struct_init':
				return this.struct_init(node)
			default:
				throw new Error(`cannot check ${node.kind}`)
		}
	}

	cast_expr(node) {
		this.expr(node.expr)
		// TODO check cast is possible
		return node.target
	}

	ident(node) {
		node.obj = this.scope.lookup(node.name)
		// TODO check obj exists
		return node.obj
	}

	struct_init(node) {
		const idx = this.table.indexes.get(node.name)
		// TODO check struct exists
		for (const field of node.fields) {
			// TODO check field exists
			// TODO check type matches
			this.expr(field.expr)
		}
		return idx
	}

	open_scope() {
		this.scope = new Scope(this.scope)
	}

	close_scope() {
		this.scope = this.scope.parent
	}
}

export { Sema }
