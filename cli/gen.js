// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from './types.js'

class BaseGen {
	constructor(table) {
		this.table = table
		this.out = ''

		if (this.constructor === BaseGen) {
			throw new Error('Cannot instantiate BaseGen')
		}
	}

	gen(ast) {
		this.stmts(ast.body)
		return this.out
	}

	stmts(stmts) {
		for (const stmt of stmts) {
			this.stmt(stmt)
		}
	}

	stmt(stmt) {
		switch (stmt.kind) {
			case 'fn': {
				this.fn(stmt)
				break
			}
			default:
				throw new Error(stmt.kind)
		}
	}

	fn(fn) {
		throw new Error('Not implemented')
	}

	params(params) {
		throw new Error('Not implemented')
	}

	type(t) {
		throw new Error('Not implemented')
	}

	write(s) {
		this.out += s
	}

	writeln(s) {
		this.out += s + '\n'
	}
}

class CGen extends BaseGen {
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

	type(t) {
		switch (t) {
			case IDXS.i32:
				return 'int'
			default:
				break
		}
		return this.table.sym(t).name
	}
}

class TsGen extends BaseGen {
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

	type(t) {
		switch (t) {
			case IDXS.i32:
				return 'number'
			default:
				break
		}
		return this.table.sym(t).name
	}
}

export { CGen, TsGen }
