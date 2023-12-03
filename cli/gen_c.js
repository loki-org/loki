// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'
import { BaseGen } from './gen.js'

class CGen extends BaseGen {
	pre_stage() {
		this.semi = ';'
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

		if (!this.for_loop_head) {
			this.writeln(';')
		}
	}

	fun(fn) {
		if (fn.is_alias) {
			return
		}

		if (fn.is_method) {
			fn.name = c_name(this.type(fn.receiver.type)) + '_' + fn.name
			fn.params = [fn.receiver, ...fn.params]
		}

		const ret_type = this.type(fn.return_type)
		this.fun_decls_out += `${ret_type} ${fn.name}(`
		this.write(`${ret_type} ${fn.name}(`)
		this.params(fn.params)
		this.fun_decls_out += ");\n"
		this.writeln(') {')
		this.stmts(fn.body)
		this.writeln('}\n')
	}

	params(params) {
		const param_list = []
		for (const param of params) {
			param_list.push(`${this.type(param.type)} ${param.name}`)
		}
		this.fun_decls_out += param_list.join(', ')
		this.write(param_list.join(', '))
	}

	return_stmt(stmt) {
		this.write('return ')
		this.expr(stmt.expr)
		this.writeln(';')
	}

	struct_decl(stmt) {
		this.type_defs_out += `typedef struct ${stmt.name} {\n`
		stmt.fields.forEach((field) => {
			this.type_defs_out += `\t${this.type(field.type)} ${field.name};\n`
		})
		this.type_defs_out += `} ${stmt.name};\n\n`
	}

	array_init(node) {
		if (node.exprs.length === 0) {
			this.write('NULL')
			return
		}

		const el_name = this.type(node.elem_type)
		this.write(`Array_from_c_array(${el_name}, ((${el_name}[]){`)
		for (let i = 0; i < node.exprs.length; i++) {
			this.expr(node.exprs[i])
			if (i < node.exprs.length - 1) {
				this.write(', ')
			}
		}
		this.write(`}), ${node.exprs.length})`)
	}

	index_get(expr) {
		if (expr.left_type === IDXS.string) {
			this.expr(expr.left)
			this.write('[')
			this.expr(expr.index)
			this.write(']')
			return
		}

		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'array') {
			this.write('Array_get(')
			this.expr(expr.left)
			this.write(', ')
			this.expr(expr.index)
			this.write(')')
			return
		}

		if (lsym.kind === 'map') {
			const val_type = this.type(lsym.val_type)
			this.write(`(${val_type}`)
			if (lsym.val_type === IDXS.i32) {
				this.write(')(__intptr_t')
			}
			this.write(`)Map_get(`)
			this.expr(expr.left)
			this.write(', ')
			this.expr(expr.index)
			this.write(')')
			return
		}

		throw new Error(`Cannot get index of ${lsym.kind}`)
	}

	index_set(expr, value) {
		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'array') {
			this.write('Array_set(')
			this.expr(expr.left)
			this.write(', ')
			this.expr(expr.index)
			this.write(`, `)
			this.expr(value)
			this.writeln(');')
			return
		}

		if (lsym.kind === 'map') {
			const val_sym = this.table.sym(lsym.val_type)
			this.write('Map_insert(')
			this.expr(expr.left)
			this.write(', ')
			this.expr(expr.index)
			if (val_sym.kind === 'struct') {
				this.write(', &')
			} else {
				this.write(`, (${this.type(lsym.val_type)}*)`)
			}
			this.expr(value)
			this.writeln(');')
			return
		}

		throw new Error('This should never happen')
	}

	map_init(expr) {
		this.write('new_Map()')
	}

	method_call(expr) {
		if (expr.is_method) {
			expr.name = c_name(this.type(expr.left_type)) + '_' + expr.name
			expr.args = [expr.left, ...expr.args]
		}

		this.fun_call(expr)
	}

	selector(expr) {
		if (expr.left_type === IDXS.string && expr.name === 'length') {
			this.write('strlen(')
			this.expr(expr.left)
			this.write(')')
			return
		}

		const lsym = this.table.sym(expr.left_type)
		if (lsym.kind === 'array' && expr.name === 'length') {
			this.write('Array_get_length(')
			this.expr(expr.left)
			this.write(')')
			return
		}

		this.expr(expr.left)
		this.write('.')
		this.write(expr.name)
	}

	string(expr) {
		if (expr.value.includes('\n')) {
			const lines = expr.value.split('\n')
			lines.forEach((line, i) => {
				this.write('"')
				this.write(line)
				if (i < lines.length - 1) {
					this.writeln('\\n"')
				} else {
					this.write('"')
				}
			})
			return
		}

		this.write(`"${expr.value}"`)
	}

	struct_init(expr) {
		this.write(`(${this.type(expr.type)}){ `)
		expr.fields.forEach((field, i) => {
			this.write('.')
			this.write(field.name)
			this.write(' = ')
			this.expr(field.value)
			if (i < expr.fields.length - 1) {
				this.write(', ')
			}
		})
		this.write(' }')
	}

	gen_main(name, with_args) {
		this.writeln('int main(int argc, char** argv) {')
		if (with_args) {
			this.writeln(`\t${name}(Array_from_c_array(char*, argv, argc));`)
		} else {
			this.writeln(`\t${name}();`)
		}
		this.writeln('\treturn 0;')
		this.writeln('}')
	}

	type(t) {
		switch (t) {
			case IDXS.any:
				return 'void*'
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

function c_name(name) {
	return name.replaceAll('*', 'ptr').replaceAll('(', '_').replaceAll(')', '_')
}

export { CGen }
