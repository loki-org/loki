// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as process from 'process'
import * as fs from 'fs'
import { Table } from './types.js'
import { tokenize } from './tokenizer.js'
import { Parser } from './parser.js'
import { Checker } from './checker.js'
import { CGen } from './gen_c.js'
import { TsGen } from './gen_ts.js'

const BACKENDS = {
	'c': CGen,
	'ts': TsGen,
}

function main() {
	let backend = 'c'
	let file = ''
	if (process.argv.length === 3) {
		file = process.argv[2]

	} else if (process.argv.length === 4){
		backend = process.argv[2]
		file = process.argv[3]
	} else {
		console.log('Usage: loki [backend] file')
		process.exit(0)
	}

	const text = fs.readFileSync(file, 'utf-8')
	const tokens = tokenize(text)

	const table = new Table()

	const parser = new Parser(tokens, table)
	const ast = parser.parse()

	const checker = new Checker(table)
	checker.check(ast)

	const gen = new BACKENDS[backend](table)
	const out = gen.gen(ast)

	const outname = file.split('/').pop().replace('.lo', `.${backend}`)
	if (!fs.existsSync('out')){
		fs.mkdirSync('out')
	}
	fs.writeFileSync(`out/${outname}`, out)
}

main()
