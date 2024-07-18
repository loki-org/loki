// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { Lexer } from "./lexer.js"
import { Table } from "./table.js"

function parse(text) {
	const p = new Parser(text)
	return p.parse()
}

class Parser{
	constructor(text){
		this.lexer = new Lexer(text)
		this.table = new Table()
		this.tok = ''
		this.next_tok = 'err'
		this.val = ''
		this.pos = { line: 0, col: 0}

		this.next()
	}

	parse() {
		const ast = {
			kind: 'file',
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

	toplevel_stmt() {
		switch(this.tok) {
			case 'const':
				return this.const_decl()
			default:
				throw new Error(`unexpected stmt: ${this.tok} "${this.val}"`)
		}
	}

	const_decl() {
		this.next()
		const name = this.check_name()
		this.check('decl_assign')
		const expr = this.expr()
		return {
			kind: 'const_decl',
			name,
			expr,
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
				return this.integer_literal()
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

	integer_literal() {
		const n = {
			kind: 'integer_literal',
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
		throw new Error(`unknown name: ${this.val}`)
	}
}

export { parse }
