// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'
import { IDXS } from '../table.js'

class Gen extends BaseGen {
	setup() {
		this.comment_sign = '#'
	}

	const_decl(node) {
		this.write(`${node.name} = `)
		this.expr(node.expr)
		this.writeln('')
	}

	fun_decl(node) {
		this.write(`def ${node.name}(`)
		for (let i = 0; i < node.params.length; i++) {
			const param = node.params[i]
			this.write(`${param.name}: ${this.type(param.type)}`)
			if (i < node.params.length - 1) {
				this.write(', ')
			}
		}
		this.writeln(`) -> ${this.type(node.return_type)}:`)
		this.stmts(node.body)
		if (node.body.length === 0) {
			this.indent++
			this.writeln('pass')
			this.indent--
		}
	}

	struct_decl(node) {
		this.writeln(`class ${node.name}:`)
		this.writeln('\tpass')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	type(t) {
		switch(t) {
			case IDXS.void:
				return 'void'
			case IDXS.i32:
			case IDXS.u32:
				return 'int'
			default:
				return 'Any'
		}
	}
}

export { Gen }
