// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as types from './types.js'
import { PRECEDENCE, is_assign, is_infix, is_math_assign } from './tokenizer.js'

class Parser{
	constructor(tokens, table) {
		this.table = table
		this.tokens = tokens
		this.pos = 0

		this.next()
		this.next()
	}

	parse() {
		let ast = {
			kind: 'file',
			body: []
		}

		while (this.pos < this.tokens.length) {
			ast.body.push(this.toplevel_stmt())
		}

		return ast
	}

	next() {
		this.prev_tok = this.tok
		this.tok = this.next_tok
		this.next_tok = this.tokens[this.pos]
		this.pos++
	}

	check(kind) {
		if (this.tok.kind !== kind) {
			throw new Error(`Expected ${kind}, got ${this.tok.kind}`)
		}
		this.next()
	}

	type() {
		if (this.tok.kind === 'lsbr') {
			this.next()
			this.check('rsbr')
			const elem_type = this.type()
			return this.table.register({
				kind: 'array',
				name: `[]${this.table.sym(elem_type).name}`,
				elem_type,
			})
		}

		const name = this.tok.value
		this.check('name')
		return this.table.register({
			kind: 'other',
			name: name
		})
	}

	toplevel_stmt() {
		switch (this.tok.kind) {
			case 'comment': {
				return this.comment()
			}
			case 'key_fun': {
				return this.fun()
			}
			default:
				throw new Error(this.tok.kind)
		}
	}

	stmt() {
		switch (this.tok.kind) {
			case 'comment': {
				return this.comment()
			}
			case 'name': {
				return this.name_stmt()
			}
			case 'key_mut': {
				return this.assign_stmt()
			}
			case 'key_return': {
				return this.return_stmt()
			}
			default:
				throw new Error(this.tok.kind)
		}
	}

	block() {
		const stmts = []
		while (this.tok.kind !== 'rcur') {
			stmts.push(this.stmt())
		}
		return stmts
	}

	assign_stmt() {
		const left = this.expr()
		return this.partial_assign(left)
	}

	partial_assign(left) {
		const op = this.tok.kind
		this.next()
		const right = this.expr()
		return {
			kind: 'assign',
			op,
			left,
			right
		}
	}

	comment() {
		this.next()
		return {
			kind: 'comment',
			text: this.prev_tok.value
		}
	}

	fun() {
		this.next()
		const name = this.tok.value
		this.check('name')

		this.check('lpar')
		const params = this.params()
		this.check('rpar')

		let ret_type = types.IDXS.void
		if (this.tok.kind !== 'lcur') {
			ret_type = this.type()
		}

		this.check('lcur')
		const body = this.block()
		this.check('rcur')

		return {
			kind: 'fun',
			name,
			params,
			return_type: ret_type,
			body,
		}
	}

	params() {
		const params = []
		while (this.tok.kind !== 'rpar') {
			const name = this.tok.value
			this.check('name')
			const type = this.type()

			params.push({ name, type })

			if (this.tok.kind !== 'rpar') {
				this.check('comma')
			}
		}
		return params
	}

	name_stmt() {
		const left = this.expr()

		if (is_assign(this.tok) || is_math_assign(this.tok)) {
			return this.partial_assign(left)
		}

		return {
			kind: 'expr',
			expr: left
		}
	}

	return_stmt() {
		this.next()
		const expr = this.expr()
		return {
			kind: 'return',
			expr,
		}
	}

	expr(precedence = 0) {
		let left = this.single_expr()
		while (precedence < PRECEDENCE(this.tok)) {
			if (is_infix(this.tok)) {
				left = this.infix_expr(left)
			} else {
				return left
			}
		}
		return left
	}

	single_expr() {
		switch (this.tok.kind) {
			case 'name': {
				return this.name_expr()
			}
			case 'number': {
				return this.number()
			}
			case 'lsbr': {
				return this.array_init()
			}
			case 'key_mut': {
				return this.ident()
			}
			default:
				throw new Error(this.tok.kind)
		}
	}

	array_init() {
		const type = this.type()
		return {
			kind: 'array_init',
			type,
			elem_type: this.table.sym(type).elem_type
		}
	}

	ident() {
		const is_mut = this.tok.kind === 'key_mut'
		if (is_mut) {
			this.next()
		}
		const name = this.tok.value
		this.check('name')
		return {
			kind: 'ident',
			name,
			is_mut,
		}
	}

	infix_expr(left) {
		const op_tok = this.tok
		this.next()
		const right = this.expr(PRECEDENCE(op_tok))
		return {
			kind: 'infix',
			left,
			op: op_tok.kind,
			right,
		}
	}

	name_expr() {
		return this.ident()
	}

	number() {
		const val = this.tok.value
		this.check('number')
		return {
			kind: 'integer',
			value: val
		}
	}
}

export { Parser }
