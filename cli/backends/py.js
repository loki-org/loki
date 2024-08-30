// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'
import { IDXS } from '../table.js'

class Gen extends BaseGen {
	setup() {
		this.comment_sign = '#'
	}

	assign_stmt(node) {
		if (node.op === 'decl_assign') {
			this.decl_assign(node)
			return
		}

		this.expr(node.left)
		this.write(` ${this.op(node.op)} `)
		this.expr(node.right)
		this.writeln('')
	}

	decl_assign(node) {
		this.write(`${node.left.name} = `)
		this.expr(node.right)
		this.writeln('')
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
		this.indent++
		this.write('def __init__(self, ')
		node.fields.forEach((field, i) => {
			this.write(`${field.name}: ${this.type(field.type)}`)
			if (i < node.fields.length - 1) {
				this.write(', ')
			}
		})
		this.writeln('):')
		node.fields.forEach((field) => {
			this.indent++
			this.writeln(`self.${field.name} = ${field.name}`)
			this.indent--
		})
		this.indent--
	}

	array_init(node) {
		if (node.fixed) {
			this.write('[None] * ')
			this.expr(node.exprs[0])
			return
		}

		this.write('[')
		for (const expr of node.exprs) {
			this.expr(expr)
			this.write(', ')
		}
		this.write(']')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	index_expr(node) {
		this.expr(node.left)
		this.write('[')
		this.expr(node.index)
		this.write(']')
	}

	struct_init(node) {
		this.write(`${node.name}(`)
		node.fields.forEach((field, i) => {
			this.write(field.name)
			this.write('=')
			this.expr(field.expr)
			if (i < node.fields.length - 1) {
				this.write(', ')
			}
		})
		this.write(')')
	}

	type(t) {
		const sym = this.table.sym(t)

		if (sym.kind === 'array' || sym.kind === 'array_fixed') {
			return `list[${this.type(sym.elem)}]`
		}

		switch(t) {
			case IDXS.void:
				return 'None'
			case IDXS.bool:
				return 'bool'
			case IDXS.i32:
			case IDXS.u8:
			case IDXS.u32:
				return 'int'
			case IDXS.f64:
				return 'float'
			default:
				return sym.name
		}
	}
}

export { Gen }
