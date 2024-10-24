// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from '../table.js'
import { BaseGen } from '../gen.js'
import { BaseRunner } from '../runner.js'

class Gen extends BaseGen {
	pub_syms = []

	setup() {
		this.backend = 'js'
		this.alt_name = 'index.d.ts'
	}

	pre_stage() {
		this.alt_out = this.line_comment(this.LOKI_HEADER)
		// TODO:low headers: library name, version
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

		if (!this.for_loop_head) {
			this.writeln('')
		}
	}

	decl_assign(node) {
		const mut = node.left.is_mut ? 'let' : 'const'
		this.write(`${mut} ${node.left.name} = `)
		this.expr(node.right)

		if (!this.for_loop_head) {
			this.writeln('')
		}
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

	for_classic_loop(node) {
		this.for_loop_head = true
		this.write('for (')
		node.init.left.is_mut = true
		this.stmt(node.init)
		this.write('; ')
		this.expr(node.cond)
		this.write('; ')
		this.stmt(node.step)
		this.for_loop_head = false

		this.writeln(') {')
		this.stmts(node.body)
		this.writeln('}')
	}

	fun_decl(node) {
		if (node.pub) {
			this.pub_syms.push(node.name)
			this.alt_out += `export function `
		}

		this.write(`function `)
		this.fun_body(node)
	}

	fun_body(node) {
		if (node.pub) {
			this.alt_out += `${node.name}(`
			for (let i = 0; i < node.params.length; i++) {
				const param = node.params[i]
				this.alt_out += `${param.name}: ${this.type(param.type)}`
				if (i < node.params.length - 1) {
					this.alt_out += ', '
				}
			}
			this.alt_out += `): ${this.type(node.return_type)}\n`
		}


		this.write(node.name)
		this.write('(')
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

		const sym = this.table.sym(node.type)
		sym.methods.forEach((method) => {
			// TODO fix missing indent if pub
			this.fun_body(method)
		})

		this.indent--
		this.writeln('}')

		if (node.pub) {
			this.alt_out += '}\n'
		}
	}

	struct_impl(node) {
		// Handled by struct_decl
	}

	array_init(node) {
		this.write('new Array(')
		node.exprs.forEach((expr, i) => {
			this.expr(expr)
			if (i < node.exprs.length - 1) {
				this.write(', ')
			}
		})
		this.write(')')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	if_expr(node) {
		node.branches.forEach((branch, i) => {
			if (branch.cond) {
				this.write('if (')
				this.expr(branch.cond)
				this.write(') ')
			}

			this.writeln('{')
			this.stmts(branch.stmts)
			this.write('}')

			if (i < node.branches.length - 1) {
				this.write(' else ')
			}
		})
		this.writeln('')
	}

	index_expr(node) {
		this.expr(node.left)
		this.write('[')
		this.expr(node.index)
		this.write(']')
	}

	selector_expr(node) {
		this.expr(node.left)
		this.write(`.${node.name}`)
	}

	self_expr(node) {
		this.write('this')
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

	op(kind) {
		switch (kind) {
			case 'eq':
				return '==='
			case 'ne':
				return '!=='
			default:
				return super.op(kind)
		}
	}

	type(t) {
		const sym = this.table.sym(t)

		if (sym.kind === 'array' || sym.kind === 'array_fixed') {
			return `${this.type(sym.elem)}[]`
		}

		switch(t) {
			case IDXS.void:
				return 'void'
			case IDXS.bool:
				return 'boolean'
			case IDXS.i32:
			case IDXS.u8:
			case IDXS.u32:
			case IDXS.f64:
				return 'number'
			default:
				return sym.name
		}
	}

	call_main(name) {
		this.writeln(`${name}()`)
	}
}

class Runner extends BaseRunner {
	get_run_command(path) {
		return `node ${path}`
	}
}

export { Gen, Runner }
