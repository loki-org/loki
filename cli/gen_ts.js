// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { BaseGen } from './gen.js'

class TsGen extends BaseGen {
	post_stage() {
		this.footer = `export { ${this.pub_syms.join(', ')} }`
	}

	assign(stmt) {
		if (stmt.left.kind === 'index') {
			this.index_set(stmt.left, stmt.right)
			return
		}

		if (stmt.op === 'decl_assign') {
			if (stmt.left.is_mut) {
				this.write('let ')
			} else {
				this.write('const ')
			}
		}
		this.expr(stmt.left)
		this.write(' ')
		this.write(this.tok_repr(stmt.op))
		this.write(' ')
		this.expr(stmt.right)
		this.writeln('')
	}

	fun(fn) {
		if (fn.is_alias || fn.is_method) {
			return
		}

		if (fn.is_pub) {
			this.pub_syms.push(fn.name)
		}

		this.write('function ')
		this.fun_or_method(fn)
	}

	fun_or_method(fn) {
		const ret_type = this.type(fn.return_type)
		this.write(`${fn.name}(`)
		this.params(fn.params)
		this.writeln(`): ${ret_type} {`)

		if (fn.is_method) {
			const rec_assign_this = {
				kind: 'assign',
				op: 'decl_assign',
				left: {
					kind: 'ident',
					name: fn.receiver.name,
					type: fn.receiver_type,
				},
				right: {
					kind: 'ident',
					name: 'this',
					type: fn.receiver_type,
				},
			}
			fn.body = [rec_assign_this, ...fn.body]
		}

		this.stmts(fn.body)
		this.writeln('}\n')
	}

	params(params) {
		const param_list = []
		for (const param of params) {
			param_list.push(`${param.name}: ${this.type(param.type)}`)
		}
		this.write(param_list.join(', '))
	}

	return_stmt(stmt) {
		this.write('return ')
		this.expr(stmt.expr)
		this.writeln('')
	}

	struct_decl(stmt) {
		if (stmt.is_pub) {
			this.pub_syms.push(stmt.name)
		}

		const sym = this.table.sym(stmt.type)

		this.writeln(`class ${stmt.name} {`)
		this.indent++

		// TODO fields

		sym.methods.forEach((method) => {
			this.fun_or_method(method)
		})

		this.indent--
		this.writeln(`}\n`)
	}

	array_init(node) {
		if (node.exprs.length === 0) {
			this.write(`new Array<${this.type(node.elem_type)}>()`)
			return
		}

		this.write('[')
		for (let i = 0; i < node.exprs.length; i++) {
			this.expr(node.exprs[i])
			if (i < node.exprs.length - 1) {
				this.write(', ')
			}
		}
		this.write(']')
	}

	index_get(expr) {
		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'array') {
			this.expr(expr.left)
			this.write('[')
			this.expr(expr.index)
			this.write(']')
			return
		}

		if (lsym.kind === 'map') {
			this.expr(expr.left)
			this.write('.get(')
			this.expr(expr.index)
			this.write(')')
			return
		}

		throw new Error(`Cannot get index of ${lsym.kind}`)
	}

	index_set(expr, value) {
		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'array') {
			this.expr(expr.left)
			this.write('[')
			this.expr(expr.index)
			this.write('] = ')
			this.expr(value)
			this.writeln('')
			return
		}

		if (lsym.kind === 'map') {
			this.expr(expr.left)
			this.write('.set(')
			this.expr(expr.index)
			this.write(', ')
			this.expr(value)
			this.writeln(')')
			return
		}

		throw new Error('This should never happen')
	}

	map_init(expr) {
		this.write(`new Map<${this.type(expr.key_type)}, ${this.type(expr.val_type)}>()`)
	}

	method_call(expr) {
		this.expr(expr.left)
		this.write('.')
		this.fun_call(expr)
	}

	string(expr) {
		const quote = expr.value.includes('\n') ? '`' : '"'
		this.write(`${quote}${expr.value}${quote}`)
	}

	struct_init(expr) {
		// TODO fields
		this.write(`new ${expr.name}()`)
	}

	gen_main(name, with_args) {
		if (with_args) {
			this.writeln(`${name}(process.argv)`)
			return
		}

		this.writeln(`${name}()`)
	}

	type(t) {
		switch (t) {
			case IDXS.i32:
			case IDXS.u8:
				return 'number'
			case IDXS.bool:
				return 'boolean'
			default:
				break
		}

		const sym = this.table.sym(t)
		if (sym.kind === 'array') {
			return this.type(sym.elem_type) + '[]'
		}
		if (sym.kind === 'map') {
			return `Map<${this.type(sym.key_type)}, ${this.type(sym.val_type)}>`
		}
		return sym.name
	}
}

export { TsGen }
