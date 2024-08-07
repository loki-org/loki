// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { Lexer } from "./lexer.js"
import { IDXS, Table } from "./table.js"

function parse(path, table, text) {
	const p = new Parser(path, table, text)
	return p.parse()
}

class Parser{
	constructor(path, table, text){
		this.path = path
		this.lexer = new Lexer(text)
		this.table = table
		this.tok = ''
		this.next_tok = 'err'
		this.val = ''
		this.pos = { line: 0, col: 0}
		this.is_pub = false

		this.next()
	}

	parse() {
		const ast = {
			kind: 'file',
			path: this.path,
			body: [],
		}

		while(this.tok !== 'eof') {
			ast.body.push(this.toplevel_stmt())
		}

		return ast
	}

	next() {
		if (this.next_tok === 'err') {
			this.tok = this.lexer.next()
		} else {
			this.tok = this.next_tok
			this.next_tok = 'err'
		}

		this.val = this.lexer.get_val()
		this.pos = this.lexer.get_pos()
	}

	peek(){
		if (this.next_tok === 'err') {
			this.next_tok = this.lexer.next()
		}
		return this.next_tok
	}

	check(exp) {
		if (this.tok !== exp) {
			throw new Error(`got ${this.tok}, expected ${exp}`)
		}
		this.next()
	}

	check_name() {
		const val = this.val
		this.check('name')
		return val
	}

	type() {
		const name = this.check_name()
		const idx = this.table.indexes.get(name)
		if (idx >= 0) {
			return idx
		}
		throw new Error(`unknown type: ${name}`)
	}

	toplevel_stmt() {
		switch(this.tok) {
			case 'const':
				return this.const_decl()
			case 'fun':
				return this.fun_decl()
			case 'struct':
				return this.struct_decl()
			case 'pub':
				this.pub_stmt()
				return this.toplevel_stmt()
			default:
				throw new Error(`unexpected toplevel stmt: ${this.tok} "${this.val}"`)
		}
	}

	block() {
		const stmts = []
		while (this.tok !== 'rcur' && this.tok !== 'eof') {
			stmts.push(this.stmt())
		}
		return stmts
	}

	stmt() {
		switch(this.tok) {
			case 'mut':
			case 'name':
				return this.assign_stmt()
			default:
				return this.expr()
		}
	}

	pub_stmt() {
		if (this.is_pub) {
			throw new Error(`unexpected pub stmt at ${this.pos}`)
		}

		this.next()
		this.is_pub = true
	}

	read_pub() {
		const p = this.is_pub
		this.is_pub = false
		return p
	}

	assign_stmt() {
		const left = this.expr()
		const op = this.tok
		this.next()
		const right = this.expr()

		return {
			kind: 'assign',
			op,
			left,
			right,
		}
	}

	const_decl() {
		this.next()
		const name = this.check_name()
		this.check('decl_assign')
		const expr = this.expr()
		return {
			kind: 'const_decl',
			pub: this.read_pub(),
			name,
			expr,
		}
	}

	fun_decl() {
		this.next()
		const name = this.check_name()
		this.check('lpar')
		const params = this.params()
		this.check('rpar')
		let return_type = IDXS.void
		if (this.tok !== 'lcur') {
			return_type = this.type()
		}
		this.check('lcur')
		const body = this.block()
		this.check('rcur')
		return {
			kind: 'fun_decl',
			pub: this.read_pub(),
			name,
			params,
			return_type,
			body,
		}
	}

	params() {
		const params = []
		while (this.tok !== 'rpar') {
			const name = this.check_name()
			const type = this.type()
			params.push({ name, type })

			if (this.tok !== 'rpar') {
				this.check(',')
			}
		}
		return params
	}

	struct_decl() {
		this.next()
		const name = this.check_name()
		this.check('lcur')
		const fields = []
		while (this.tok !== 'rcur') {
			const is_pub = this.tok === 'pub'
			if (is_pub) {
				this.next()
			}
			const field_name = this.check_name()
			const type = this.type()
			fields.push({
				name: field_name,
				type,
			})
		}
		this.next()

		this.table.register({ name, fields })

		return {
			kind: 'struct_decl',
			pub: this.read_pub(),
			name,
			fields,
		}
	}

	expr(precedence) {
		let node = this.single_expr()
		// TODO precedence
		return node
	}

	single_expr() {
		switch(this.tok) {
			case 'integer':
				return this.integer()
			case 'mut':
				return this.ident()
			case 'name':
				return this.name_expr()
			default:
				throw new Error(`unexpected expr: ${this.tok} "${this.val}"`)
		}
	}

	cast_expr(target) {
		this.next()
		this.check('lpar')
		const expr = this.expr()
		this.check('rpar')
		return {
			kind: 'cast_expr',
			target,
			expr,
		}
	}

	ident() {
		const is_mut = this.tok === 'mut'
		if (is_mut) {
			this.next()
		}
		const name = this.check_name()
		return {
			kind: 'ident',
			name,
			is_mut,
		}
	}

	integer() {
		const n = {
			kind: 'integer',
			value: this.val,
		}
		this.next()
		return n
	}

	name_expr() {
		if (this.peek() === 'lpar') {
			const type_idx = this.table.indexes.get(this.val)
			if (type_idx >= 0) {
				return this.cast_expr(type_idx)
			}
		}

		const is_capitalised = this.val[0] === this.val[0].toUpperCase()
		if (is_capitalised && this.peek() === 'lcur') {
			return this.struct_init()
		}

		return this.ident()
	}

	struct_init() {
		const name = this.check_name()
		this.check('lcur')
		const fields = []
		while (this.tok !== 'rcur') {
			const field_name = this.check_name()
			this.check('assign')
			const expr = this.expr()
			fields.push({
				name: field_name,
				expr,
			})
			if (this.tok !== 'rcur') {
				this.check('comma')
			}
		}
		this.next()
		return {
			kind: 'struct_init',
			name,
			fields,
		}
	}
}

export { parse }
