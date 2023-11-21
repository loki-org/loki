// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { Scope } from './scope.js'
import { BACKENDS } from './backends.js'

const ATTRS = {
	'main': {
		applies: 'fun',
		max: 1,
		check: (checker, fun) => {
			if (fun.return_type !== IDXS.void) {
				throw new Error(`main function cannot return a value`)
			}

			if (fun.params.length === 1) {
				const sym = checker.table.sym(fun.params[0].type)
				if (sym.kind !== 'array' || sym.elem_type !== IDXS.string) {
					throw new Error(`main function must have no params or "args []string"`)
				}
			} else if (fun.params.length > 1) {
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
		this.root_scope = null
		this.scope = new Scope(null)

		this.main_fun = null
	}

	open_scope() {
		this.scope = new Scope(this.scope)
	}

	close_scope() {
		this.scope = this.scope.parent
	}

	check(ast) {
		this.root_scope = ast.root_scope

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
			case 'hash': {
				this.hash_stmt(stmt)
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
			this.scope.register(stmt.left.name, {
				type: stmt.type,
				is_mut: stmt.left.is_mut,
			})
			this.expr(stmt.left)
			return
		}

		const ltype = this.expr(stmt.left)
		const rtype = this.expr(stmt.right)

		if (stmt.left.kind === 'ident' && !stmt.left.is_mut) {
			throw new Error(`cannot assign to immutable ${stmt.left.name}`)
		}
		// TODO mut check for index expr

		if (ltype !== rtype) {
			throw new Error(`cannot assign ${rtype} to ${ltype}`)
		}
	}

	fun(stmt) {
		this.attributes(stmt)

		this.open_scope()
		this.params(stmt.params)
		this.stmts(stmt.body)
		this.close_scope()
	}

	params(params) {
		for (const param of params) {
			this.scope.register(param.name, {
				type: param.type,
			})
		}
	}

	hash_stmt(stmt) {
		if (!Object.keys(BACKENDS).includes(stmt.lang)) {
			throw new Error(`backend ${stmt.lang} does not exist`)
		}
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
			case 'call': {
				return this.call_expr(expr)
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

	call_expr(expr) {
		const def = this.root_scope.find(expr.name)
		if (def === null) {
			throw new Error(`unknown function ${expr.name}`)
		}

		if (def.params.length !== expr.args.length) {
			throw new Error(`got ${expr.args.length} args, expected ${def.params.length}`)
		}

		def.params.forEach((arg, i) => {
			const typ = this.expr(expr.args[i])
			if (arg.type !== typ) {
				throw new Error(`arg ${i} has type ${typ}, expected ${arg.type}`)
			}
		})

		return def.type
	}

	ident(expr) {
		const def = this.scope.find(expr.name)
		if (def === null) {
			throw new Error(`unknown identifier ${expr.name}`)
		}
		expr.is_mut = def.is_mut
		return def.type
	}

	index_expr(expr) {
		expr.left_type = this.expr(expr.left)
		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'array') {
			const idx_type = this.expr(expr.index)
			if (idx_type !== IDXS.i32) {
				throw new Error(`cannot use ${idx_type} as i32`)
			}

			return lsym.elem_type
		}

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
