// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { Scope } from './scope.js'

class Checker {
	constructor(table) {
		this.table = table
		this.scope = new Scope(null)
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
				this.assign(stmt)
				break
			}
			case 'comment': {
				break
			}
			case 'fun': {
				this.fun(stmt)
				break
			}
			case 'return': {
				this.return_stmt(stmt)
				break
			}
			case 'expr': {
				this.expr(stmt.expr)
				break
			}
			default: {
				throw new Error(`cannot check ${stmt.kind}`)
			}
		}
	}

	assign(stmt) {
		if (stmt.op === 'decl_assign') {
			stmt.type = this.expr(stmt.right)
			if (this.scope.is_known(stmt.left.name)) {
				throw new Error(`cannot redeclare ${stmt.left.name}`)
			}
			this.scope.register(stmt.left.name, stmt.type)
			this.expr(stmt.left)
			return
		}

		// TODO left should be mut

		const ltype = this.expr(stmt.left)
		const rtype = this.expr(stmt.right)
		if (ltype !== rtype) {
			throw new Error(`cannot assign ${rtype} to ${ltype}`)
		}
	}

	fun(stmt) {
		this.scope = new Scope(this.scope)
		this.stmts(stmt.body)
		this.scope = this.scope.parent
	}

	return_stmt(stmt) {
		this.expr(stmt.expr)
	}

	expr(expr) {
		switch (expr.kind) {
			case 'array_init': {
				return this.array_init(expr)
			}
			case 'bool': {
				return IDXS.bool
			}
			case 'ident': {
				return this.ident(expr)
			}
			case 'index': {
				return this.index_expr(expr)
			}
			case 'infix': {
				return this.infix_expr(expr)
			}
			case 'integer': {
				return IDXS.i32
			}
			case 'map_init': {
				return this.map_init(expr)
			}
			case 'string': {
				return IDXS.string
			}
			default: {
				throw new Error(`cannot check ${expr.kind}`)
			}
		}
	}

	array_init(expr) {
		return expr.type
	}

	ident(expr) {
		const typ = this.scope.find(expr.name)
		if (typ === null) {
			throw new Error(`unknown identifier ${expr.name}`)
		}
		return typ
	}

	index_expr(expr) {
		expr.left_type = this.expr(expr.left)
		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'map') {
			const idx_type = this.expr(expr.index)
			if (idx_type !== lsym.key_type) {
				throw new Error(`cannot use ${idx_type} as ${lsym.key_type}`)
			}

			return lsym.val_type
		}

		throw new Error(`cannot index ${expr.left_type}`)
	}

	infix_expr(expr) {
		const ltype = this.expr(expr.left)
		const rtype = this.expr(expr.right)
		if (ltype !== rtype) {
			throw new Error(`types ${ltype} and ${rtype} do not match`)
		}
		return ltype
	}

	map_init(expr) {
		return expr.type
	}
}

export { Checker }
