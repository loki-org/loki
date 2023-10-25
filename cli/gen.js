// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as url from 'url';
import * as fs from 'fs'
import * as path from 'path'
import { IDXS } from './types.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const LOKI_NOTE = 'Generated by Loki (https://github.com/loki-org/loki). Do not edit.\n'

class BaseGen {
	constructor(table) {
		this.table = table
		this.line_start = true
		this.indent = -1
		this.imports = new Set()
		this.headers = ''
		this.out = ''

		this.headers += this.comment_str(LOKI_NOTE)

		if (this.constructor === BaseGen) {
			throw new Error('Cannot instantiate BaseGen')
		}
	}

	gen(ast) {
		this.stmts(ast.body)

		for (const imp of this.imports) {
			this.import(imp)
		}

		return this.headers + '\n' + this.out
	}

	stmts(stmts) {
		this.indent++
		for (const stmt of stmts) {
			this.stmt(stmt)
		}
		this.indent--
	}

	stmt(stmt) {
		switch (stmt.kind) {
			case 'assign': {
				this.assign(stmt)
				break
			}
			case 'comment': {
				this.writeln(this.comment_str(stmt.text))
				break
			}
			case 'fn': {
				this.fn(stmt)
				break
			}
			case 'return': {
				this.return_stmt(stmt)
				break
			}
			case 'expr': {
				this.expr(stmt.expr)
				break
			}
			default:
				throw new Error(`cannot gen ${stmt.kind}`)
		}
	}

	expr(expr) {
		switch (expr.kind) {
			case 'array_init': {
				this.array_init(expr)
				break
			}
			case 'ident': {
				this.write(expr.name)
				break
			}
			case 'integer': {
				this.write(expr.value)
				break
			}
			default:
				throw new Error(`cannot gen ${expr.kind}`)
		}
	}

	comment_str(text) {
		const s = text.startsWith(' ') ? '' : ' '
		return `//${s}${text}`
	}

	import(imp) {
		throw new Error('Not implemented')
	}

	assign(stmt) {
		throw new Error('Not implemented')
	}

	fn(fn) {
		throw new Error('Not implemented')
	}

	params(params) {
		throw new Error('Not implemented')
	}

	return_stmt(stmt) {
		throw new Error('Not implemented')
	}

	array_init(expr) {
		throw new Error('Not implemented')
	}

	type(t) {
		throw new Error('Not implemented')
	}

	write_indent() {
		if (this.line_start) {
			this.out += '\t'.repeat(this.indent)
			this.line_start = false
		}
	}

	write(s) {
		this.write_indent()
		this.out += s
	}

	writeln(s) {
		this.write_indent()
		this.out += s + '\n'
		this.line_start = true
	}
}

class CGen extends BaseGen {
	import(imp) {
		this.headers += `#include ${imp}\n`

		if (imp.startsWith('"')) {
			const root = path.join(__dirname, '..')
			const fname = imp.replaceAll('"', '')
			fs.copyFileSync(`${root}/lib/${fname}`, `${root}/out/${fname}`)
		}
	}

	assign(stmt) {
		if (stmt.op === 'decl_assign') {
			this.write(this.type(stmt.type))
			this.write(' ')
		}
		this.expr(stmt.left)
		this.write(' = ')
		this.expr(stmt.right)
		this.writeln(';')
	}

	fn(fn) {
		const ret_type = this.type(fn.return_type)
		this.write(`${ret_type} ${fn.name}(`)
		this.params(fn.params)
		this.writeln(') {')
		this.stmts(fn.body)
		this.writeln('}')
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

	type(t) {
		switch (t) {
			case IDXS.i32:
				return 'int'
			case IDXS.u8:
				this.imports.add('<stdint.h>')
				return 'uint8_t'
			default:
				break
		}

		const sym = this.table.sym(t)
		if (sym.kind === 'array') {
				this.imports.add('"array.h"')
				return 'Array(' + this.type(sym.elem_type) + ')'
		}
		return sym.name
	}
}

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
		this.write(' = ')
		this.expr(stmt.right)
		this.writeln('')
	}

	fn(fn) {
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

export { CGen, TsGen }
