// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from "./table.js"

class Transformer {
	ast = null

	transform(ast) {
		ast.body = this.stmts(ast.body)

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
			default:
				return this.expr(stmt)
		}
	}

	expr(expr) {
		switch (expr.kind) {
			default:
				return expr
		}
	}
}

export { Transformer }
