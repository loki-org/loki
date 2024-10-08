// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

class Transformer {
	ast = null

	transform(ast) {
		this.ast = ast

		this.stmts(this.ast.body)

		return this.ast
	}

	stmts(stmts) {
		for (const stmt of stmts) {
			this.stmt(stmt)
		}
	}

	stmt(stmt) {
		switch (stmt.kind) {
			default:
				this.expr(stmt)
				break
		}
	}

	expr(expr) {
		switch (expr.kind) {
			default:
				break
		}
	}
}

export { Transformer }
