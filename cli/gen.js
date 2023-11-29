// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const LOKI_NOTE = 'Generated by Loki (https://github.com/loki-org/loki). Do not edit.\n'

class BaseGen {
	constructor(table, prefs) {
		this.table = table
		this.prefs = prefs
		this.line_start = true
		this.indent = -1
		this.imports = new Set()
		this.pub_syms = []
		this.semi = ''
		this.headers = ''
		this.out = ''
		this.footer = ''

		this.for_loop_head = false

		this.headers += this.comment_str(LOKI_NOTE)

		if (this.constructor === BaseGen) {
			throw new Error('Cannot instantiate BaseGen')
		}
	}

	gen(asts) {
		this.pre_stage()

		for (const ast of asts) {
			this.gen_file(ast)
		}

		this.post_stage()

		return this.headers + '\n' + this.out + "\n" + this.footer
	}

	gen_file(ast) {
		this.stmts(ast.body)

		for (const imp of this.imports) {
			this.import(imp)
		}

		if (ast.main_fun && ast.main_fun.name.length > 0) {
			this.indent = 0
			this.gen_main(ast.main_fun.name, ast.main_fun.params.length > 0)
		}
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
			case 'for_cond': {
				this.for_cond(stmt)
				break
			}
			case 'for_decl': {
				this.for_decl(stmt)
				break
			}
			case 'fun': {
				this.fun(stmt)
				break
			}
			case 'loop_control': {
				this.loop_control(stmt)
				break
			}
			case 'hash': {
				this.hash_stmt(stmt)
				break
			}
			case 'if': {
				this.if_stmt(stmt)
				break
			}
			case 'return': {
				this.return_stmt(stmt)
				break
			}
			case 'struct_decl': {
				this.struct_decl(stmt)
				break
			}
			case 'expr': {
				this.expr(stmt.expr)
				this.writeln(this.semi)
				break
			}
			case 'skip': {
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
			case 'call': {
				this.call_expr(expr)
				break
			}
			case 'ident': {
				this.write(expr.name)
				break
			}
			case 'index': {
				this.index_get(expr)
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
			case 'selector': {
				this.selector(expr)
				break
			}
			case 'string': {
				this.string(expr)
				break
			}
			case 'struct_init': {
				this.struct_init(expr)
				break
			}
			default:
				throw new Error(`cannot gen ${expr.kind}`)
		}
	}

	for_cond(stmt) {
		this.write('while (')
		this.expr(stmt.cond)
		this.writeln(') {')
		this.stmts(stmt.body)
		this.writeln('}')
	}

	for_decl(stmt) {
		this.for_loop_head = true
		this.write('for (')
		this.stmt(stmt.init)
		this.write('; ')
		this.expr(stmt.cond)
		this.write('; ')
		this.stmt(stmt.step)
		this.writeln(') {')
		this.for_loop_head = false
		this.stmts(stmt.body)
		this.writeln('}')
	}

	loop_control(stmt) {
		this.write(stmt.control === 'key_break' ? 'break' : 'continue')
		this.writeln(this.semi)
	}

	hash_stmt(stmt) {
		if (stmt.lang !== this.prefs.backend) {
			return
		}

		this.writeln(stmt.value)
	}

	if_stmt(stmt) {
		if (stmt.is_comptime) {
			this.comptime_if(stmt)
			return
		}

		stmt.branches.forEach((branch, i) => {
			if (branch.cond) {
				this.write('if (')
				this.expr(branch.cond)
				this.write(') ')
			}

			this.writeln('{')
			this.stmts(branch.body)
			this.write('}')

			if (i < stmt.branches.length - 1) {
				this.write(' else ')
			}
		})
		this.writeln('')
	}

	comptime_if(stmt) {
		let gen_else = true

		this.indent--
		stmt.branches.forEach((branch, i) => {
			if (branch.cond) {
				if (branch.cond.name !== this.prefs.backend) {
					return
				}
				gen_else = false
			} else if (!gen_else) {
				return
			}
			this.stmts(branch.body)
		})
		this.indent++
		this.writeln('')
	}

	bool(expr) {
		this.write(expr.value ? 'true' : 'false')
	}

	call_expr(expr) {
		if (expr.is_method) {
			this.method_call(expr)
			return
		}

		this.fun_call(expr)
	}

	fun_call(expr) {
		this.write(expr.name)
		this.write('(')
		expr.args.forEach((arg, i) => {
			this.expr(arg)
			if (i < expr.args.length - 1) {
				this.write(', ')
			}
		})
		this.write(')')
	}

	infix(expr) {
		this.expr(expr.left)
		this.write(' ')
		this.write(this.tok_repr(expr.op.kind))
		this.write(' ')
		this.expr(expr.right)
	}

	comment_str(text) {
		const s = text.startsWith(' ') ? '' : ' '
		return `//${s}${text}`
	}

	pre_stage() {
		// Do nothing by default
	}

	post_stage() {
		// Do nothing by default
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

	struct_decl(stmt) {
		throw new Error('Not implemented')
	}

	array_init(expr) {
		throw new Error('Not implemented')
	}

	index_get(expr) {
		throw new Error('Not implemented')
	}

	index_set(expr, value) {
		throw new Error('Not implemented')
	}

	map_init(expr) {
		throw new Error('Not implemented')
	}

	method_call(expr) {
		throw new Error('Not implemented')
	}

	selector(expr) {
		throw new Error('Not implemented')
	}

	string(expr) {
		throw new Error('Not implemented')
	}

	struct_init(expr) {
		throw new Error('Not implemented')
	}

	type(t) {
		throw new Error('Not implemented')
	}

	gen_main(name, with_args) {
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
			case 'and':
				return '&&'
			case 'or':
				return '||'
			case 'eq':
				return '=='
			case 'ne':
				return '!='
			case 'gt':
				return '>'
			case 'ge':
				return '>='
			case 'lt':
				return '<'
			case 'le':
				return '<='
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
