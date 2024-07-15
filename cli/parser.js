// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { Lexer } from "./lexer.js"

function parse(text) {
	const p = new Parser(text)
	return p.parse()
}

class Parser{
	constructor(text){
		this.lexer = new Lexer(text)
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

	toplevel_stmt() {
		switch(this.tok) {
			default:
				throw new Error(this.val)
		}
	}
}

export { parse }
