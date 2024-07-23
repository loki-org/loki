// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

class BaseGen {
	LOKI_HEADER = ' Generated by Loki (https://github.com/loki-org/loki). Do not edit.\n'

	comment_sign = '//'
	line_start = true
	indent = -1
	file_name = ''
	base_path = ''
	header_out = ''
	out = ''
	footer_out = ''
	alt_out = ''
	alt_name = ''

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

	gen(ast) {
		const slash_idx = ast.path.lastIndexOf('/')
		this.file_name = ast.path.substring(slash_idx + 1)
		this.base_path = ast.path.substring(0, slash_idx)

		this.setup()

		this.header_out = this.line_comment(this.LOKI_HEADER)
		this.pre_stage()

		this.stmts(ast.body)

		this.post_stage()

		const main_out = this.header_out + '\n'
			+ this.out + '\n'
			+ this.footer_out + '\n'
		return {
			main: main_out,
			alt: this.alt_out,
			alt_path: this.base_path + '/' + this.alt_name,
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
			case 'const_decl':
				this.const_decl(stmt)
				break
			case 'fun_decl':
				this.fun_decl(stmt)
				break
			default:
				throw new Error(`cannot generate ${stmt.kind}`)
		}
	}

	expr(expr){
		switch (expr.kind) {
			case 'cast_expr':
				this.cast_expr(expr)
				break
			case 'integer':
				this.integer(expr)
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

	integer(node) {
		this.write(node.value)
	}

	line_comment(text) {
		return `${this.comment_sign}${text}`
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

	const_decl(node) {
		throw new Error('Not implemented')
	}

	fun_decl(node) {
		throw new Error('Not implemented')
	}

	cast_expr(node) {
		throw new Error('Not implemented')
	}

	type(t) {
		throw new Error('Not implemented')
	}
}

async function load_backend(backend) {
	try {
		const obj = await import(`./backends/${backend}.js`)
		return new obj.Gen()
	} catch (e) {
		console.error(e)
		process.exit(1)
	}
}

async function gen(ast, backend) {
	const b = await load_backend(backend)
	return b.gen(ast)
}

export { gen, BaseGen }
