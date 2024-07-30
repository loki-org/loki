// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from "./table.js"

class Sema {
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

	const_decl(node) {
		node.type = this.expr(node.expr)
	}

	fun_decl(node) {
		this.stmts(node.body)
	}

	struct_decl(node) {
		// no checks yet
	}

	expr(node) {
		switch (node.kind) {
			case 'cast_expr': {
				return this.cast_expr(node)
			}
			case 'integer':
				return IDXS.i32
			default: {
				throw new Error(`cannot check ${node.kind}`)
			}
		}
	}

	cast_expr(node) {
		this.expr(node.expr)
		// TODO: check cast is possible
		return node.target
	}
}

export { Sema }
