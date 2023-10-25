// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'

class Checker {
	constructor(table) {
		this.table = table
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
			case 'fn': {
				this.fn(stmt)
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
		this.expr(stmt.left)
		stmt.type = this.expr(stmt.right)
	}

	fn(stmt) {
		this.stmts(stmt.body)
	}

	return_stmt(stmt) {
		this.expr(stmt.expr)
	}

	expr(expr) {
		switch (expr.kind) {
			case 'array_init': {
				return this.array_init(expr)
			}
			case 'ident': {
				return this.ident(expr)
			}
			case 'integer': {
				return this.integer(expr)
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
		// TODO
		return IDXS.void
	}

	integer(expr) {
		return IDXS.i32
	}
}

export { Checker }