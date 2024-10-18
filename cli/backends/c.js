// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'
import { IDXS } from '../table.js'
import { BaseRunner } from '../runner.js'

class Gen extends BaseGen {
	setup() {
		this.backend = 'c'
		this.alt_name = this.file_name.replace('.lo', '.h')
		this.semi = ';'
	}

	pre_stage() {
		this.header_out += `#include "${this.alt_name}"\n`

		this.alt_out = this.line_comment(this.LOKI_HEADER)
		this.alt_out += '#pragma once\n\n'
		this.alt_out += '#include <stdint.h>\n'
		this.alt_out += '#include <glib.h>\n' // TODO:high only include if needed
		this.alt_out += '\n'
	}

	assign_stmt(node) {
		if (node.op === 'decl_assign') {
			this.decl_assign(node)
			return
		}

		this.expr(node.left)
		this.write(` ${this.op(node.op)} `)
		this.expr(node.right)
		this.writeln(';')
	}

	decl_assign(node) {
		this.write(`${this.type(node.left.obj)} ${node.left.name} = `)
		this.expr(node.right)
		this.writeln(';')
	}

	const_decl(node) {
		this.alt_out += `#define ${node.name} `
		this.alt_out += this.expr_string(node.expr)
		this.alt_out += '\n'
	}

	fun_decl(node) {
		let sig = `${this.type(node.return_type)} ${node.name}(`
		for (let i = 0; i < node.params.length; i++) {
			const param = node.params[i]
			sig += `${this.type(param.type)} ${param.name}`
			if (i < node.params.length - 1) {
				sig += ', '
			}
		}
		sig += ')'
		this.alt_out += sig + ';\n'
		this.write(sig)
		this.writeln(` {`)
		this.stmts(node.body)
		this.writeln('}')
	}

	struct_decl(node) {
		this.alt_out += 'typedef struct {\n'
		for (const field of node.fields) {
			this.alt_out += `\t${this.type(field.type)} ${field.name};\n`
		}
		this.alt_out += `} ${node.name};\n`
	}

	array_init(node) {
		throw new Error('TODO helper function for array init from C array')
		// const sym = this.table.sym(node.type)
		// const typ = this.type(node.type)
		// this.write(`g_array_sized_new(FALSE, FALSE, sizeof(${typ}), ${node.exprs.length})`)

		// for (let i = 0; i < node.exprs.length; i++) {
		// 	this.write(`g_array_index(TODO, ${typ}, ${i}) = `)
		// 	this.expr(node.exprs[i])
		// }
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	struct_init(node) {
		const inited_fields = node.fields.map(f => f.name)

		const def = this.table.sym(node.type)
		this.write(`(${def.name}){`)
		def.fields.forEach((field, i) => {
			this.write(`.${field.name} = `)

			const init_idx = inited_fields.indexOf(field.name)
			if (init_idx === -1) {
				this.write('0')
			} else {
				this.expr(node.fields[init_idx].expr)
			}
			if (i < def.fields.length - 1) {
				this.write(', ')
			}
		})
		this.write('}')
	}

	type(t) {
		const sym = this.table.sym(t)

		if (sym.kind === 'array') {
			return `GArray*`
		}

		switch(t) {
			case IDXS.void:
				return 'void'
			case IDXS.bool:
				return 'bool'
			case IDXS.i32:
				return 'int32_t'
			case IDXS.u8:
				return 'uint8_t'
			case IDXS.u32:
				return 'uint32_t'
			case IDXS.f64:
				return 'double'
			default:
				return sym.name
		}
	}
}

class Runner extends BaseRunner {}

export { Gen, Runner }
