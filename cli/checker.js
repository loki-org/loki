// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { Scope } from './scope.js'

const ATTRS = {
	'main': {
		applies: 'fun',
		max: 1,
		check: (checker, fun) => {
			if (fun.return_type !== IDXS.void) {
				throw new Error(`main function cannot return a value`)
			}

			// TODO support "args []string" param
			if (fun.params.length === 1) {
				const sym = checker.table.sym(fun.params[0].type)
				if (sym.kind !== 'array' || sym.elem_type !== IDXS.string) {
					throw new Error(`main function must have no params or "args []string"`)
				}
			} else {
				throw new Error(`main function must have no params or "args []string"`)
			}

			checker.main_fun = fun
		}
	},
}

class Checker {
	constructor(table, prefs) {
		this.table = table
		this.prefs = prefs
		this.scope = new Scope(null)

		this.main_fun = null
	}

	check(ast) {
		this.stmts(ast.body)

		ast.main_fun = this.main_fun
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
		this.attributes(stmt)

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

	array_init(node) {
		if (node.type) {
			return node.type
		}

		node.exprs.forEach((expr) => {
			const typ = this.expr(expr)
			if (node.elem_type) {
				if (typ !== node.elem_type) {
					throw new Error(`type ${typ} not matches ${node.elem_type}`)
				}
			} else {
				node.elem_type = typ
			}
		})

		node.typ = this.table.register({
			kind: 'array',
			name: `[]${this.table.sym(node.elem_type).name}`,
			elem_type: node.elem_type,
		})
		return node.typ
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

	attributes(node) {
		node.attrs.forEach(attr => {
			const def = ATTRS[attr.name]
			if (!def) {
				throw new Error(`unknown attribute @${attr.name}`)
			}

			if (def.applies !== node.kind) {
				throw new Error(`attribute @${attr.name} does not apply to ${node.kind}`)
			}

			if (def.max != -1) {
				if (def.max == 0) {
					throw new Error(`attribute @${attr.name} used too often`)
				}
				def.max--
			}

			def.check(this, node)
		})
	}
}

export { Checker }
