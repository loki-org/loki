// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

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
			case 'fun': {
				this.fun(stmt)
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
			case 'bool': {
				this.bool(expr)
				break
			}
			case 'ident': {
				this.write(expr.name)
				break
			}
			case 'infix': {
				this.infix(expr)
				break
			}
			case 'integer': {
				this.write(expr.value)
				break
			}
			case 'map_init': {
				this.map_init(expr)
				break
			}
			default:
				throw new Error(`cannot gen ${expr.kind}`)
		}
	}

	bool(expr) {
		this.write(expr.value ? 'true' : 'false')
	}

	infix(expr) {
		this.expr(expr.left)
		this.write(' ')
		this.write(this.tok_repr(expr.op))
		this.write(' ')
		this.expr(expr.right)
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

	fun(fn) {
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

	map_init(expr) {
		throw new Error('Not implemented')
	}

	type(t) {
		throw new Error('Not implemented')
	}

	tok_repr(kind) {
		switch(kind) {
			case 'plus':
				return '+'
			case 'minus':
				return '-'
			case 'mul':
				return '*'
			case 'div':
				return '/'
			case 'assign':
				return '='
			case 'decl_assign':
				return '='
			case 'plus_assign':
				return '+='
			case 'minus_assign':
				return '-='
			case 'mul_assign':
				return '*='
			case 'div_assign':
				return '/='
			default:
				throw new Error(`cannot represent ${kind}`)
		}
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

export { BaseGen }
