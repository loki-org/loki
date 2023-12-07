// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { Table } from './types.js'
import { Tokenizer } from './tokenizer.js'
import { Parser } from './parser.js'
import { Checker } from './checker.js'
import { BACKENDS } from './backends.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BUILTIN_FILES = [
	'array.lo',
	'builtin.lo',
	'string.lo',
]

class Builder {
	constructor(prefs) {
		this.prefs = prefs
		this.table = new Table()
	}

	compile() {
		let asts = []
		for (const file of BUILTIN_FILES) {
			asts.push(this.parse_source_file(`${__dirname}/../lib/${file}`))
		}
		asts.push(this.parse_source_file(this.prefs.file))

		const checker = new Checker(this.table, this.prefs)
		for (const ast of asts) {
			checker.check(ast)
		}

		const gen = new BACKENDS[this.prefs.backend](this.table, this.prefs)
		const out = gen.gen(asts)

		const outname = this.prefs.file.split('/').pop().replace('.lo', `.${this.prefs.backend}`)
		if (!fs.existsSync('out')){
			fs.mkdirSync('out')
		}
		fs.writeFileSync(`out/${outname}`, out)
	}

	parse_source_file(path) {
		const text = fs.readFileSync(path, 'utf-8')
		const tok = new Tokenizer(text)
		const tokens = tok.tokenize()

		const parser = new Parser(tokens, this.table)
		return parser.parse()
	}
}

export { Builder }
