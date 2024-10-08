// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from "./table.js"

class Transformer {
	ast = null
	main_fun = null

	transform(ast) {
		this.is_test = ast.is_test

		if (this.is_test) {
			this.main_fun = {
				kind: 'fun_decl',
				name: 'test_main',
				params: [],
				return_type: IDXS.void,
				body: [],
			}
		}

		ast.body = this.stmts(ast.body)

		if (this.is_test) {
			ast.body.push(this.main_fun)
		}

		return ast
	}

	stmts(stmts) {
		stmts.forEach((stmt, i) => {
			stmts[i] = this.stmt(stmt)
		})

		return stmts
	}

	stmt(stmt) {
		switch (stmt.kind) {
			case 'fun_decl':
				return this.fun_decl(stmt)
			default:
				return this.expr(stmt)
		}
	}

	fun_decl(node) {
		if (node.is_test) {
			if (!this.is_test) {
				return null
			}

			this.main_fun.body.push({
				kind: 'call_expr',
				name: node.name,
				args: [],
			})
		}

		return node
	}

	expr(expr) {
		switch (expr.kind) {
			default:
				return expr
		}
	}
}

export { Transformer }
