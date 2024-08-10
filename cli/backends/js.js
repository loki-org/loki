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
		const mut = node.left.is_mut ? 'let' : 'const'
		this.write(`${mut} ${node.left.name} = `)
		this.expr(node.right)
		this.writeln('')
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

	struct_decl(node) {
		if (node.pub) {
			this.pub_syms.push(node.name)
			this.alt_out += `export class ${node.name}{\n`
			let constructor = '\tconstructor(params?: {'
			node.fields.forEach((field, i) => {
				this.alt_out += `\t${field.name}: ${this.type(field.type)}\n`
				constructor += `${field.name}?: ${this.type(field.type)}`
				if (i < node.fields.length - 1) {
					constructor += '; '
				}
			})
			constructor += '})\n'
			this.alt_out += constructor
			this.alt_out += '}\n'
		}

		this.writeln(`class ${node.name} {`)
		this.indent++

		this.write('constructor({')
		node.fields.forEach((field, i) => {
			this.write(field.name)
			if (i < node.fields.length - 1) {
				this.write(', ')
			}
		})
		this.writeln('} = {}) {')
		node.fields.forEach((field) => {
			this.indent++
			this.writeln(`this.${field.name} = ${field.name}`)
			this.indent--
		})
		this.writeln('}')

		this.indent--
		this.writeln('}')
	}

	array_init(node) {
		this.write('new Array()')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	struct_init(node) {
		this.write(`new ${node.name}({`)
		node.fields.forEach((field, i) => {
			this.write(field.name)
			this.write(': ')
			this.expr(field.expr)
			if (i < node.fields.length - 1) {
				this.write(', ')
			}
		})
		this.write('})')
	}

	type(t) {
		const sym = this.table.sym(t)

		if (sym.kind === 'array') {
			return `${this.type(sym.elem)}[]`
		}

		switch(t) {
			case IDXS.void:
				return 'void'
			case IDXS.i32:
			case IDXS.u32:
			case IDXS.f64:
				return 'number'
			default:
				return sym.name
		}
	}
}

export { Gen }
