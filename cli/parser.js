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
			ast.body.push(this.stmt())
		}

		return ast
	}

	next() {
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
		const name = this.tok.value
		this.check('name')
		return this.table.register({ name: name })
	}

	stmt() {
		switch (this.tok.kind) {
			case 'name': {
				switch (this.tok.value) {
					case 'fn': {
						return this.fn()
					}
					default:
						throw new Error(this.tok.kind)
				}
			}
			default:
				throw new Error(this.tok.kind)
		}
	}

	fn() {
		this.next()
		const name = this.tok.value
		this.check('name')

		this.check('lpar')
		// TODO params
		const params = []
		this.check('rpar')

		let ret_type = types.IDXS.void
		if (this.tok.kind !== 'lcur') {
			ret_type = this.type()
		}

		this.check('lcur')
		// TODO body
		const body = []
		this.check('rcur')

		return {
			kind: 'fn',
			name,
			params,
			return_type: ret_type,
			body,
		}
	}
}

export { Parser }
