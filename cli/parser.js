// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { PRECEDENCE, Lexer, is_comparison, is_assign, is_infix } from "./lexer.js"
import { IDXS } from "./table.js"
import { Env } from './scope.js'

function parse(prefs, table, text) {
	const p = new Parser(prefs.file, table, text)
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
		this.pos = { line: 0, col: 0 }
		this.is_pub = false
		this.attributes = []
		this.env = new Env()

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
			this.attributes = []
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

	parse_attributes() {
		while (this.tok === 'at') {
			this.next()
			const name = this.check_name()
			// TODO attribute arguments
			this.attributes.push({
				name,
			})
		}
	}

	type() {
		if (this.tok === 'lsqr') {
			this.next()
			let size = 0
			if (this.tok === 'integer') {
				size = this.val
				this.next()
			}
			this.check('rsqr')
			const elem = this.type()
			if (size > 0) {
				return this.table.find_fixed_array(elem, size)
			}
			return this.table.find_array(elem)
		}

		const name = this.check_name()
		const idx = this.table.indexes.get(name)
		if (idx >= 0) {
			return idx
		}
		throw new Error(`unknown type: ${name}`)
	}

	toplevel_stmt() {
		this.parse_attributes()
		switch(this.tok) {
			case 'const':
				return this.const_decl()
			case 'fun':
				return this.fun_decl()
			case 'impl':
				return this.struct_impl()
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
		this.check('lcur')
		const stmts = []
		while (this.tok !== 'rcur' && this.tok !== 'eof') {
			stmts.push(this.stmt())
		}
		this.check('rcur')
		return stmts
	}

	stmt() {
		switch(this.tok) {
			case 'for':
				return this.for_loop()
			case 'mut':
				return this.assign_stmt()
			case 'name':
				return this.name_stmt()
			case 'return':
				return this.return_stmt()
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
		return this.partial_assign_stmt(left)
	}

	partial_assign_stmt(left) {
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

	for_loop() {
		this.next()

		// Classic for (init, cond, step)
		const init = this.stmt()
		this.check('semi')
		const cond = this.expr()
		this.check('semi')
		const step = this.stmt()
		const body = this.block()
		return {
			kind: 'for_classic',
			init,
			cond,
			step,
			body,
		}
	}

	fun_decl(is_method = false) {
		this.next()
		const name = this.check_name()

		this.check('lpar')
		let receiver = null
		if (is_method) {
			receiver = { name: 'self', type: this.env.impl_type }
			this.next()
			if (this.tok !== 'rpar') {
				this.check('comma')
			}
		}
		const params = this.params()
		this.check('rpar')

		let return_type = IDXS.void
		if (this.tok !== 'lcur') {
			return_type = this.type()
		}

		const body = this.block()

		if (!is_method) {
			this.table.global_scope.insert(name, { kind: 'fun', params, return_type })
		}

		return {
			kind: 'fun_decl',
			pub: this.read_pub(),
			name,
			is_method,
			receiver,
			params,
			return_type,
			body,
			attrs: this.attributes,
		}
	}

	params() {
		const params = []
		while (this.tok !== 'rpar') {
			if (params.length > 0) {
				this.check('comma')
			}

			const name = this.check_name()
			const type = this.type()
			params.push({ name, type })
		}
		return params
	}

	name_stmt() {
		const left = this.expr()
		if (is_assign(this.tok)) {
			return this.partial_assign_stmt(left)
		}

		return left
	}

	return_stmt() {
		this.next()
		// TODO return without value
		const expr = this.expr()
		return {
			kind: 'return_stmt',
			expr,
		}
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

		const idx = this.table.register({ name, fields, methods: [] })

		return {
			kind: 'struct_decl',
			type: idx,
			pub: this.read_pub(),
			name,
			fields,
		}
	}

	struct_impl() {
		this.next()
		const type = this.type()
		this.env.impl_type = type

		this.check('lcur')
		let methods = []
		while (this.tok !== 'rcur') {
			if (this.tok === 'pub') {
				this.next()
				this.is_pub = true
			}
			methods.push(this.fun_decl(true))
		}
		this.check('rcur')

		this.table.add_impl(type, methods)
		this.env.impl_type = -1

		return {
			kind: 'struct_impl',
			type,
			methods,
		}
	}

	expr(precedence = 0) {
		let node = this.single_expr()
		while (precedence < PRECEDENCE(this.tok)) {
			if (this.tok === 'lsqr') {
				node = this.index_expr(node)
			} else if (this.tok === 'dot') {
				node = this.dot_expr(node)
			} else if (is_infix(this.tok)) {
				node = this.infix_expr(node)
			} else {
				throw new Error(`precedence not implemented: ${this.tok}`)
			}
		}
		return node
	}

	single_expr() {
		switch(this.tok) {
			case 'lpar':
				return this.expr_in_parens()
			case 'if':
				return this.if_expr()
			case 'integer':
				return this.integer()
			case 'lsqr':
				return this.array_init()
			case 'mut':
				return this.ident()
			case 'name':
				return this.name_expr()
			case 'not':
				return this.prefix_expr()
			case 'self':
				return this.self_expr()
			default:
				throw new Error(`unexpected expr: ${this.tok} "${this.val}"`)
		}
	}

	expr_in_parens() {
		this.next()
		const expr = this.expr()
		this.check('rpar')
		return {
			kind: 'expr_in_parens',
			expr,
		}
	}

	array_init() {
		this.next()

		// Exprs, e.g. (`1,2,3` in `[1,2,3]`) or (`8` in `[8]u32{}`)
		const exprs = []
		while (this.tok !== 'rsqr') {
			exprs.push(this.expr())
			if (this.tok !== 'rsqr') {
				this.check('comma')
			}
		}
		this.next()

		// Type only init, e.g. `[]i32{}` or `[8]u32{}`
		if (this.tok === 'name' && this.peek() === 'lcur') {
			const fixed = exprs.length === 1
			const elem = this.type()
			let type = -1
			if (fixed) {
				type = this.table.find_fixed_array(elem, exprs[0].value)
			} else {
				type = this.table.find_array(elem)
			}
			this.check('lcur')
			this.check('rcur')
			return {
				kind: 'array_init',
				fixed,
				exprs,
				type,
			}
		}

		// Element init, e.g. `[1, 2, 3]`
		return {
			kind: 'array_init',
			exprs,
		}
	}

	call_expr() {
		const name = this.check_name()
		this.check('lpar')
		const args = []
		while (this.tok !== 'rpar') {
			args.push(this.expr())
			if (this.tok !== 'rpar') {
				this.check('comma')
			}
		}
		this.check('rpar')
		return {
			kind: 'call_expr',
			name,
			args,
		}
	}

	method_call(left) {
		const call = this.call_expr()
		call.left = left
		call.is_method = true
		return call
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

	dot_expr(left) {
		this.next()
		if (this.peek() === 'lpar') {
			return this.method_call(left)
		}
		return this.selector_expr(left)
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

	if_expr() {
		const branches = []
		let has_else = false

		while (true) {
			if (this.tok === 'else') {
				this.next()

				// else branch
				if (this.tok === 'lcur') {
					has_else = true
					const stmts = this.block()
					branches.push({
						cond: null,
						stmts,
					})
					break
				}
			}

			// if- / else-if-branch
			this.check('if')
			const cond = this.expr()
			const stmts = this.block()
			branches.push({
				cond,
				stmts,
			})

			if (this.tok !== 'else') {
				break
			}
		}

		return {
			kind: 'if',
			has_else,
			branches,
		}
	}

	index_expr(left) {
		this.check('lsqr')
		const index = this.expr()
		this.check('rsqr')
		return {
			kind: 'index',
			left,
			index,
		}
	}

	infix_expr(left) {
		const op = this.tok
		this.next()
		const right = this.expr(PRECEDENCE(op))
		return {
			kind: 'infix',
			left,
			op,
			right,
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

			return this.call_expr()
		}

		const is_capitalised = this.val[0] === this.val[0].toUpperCase()
		if (is_capitalised && this.peek() === 'lcur') {
			return this.struct_init()
		}

		return this.ident()
	}

	prefix_expr() {
		const op = this.tok
		this.next()
		const expr = this.expr()
		return {
			kind: 'prefix',
			op,
			expr,
		}
	}

	selector_expr(left) {
		const name = this.check_name()
		return {
			kind: 'selector',
			left,
			name,
		}
	}

	self_expr() {
		this.next()
		return {
			kind: 'self',
		}
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
