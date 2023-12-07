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
		this.toplevel = true
		this.struct_possible = true

		this.next()
		this.next()
	}

	parse() {
		let ast = {
			kind: 'file',
			body: [],
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

	was_pub() {
		if (!this.prev_tok){
			return false
		}
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
				parent: types.IDXS.array,
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
				this.toplevel = false
				const fn = this.fun()
				this.toplevel = true
				this.attributes = []
				return fn
			}
			case 'key_struct': {
				return this.struct_decl()
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
			case 'dollar': {
				return this.comptime_stmt()
			}
			case 'name': {
				return this.name_stmt()
			}
			case 'hash': {
				return this.hash_stmt()
			}
			case 'key_break':
			case 'key_continue': {
				return this.loop_control()
			}
			case 'key_for': {
				return this.for_loop()
			}
			case 'key_if': {
				return this.if_stmt()
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
		this.check('lcur')
		const stmts = []
		while (this.tok.kind !== 'rcur') {
			stmts.push(this.stmt())
		}
		this.check('rcur')
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

	comptime_stmt() {
		this.next()
		if (this.tok.kind === 'key_if') {
			return this.if_stmt(true)
		}

		throw new Error(`Unknown comptime statement ${this.tok.kind}`)
	}

	parse_attributes() {
		while (this.tok.kind === 'at') {
			this.parse_attribute()
		}
	}

	parse_attribute(lang = '') {
		this.next()
		const name = this.tok.value
		this.check('name')

		let args = []
		if (this.tok.kind === 'lpar') {
			this.next()
			args.push(this.string().value)
			while (this.tok.kind === 'comma') {
				this.next()
				args.push(this.string().value)
			}
			this.check('rpar')
		}

		this.attributes.push({
			name,
			args,
			lang,
		})
	}

	comment() {
		this.next()
		return {
			kind: 'comment',
			text: this.prev_tok.value
		}
	}

	for_loop() {
		this.next()
		if (this.next_tok.kind === 'decl_assign') {
			const init = this.stmt()
			this.check('semi')
			const cond = this.expr()
			this.check('semi')
			const step = this.stmt()
			const body = this.block()
			return {
				kind: 'for_decl',
				init,
				cond,
				step,
				body,
			}
		}

		this.struct_possible = false
		const cond = this.expr()
		this.struct_possible = true
		const body = this.block()
		return {
			kind: 'for_cond',
			cond,
			body,
		}
	}

	loop_control() {
		const control = this.tok.kind
		this.next()
		return {
			kind: 'loop_control',
			control,
		}
	}

	fun() {
		const is_pub = this.was_pub()
		this.next()

		let is_method = false
		let receiver = null
		if (this.tok.kind === 'lpar') {
			is_method = true
			this.next()
			const rec_name = this.tok.value
			this.check('name')
			receiver = {
				name: rec_name,
				type: this.type(),
			}
			this.check('rpar')
		}

		const name = this.tok.value
		this.check('name')

		this.check('lpar')
		const params = this.params()
		this.check('rpar')

		let ret_type = types.IDXS.void
		if (this.tok.kind !== 'lcur') {
			ret_type = this.type()
		}

		const body = this.block()

		const fn = {
			is_pub,
			kind: 'fun',
			is_method,
			receiver,
			name,
			params,
			return_type: ret_type,
			body,
			attrs: this.attributes,
		}

		if (receiver) {
			let sym = this.table.sym(receiver.type)
			if (!sym.methods) {
				sym.methods = []
			}
			sym.methods.push(fn)
			return fn
		}

		this.table.global_scope.register(name, {
			return_type: ret_type,
			params,
		})
		return fn
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

		if (this.toplevel) {
			if (this.tok.kind === 'at') {
				this.parse_attribute(lang)
				return {
					kind: 'skip'
				}
			}
		}

		const val = this.tok.value
		this.check('string')

		return {
			kind: 'hash',
			lang,
			value: val,
		}
	}

	if_stmt(is_comptime = false) {
		const branches = []
		do {
			if (this.tok.kind === 'key_else') {
				this.next()

				if (this.tok.kind === 'lcur') {
					const body = this.block(is_comptime)
					branches.push({ cond: null, body })
					break
				}

				if (is_comptime) {
					this.check('dollar')
				}
			}

			this.check('key_if')
			this.struct_possible = false
			const cond = this.expr()
			this.struct_possible = true
			const body = this.block(is_comptime)
			branches.push({ cond, body })

			if (is_comptime && this.tok.kind === 'dollar') {
				this.next()
			}

		} while(this.tok.kind === 'key_else')

		return {
			kind: 'if',
			branches,
			is_comptime,
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

	struct_decl() {
		const is_pub = this.was_pub()

		this.next()
		const name = this.tok.value
		this.check('name')

		this.check('lcur')
		let fields = []
		while (this.tok.kind !== 'rcur') {
			const fname = this.tok.value
			this.check('name')
			const ftype = this.type()
			fields.push({
				name: fname,
				type: ftype,
			})
		}
		this.next()

		const idx = this.table.register({
			kind: 'struct',
			name,
			fields,
			methods: [],
		})

		return {
			is_pub,
			kind: 'struct_decl',
			name,
			type: idx,
			fields,
		}
	}

	expr(precedence = 0) {
		let left = this.single_expr()
		while (precedence < PRECEDENCE(this.tok)) {
			if (is_infix(this.tok)) {
				left = this.infix_expr(left)
			} else if (this.tok.kind === 'dot') {
				left = this.dot_expr(left)
			} else if (this.tok.kind === 'lsbr') {
				left = this.index_expr(left)
			} else if (this.tok.kind === 'key_as') {
				left = this.as_cast(left)
			} else {
				throw new Error(`unhandled precedence ${this.tok.kind}`)
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

	as_cast(left){
		this.next()
		const target = this.type()
		return {
			kind: 'cast',
			left,
			target,
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

	method(left) {
		const expr = this.call_expr()
		expr.is_method = true
		expr.left = left
		return expr
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

	dot_expr(left) {
		this.next()
		if (this.next_tok.kind === 'lpar') {
			return this.method(left)
		}
		return this.selector(left)
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

	index_expr(left) {
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
			op: op_tok,
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

		if (this.next_tok.kind === 'lpar') {
			return this.call_expr()
		}

		if (this.struct_possible && this.next_tok.kind === 'lcur') {
			return this.struct_init()
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

	selector(left) {
		const name = this.tok.value
		this.check('name')
		return {
			kind: 'selector',
			left,
			name,
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

	struct_init() {
		const type = this.type()
		const name = this.prev_tok.value
		this.check('lcur')
		const fields = []
		while (this.tok.kind !== 'rcur') {
			const fname = this.tok.value
			this.check('name')
			this.check('assign')
			const fval = this.expr()
			fields.push({
				name: fname,
				value: fval,
			})
		}
		this.next()
		return {
			kind: 'struct_init',
			type,
			name,
			fields,
		}
	}
}

export { Parser }
