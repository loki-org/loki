// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from '../table.js'
import { BaseGen } from '../gen.js'

class Gen extends BaseGen {
	pub_syms = []

	setup() {
		this.alt_name = 'index.d.ts'
	}

	pre_stage() {
		this.alt_out = this.line_comment(this.LOKI_HEADER)
		// TODO headers: library name, version
		//   see https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html#library-file-layout
	}

	post_stage() {
		this.footer_out = `export { ${this.pub_syms.join(', ')} }`
	}

	const_decl(node) {
		if (node.pub) {
			this.pub_syms.push(node.name)
			const typ = this.type(node.type)
			this.alt_out += `export const ${node.name}: ${typ}\n`
		}

		this.write(`const ${node.name} = `)
		this.expr(node.expr)
		this.writeln('')
	}

	fun_decl(node) {
		if (node.pub) {
			this.pub_syms.push(node.name)
			this.alt_out += `export function ${node.name}(`
			for (let i = 0; i < node.params.length; i++) {
				const param = node.params[i]
				this.alt_out += `${param.name}: ${this.type(param.type)}`
				if (i < node.params.length - 1) {
					this.alt_out += ', '
				}
			}
			this.alt_out += `): ${this.type(node.return_type)}\n`
		}

		this.write(`function ${node.name}(`)
		const param_list = []
		for (const param of node.params) {
			param_list.push(param.name)
		}
		this.write(param_list.join(', '))
		this.writeln(`) {`)
		this.stmts(node.body)
		this.writeln('}')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	type(t) {
		if (t === IDXS.void) {
			return 'void'
		}
		if (t >= IDXS.i32 && t <= IDXS.u32) {
			return 'number'
		}
		return 'any'
	}
}

export { Gen }
