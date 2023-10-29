// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { BaseGen } from './gen.js'

class TsGen extends BaseGen {
	assign(stmt) {
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
		const ret_type = this.type(fn.return_type)
		this.write(`function ${fn.name}(`)
		this.params(fn.params)
		this.writeln(`): ${ret_type} {`)
		this.stmts(fn.body)
		this.writeln('}')
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

	array_init(expr) {
		this.write(`new Array<${this.type(expr.elem_type)}>()`)
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
		return sym.name
	}
}

export { TsGen }