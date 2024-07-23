// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'
import { IDXS } from '../table.js'

class Gen extends BaseGen {
	setup() {
		this.alt_name = this.file_name.replace('.lo', '.h')
	}

	pre_stage() {
		this.header_out += `#include "${this.alt_name}"\n`

		this.alt_out = this.line_comment(this.LOKI_HEADER)
		this.alt_out += '#pragma once\n\n'
		this.alt_out += '#include <stdint.h>\n'
		this.alt_out += '\n'
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

	cast_expr(node) {
		this.expr(node.expr)
	}

	type(t) {
		switch(t) {
			case IDXS.void:
				return 'void'
			case IDXS.i32:
				return 'int32_t'
			case IDXS.u32:
				return 'uint32_t'
			default:
				return 'void*'
		}
	}
}

export { Gen }
