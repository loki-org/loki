// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { BaseGen } from './gen.js'

class CGen extends BaseGen {
	constructor(table, prefs) {
		super(table, prefs)
		this.imports.add('<stdbool.h>')
	}

	import(imp) {
		this.headers += `#include ${imp}\n`
	}

	assign(stmt) {
		if (stmt.left.kind === 'index') {
			this.index_set(stmt.left, stmt.right)
			return
		}

		if (stmt.op === 'decl_assign') {
			this.write(this.type(stmt.type))
			this.write(' ')
		}
		this.expr(stmt.left)
		this.write(' ')
		this.write(this.tok_repr(stmt.op))
		this.write(' ')
		this.expr(stmt.right)
		this.writeln(';')
	}

	fun(fn) {
		const ret_type = this.type(fn.return_type)
		this.write(`${ret_type} ${fn.name}(`)
		this.params(fn.params)
		this.writeln(') {')
		this.stmts(fn.body)
		this.writeln('}\n')
	}

	params(params) {
		const param_list = []
		for (const param of params) {
			param_list.push(`${this.type(param.type)} ${param.name}`)
		}
		this.write(param_list.join(', '))
	}

	return_stmt(stmt) {
		this.write('return ')
		this.expr(stmt.expr)
		this.writeln(';')
	}

	array_init(expr) {
		this.write('NULL')
	}

	index_set(expr, value) {
		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'map') {
			this.write('Map_insert(')
			this.expr(expr.left)
			this.write(', ')
			this.expr(expr.index)
			this.write(`, (${this.type(lsym.val_type)}*)`)
			this.expr(value)
			this.writeln(');')
			return
		}

		throw new Error('This should never happen')
	}

	map_init(expr) {
		this.write('new_Map()')
	}

	string(expr) {
		this.write(`"${expr.value}"`)
	}

	gen_main() {
		this.writeln('int main() {')
		this.writeln('return 0;')
		this.writeln('}')
	}

	type(t) {
		switch (t) {
			case IDXS.i32:
				return 'int'
			case IDXS.u8:
				this.imports.add('<stdint.h>')
				return 'uint8_t'
			case IDXS.string:
				return 'char*'
			default:
				break
		}

		const sym = this.table.sym(t)
		if (sym.kind === 'array') {
			this.imports.add('"array.h"')
			return 'Array(' + this.type(sym.elem_type) + ')'
		}
		if (sym.kind === 'map') {
			this.imports.add('"map.h"')
			return 'Map*'
		}
		return sym.name
	}
}

export { CGen }
