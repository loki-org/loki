// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from "./table.js"
import { Env, Scope } from "./scope.js"
import { is_comparison } from "./lexer.js"

const ATTRS = {
	'main': {
		check: (checker, fun) => {
			checker.main_fun_name = fun.name
		},
	},
}

class Sema {
	main_fun_name = ''

	constructor(table) {
		this.table = table
		this.scope = this.table.global_scope
		this.env = new Env()
	}

	check(ast) {
		this.stmts(ast.body)

		ast.main_fun_name = this.main_fun_name
	}

	stmts(stmts) {
		for (const stmt of stmts) {
			this.stmt(stmt)
		}
	}

	stmt(stmt) {
		switch (stmt.kind) {
			case 'assign':
				this.assign_stmt(stmt)
				break
			case 'const_decl':
				this.const_decl(stmt)
				break
			case 'for_classic':
				this.for_classic_loop(stmt)
				break
			case 'fun_decl':
				this.fun_decl(stmt)
				break
			case 'return_stmt':
				this.return_stmt(stmt)
				break
			case 'struct_decl':
				this.struct_decl(stmt)
				break
			case 'struct_impl':
				this.struct_impl(stmt)
				break
			default:
				this.expr(stmt)
				break
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

	for_classic_loop(node) {
		this.open_scope()
		this.stmt(node.init)
		this.expr(node.cond)
		this.stmt(node.step)
		this.stmts(node.body)
		this.close_scope()
	}

	fun_decl(node) {
		this.attributes(node)

		this.open_scope()
		for (const param of node.params) {
			this.scope.insert(param.name, param.type)
		}
		this.stmts(node.body)
		this.close_scope()
	}

	return_stmt(node) {
		this.expr(node.expr)
	}

	struct_decl(node) {
		// no checks yet
	}

	struct_impl(node) {
		this.env.impl_type = node.type
		for (const fun of node.methods) {
			this.fun_decl(fun)
		}
		this.env.impl_type = -1
	}

	expr(node) {
		switch (node.kind) {
			case 'array_init':
				return this.array_init(node)
			case 'call_expr':
				return this.call_expr(node)
			case 'cast_expr':
				return this.cast_expr(node)
			case 'expr_in_parens':
				return this.expr(node.expr)
			case 'ident':
				return this.ident(node)
			case 'if':
				return this.if_expr(node)
			case 'index':
				return this.index_expr(node)
			case 'infix':
				return this.infix_expr(node)
			case 'integer':
				return IDXS.i32
			case 'prefix':
				return this.prefix_expr(node)
			case 'selector':
				return this.selector_expr(node)
			case 'self':
				return this.env.impl_type
			case 'struct_init':
				return this.struct_init(node)
			default:
				throw new Error(`cannot check ${node.kind}`)
		}
	}

	array_init(node) {
		// Type only init
		if (node.exprs.length === 0) {
			return node.type
		}

		const elem_type = this.expr(node.exprs[0])
		for (let i = 1; i < node.exprs.length; i++) {
			this.expr(node.exprs[i])
			// TODO check elem type matches
		}
		node.type = this.table.find_array(elem_type)

		return node.type
	}

	call_expr(node) {
		let def = null

		if (node.is_method) {
			const left_type = this.expr(node.left)
			const sym = this.table.sym(left_type)
			for (const method of sym.methods) {
				if (method.name === node.name) {
					def = method
				}
			}
		} else {
			def = this.table.global_scope.lookup(node.name)
		}

		for (const arg of node.args) {
			this.expr(arg)
		}

		return def.return_type
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

	if_expr(node) {
		for (const branch of node.branches) {
			if (branch.cond) {
				this.expr(branch.cond)
				this.stmts(branch.stmts)
			}
		}
		return IDXS.void
	}

	index_expr(node) {
		const left_type = this.expr(node.left)
		this.expr(node.index)

		const sym = this.table.sym(left_type)
		if (sym.kind === 'array') {
			return sym.elem
		}

		throw new Error(`cannot index ${left_type}`)
	}

	infix_expr(node) {
		const left_type = this.expr(node.left)
		this.expr(node.right)

		if (is_comparison(node.op)) {
			return IDXS.bool
		}

		return left_type
	}

	prefix_expr(node) {
		return this.expr(node.expr)
	}

	selector_expr(node) {
		const left_type = this.expr(node.left)
		const sym = this.table.sym(left_type)
		let def = null
		for (const field of sym.fields) {
			if (field.name === node.name) {
				def = field
			}
		}
		return def.type
	}

	struct_init(node) {
		node.type = this.table.indexes.get(node.name)
		// TODO check struct exists
		for (const field of node.fields) {
			// TODO check field exists
			// TODO check type matches
			this.expr(field.expr)
		}
		return node.type
	}

	attributes(node) {
		node.attrs.forEach((attr) => {
			const def = ATTRS[attr.name]
			if (!def) {
				throw new Error(`unknown attribute @${attr.name}`)
			}

			def.check(this, node)
		})
	}

	open_scope() {
		this.scope = new Scope(this.scope)
	}

	close_scope() {
		this.scope = this.scope.parent
	}
}

export { Sema }
