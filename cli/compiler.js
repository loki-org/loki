// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as fs from 'node:fs'
import * as path from 'node:path'
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

	const file_name = path.basename(prefs.file)
	const out_path_lo = path.join(prefs.options.outdir, file_name)

	for (const backend of prefs.options.backends) {
		gen(ast, table, backend).then((out) => {
			const out_path = out_path_lo.replace('.lo', `.${backend}`)
			fs.mkdirSync(prefs.options.outdir, { recursive: true })
			fs.writeFileSync(out_path, out.main)

			if (out.alt_name.length > 0) {
				const alt_path = path.join(prefs.options.outdir, out.alt_name)
				fs.writeFileSync(alt_path, out.alt)
			}
		})
	}
}

export { compile }
