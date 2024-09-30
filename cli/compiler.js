// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as fs from 'node:fs'
import * as path from 'node:path'
import { Table } from "./table.js"
import { parse } from './parser.js'
import { Sema } from './sema.js'
import { Transformer } from './transformer.js'

async function compile(prefs) {
	const text = fs.readFileSync(prefs.file, 'utf8')
	const table = new Table()
	let ast = parse(prefs, table, text)

	const sema = new Sema(table, prefs.is_test)
	sema.check(ast)

	const trans = new Transformer()
	ast = trans.transform(ast)

	const file_name = path.basename(prefs.file)
	const out_path_lo = path.join(prefs.options.outdir, file_name)

	for (const b of prefs.options.backends) {
		const backend = await load_backend(b)

		const gen = new backend.Gen()
		const out = gen.gen(ast, table)

		const out_path = out_path_lo.replace('.lo', `.${b}`)
		fs.mkdirSync(prefs.options.outdir, { recursive: true })
		fs.writeFileSync(out_path, out.main)

		if (out.alt_name.length > 0) {
			const alt_path = path.join(prefs.options.outdir, out.alt_name)
			fs.writeFileSync(alt_path, out.alt)
		}
	}
}

async function load_backend(backend) {
	try {
		const obj = await import(`./backends/${backend}.js`)
		return obj
	} catch (e) {
		console.error(e)
		process.exit(1)
	}
}

export { compile }
