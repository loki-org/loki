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

function parse_args(args) {
	const prefs = {
		backend: 'c',
		file: '',
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		switch (arg) {
			case '-b':
			case '--backend': {
				prefs.backend = args[++i]
				continue
			}
			default:
				break
		}

		if (prefs.file === '') {
			prefs.file = arg
		} else {
			console.log(`Unknown argument: ${arg}`)
			process.exit(1)
		}
	}

	return prefs
}

function main() {
	if (process.argv.length < 3) {
		console.log(`Usage: loki [options] <file>

Options:
  -b, --backend <backend>   One of [c, ts]. Default: c`)
		process.exit(0)
	}

	const prefs = parse_args(process.argv.slice(2))

	const text = fs.readFileSync(prefs.file, 'utf-8')
	const tokens = tokenize(text)

	const table = new Table()

	const parser = new Parser(tokens, table)
	const ast = parser.parse()

	const checker = new Checker(table)
	checker.check(ast)

	const gen = new BACKENDS[prefs.backend](table)
	const out = gen.gen(ast)

	const outname = prefs.file.split('/').pop().replace('.lo', `.${prefs.backend}`)
	if (!fs.existsSync('out')){
		fs.mkdirSync('out')
	}
	fs.writeFileSync(`out/${outname}`, out)
}

main()
