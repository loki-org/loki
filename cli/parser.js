// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as types from './types.js'

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
			case 'key_fn': {
				return this.fn()
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
		this.next()
		const right = this.expr()
		return {
			kind: 'assign',
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

	fn() {
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
			kind: 'fn',
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
		if (this.tok.kind === 'decl_assign') {
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

	expr() {
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
