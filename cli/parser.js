// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as types from './types.js'
import { Scope } from "./scope.js"
import { PRECEDENCE, is_assign, is_infix, is_math_assign } from './tokenizer.js'

class Parser{
	constructor(tokens, table) {
		this.table = table
		this.tokens = tokens
		this.pos = 0
		this.attributes = []
		this.root_scope = new Scope(null)

		this.next()
		this.next()
	}

	parse() {
		let ast = {
			kind: 'file',
			body: [],
			root_scope: null,
		}

		while (this.pos < this.tokens.length) {
			ast.body.push(this.toplevel_stmt())
		}

		ast.root_scope = this.root_scope
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

	was_pub() {
		return this.prev_tok.kind === 'key_pub'
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

		if (name === 'map') {
			return this.map_type()
		}

		return this.table.register({
			kind: 'other',
			name: name
		})
	}

	map_type() {
		this.check('lsbr')
		const key_type = this.type()
		this.check('rsbr')
		const val_type = this.type()

		const key_sym = this.table.sym(key_type)
		const val_sym = this.table.sym(val_type)
		return this.table.register({
			kind: 'map',
			name: `map[${key_sym.name}]${val_sym.name}`,
			key_type,
			val_type,
		})
	}

	toplevel_stmt() {
		this.parse_attributes()
		switch (this.tok.kind) {
			case 'comment': {
				return this.comment()
			}
			case 'hash': {
				return this.hash_stmt()
			}
			case 'key_pub': {
				this.next()
				return this.pub_stmt()
			}
			default:
				return this.pub_stmt()
		}
	}

	pub_stmt() {
		switch (this.tok.kind) {
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
			case 'hash': {
				return this.hash_stmt()
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

	parse_attributes() {
		this.attributes = []
		while (this.tok.kind === 'at') {
			this.next()
			const name = this.tok.value
			this.check('name')

			this.attributes.push({
				name
			})
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
		const is_pub = this.was_pub()

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

		this.root_scope.register(name, {
			type: ret_type,
			params,
		})

		return {
			is_pub,
			kind: 'fun',
			name,
			params,
			return_type: ret_type,
			body,
			attrs: this.attributes
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

	hash_stmt() {
		const lang = this.tok.value
		this.next()
		this.check('dot')
		const val = this.tok.value
		this.check('string')

		return {
			kind: 'hash',
			lang,
			value: val,
		}
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
			case 'string': {
				return this.string()
			}
			case 'number': {
				return this.number()
			}
			case 'lsbr': {
				return this.array_init()
			}
			case 'key_false':
			case 'key_true': {
				return this.bool()
			}
			case 'key_mut': {
				return this.ident()
			}
			default:
				throw new Error(this.tok.kind)
		}
	}

	array_init() {
		if (this.next_tok.kind === 'rsbr') {
			const type = this.type()
			return {
				kind: 'array_init',
				type,
				elem_type: this.table.sym(type).elem_type,
				exprs: [],
			}
		}

		this.next()
		const exprs = [this.expr()]
		while (this.tok.kind === 'comma') {
			this.next()
			exprs.push(this.expr())
		}
		this.check('rsbr')
		return {
			kind: 'array_init',
			exprs,
		}
	}

	bool() {
		const val = this.tok.kind === 'key_true'
		this.next()
		return {
			kind: 'bool',
			value: val
		}
	}

	call_expr() {
		const name = this.tok.value
		this.check('name')
		this.check('lpar')
		const args = this.call_args()
		this.check('rpar')
		return {
			kind: 'call',
			name,
			args,
		}
	}

	call_args() {
		const args = []
		while (this.tok.kind !== 'rpar') {
			args.push(this.expr())
			if (this.tok.kind !== 'rpar') {
				this.check('comma')
			}
		}
		return args
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

	index_expr() {
		const left = this.ident()
		this.check('lsbr')
		const index = this.expr()
		this.check('rsbr')
		return {
			kind: 'index',
			left,
			index,
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

	map_init() {
		this.next()
		const idx = this.map_type()
		const sym = this.table.sym(idx)
		return {
			kind: 'map_init',
			type: idx,
			key_type: sym.key_type,
			val_type: sym.val_type,
		}
	}

	name_expr() {
		if (this.tok.value === 'map') {
			return this.map_init()
		}

		if (this.next_tok.kind === 'lsbr') {
			return this.index_expr()
		}

		if (this.next_tok.kind === 'lpar') {
			return this.call_expr()
		}

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

	string() {
		const val = this.tok.value
		this.check('string')
		return {
			kind: 'string',
			value: val
		}
	}
}

export { Parser }
