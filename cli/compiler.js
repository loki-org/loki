// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as fs from 'fs'
import { Table } from "./table.js"
import { parse } from './parser.js'
import { Sema } from './sema.js'
import { gen } from './gen.js'

function compile(prefs) {
	const text = fs.readFileSync(prefs.file, 'utf8')
	const table = new Table()
	const ast = parse(prefs.file, table, text)

	const sema = new Sema(table)
	sema.check(ast)

	for (const backend of prefs.options.backends) {
		gen(ast, table, backend).then((out) => {
			const out_path = prefs.file.replace('.lo', `.${backend}`)
			fs.writeFileSync(out_path, out.main)

			if (!out.alt_path.endsWith('/')) {
				fs.writeFileSync(out.alt_path, out.alt)
			}
		})
	}
}

export { compile }
