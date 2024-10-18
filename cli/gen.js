// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

class BaseGen {
	LOKI_HEADER = ' Generated by Loki (https://github.com/loki-org/loki). Do not edit.\n'

	table = null
	backend = ''
	comment_sign = '//'
	semi = ''
	line_start = true
	indent = -1
	file_name = ''
	header_out = ''
	out = ''
	footer_out = ''
	alt_out = ''
	alt_name = ''
	for_loop_head = false

	constructor() {
		if (this.constructor === BaseGen) {
			throw new Error('Cannot instantiate BaseGen')
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

	gen(ast, table) {
		this.table = table

		const slash_idx = ast.path.lastIndexOf('/')
		this.file_name = ast.path.substring(slash_idx + 1)

		this.setup()

		this.header_out = this.line_comment(this.LOKI_HEADER)
		this.pre_stage()

		this.stmts(ast.body)

		if (ast.main_fun_name.length > 0) {
			this.indent = 0
			this.call_main(ast.main_fun_name)
		}

		this.post_stage()

		const main_out = this.header_out + '\n'
			+ this.out + '\n'
			+ this.footer_out + '\n'
		return {
			main: main_out,
			alt: this.alt_out,
			alt_name: this.alt_name,
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
		if (!stmt) {
			return
		}

		switch (stmt.kind) {
			case 'assert':
				this.assert_stmt(stmt)
				break
			case 'assign':
				this.assign_stmt(stmt)
				break
			case 'const_decl':
				this.const_decl(stmt)
				break
			case 'for_classic':
				this.for_classic_loop(stmt)
				break
			case 'fun_decl':
				this.fun_decl(stmt)
				break
			case 'hash':
				this.hash_stmt(stmt)
				break
			case 'return_stmt':
				this.return_stmt(stmt)
				break
			case 'struct_decl':
				this.struct_decl(stmt)
				break
			case 'struct_impl':
				this.struct_impl(stmt)
				break
			default:
				this.expr(stmt)
				this.writeln(this.semi)
				break
		}
	}

	expr(expr){
		switch (expr.kind) {
			case 'array_init':
				this.array_init(expr)
				break
			case 'call_expr':
				this.call_expr(expr)
				break
			case 'cast_expr':
				this.cast_expr(expr)
				break
			case 'expr_in_parens':
				this.expr_in_parens(expr)
				break
			case 'ident':
				this.ident(expr)
				break
			case 'if':
				this.if_expr(expr)
				break
			case 'index':
				this.index_expr(expr)
				break
			case 'infix':
				this.infix_expr(expr)
				break
			case 'integer':
				this.integer(expr)
				break
			case 'prefix':
				this.prefix_expr(expr)
				break
			case 'selector':
				this.selector_expr(expr)
				break
			case 'self':
				this.self_expr(expr)
				break
			case 'struct_init':
				this.struct_init(expr)
				break
			default:
				throw new Error(`cannot generate ${expr.kind}`)
		}

	}

	expr_string(expr) {
		const start = this.out.length
		this.expr(expr)
		const s = this.out.substring(start)
		this.out = this.out.substring(0, start)
		return s
	}

	hash_stmt(node) {
		if (node.lang == this.backend) {
			this.writeln(node.value)
		}
	}

	return_stmt(node) {
		this.write('return ')
		this.expr(node.expr)
		this.writeln(this.semi)
	}

	expr_in_parens(node) {
		this.write('(')
		this.expr(node.expr)
		this.write(')')
	}

	call_expr(node) {
		if (node.is_method) {
			this.method_call(node)
		} else {
			this.fun_call(node)
		}
	}

	method_call(node) {
		this.expr(node.left)
		this.write('.')
		this.fun_call(node)
	}

	fun_call(node) {
		this.write(node.name)
		this.write('(')
		for (let i = 0; i < node.args.length; i++) {
			if (i > 0) {
				this.write(', ')
			}
			this.expr(node.args[i])
		}
		this.write(')')
	}

	ident(node) {
		this.write(node.name)
	}

	infix_expr(node) {
		this.expr(node.left)
		this.write(' ' + this.op(node.op) + ' ')
		this.expr(node.right)
	}

	integer(node) {
		this.write(node.value)
	}

	prefix_expr(node) {
		this.write(this.op(node.op))
		this.expr(node.expr)
	}

	line_comment(text) {
		return `${this.comment_sign}${text}`
	}

	op(kind) {
		switch (kind) {
			case 'assign':
			case 'decl_assign':
				return '='
			case 'eq':
				return '=='
			case 'ne':
				return '!='
			case 'lt':
				return '<'
			case 'le':
				return '<='
			case 'gt':
				return '>'
			case 'ge':
				return '>='
			case 'plus':
				return '+'
			case 'minus':
				return '-'
			case 'mul':
				return '*'
			case 'div':
				return '/'
			case 'mod':
				return '%'
			case 'plus_assign':
				return '+='
			case 'minus_assign':
				return '-='
			case 'mul_assign':
				return '*='
			case 'div_assign':
				return '/='
			case 'not':
				return '!'
			case 'bit_and':
				return '&'
			case 'bit_or':
				return '|'
			case 'bit_xor':
				return '^'
			case 'lshift':
				return '<<'
			case 'rshift':
				return '>>'
			default:
				throw new Error(`cannot represent ${kind}`)
		}
	}

	// Set configs
	setup() {
		// Do nothing by default
	}

	// Write to outputs
	pre_stage() {
		// Do nothing by default
	}

	post_stage() {
		// Do nothing by default
	}

	assert_stmt(node) {
		throw new Error('Not implemented')
	}

	assign_stmt(node) {
		throw new Error('Not implemented')
	}

	const_decl(node) {
		throw new Error('Not implemented')
	}

	for_classic_loop(node) {
		throw new Error('Not implemented')
	}

	fun_decl(node) {
		throw new Error('Not implemented')
	}

	struct_decl(node){
		throw new Error('Not implemented')
	}

	struct_impl(node){
		throw new Error('Not implemented')
	}

	array_init(node) {
		throw new Error('Not implemented')
	}

	cast_expr(node) {
		throw new Error('Not implemented')
	}

	if_expr(node) {
		throw new Error('Not implemented')
	}

	index_expr(node) {
		throw new Error('Not implemented')
	}

	selector_expr(node) {
		throw new Error('Not implemented')
	}

	self_expr(node) {
		throw new Error('Not implemented')
	}

	struct_init(node) {
		throw new Error('Not implemented')
	}

	type(t) {
		throw new Error('Not implemented')
	}

	call_main(name, with_args) {
		throw new Error('Not implemented')
	}
}

export { BaseGen }
