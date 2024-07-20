// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as fs from 'fs'
import { parse } from './parser.js'
import { gen } from './gen.js'

function compile(prefs) {
	const text = fs.readFileSync(prefs.file, 'utf8')
	const ast = parse(text)

	for (const backend of prefs.options.backends) {
		gen(ast, backend).then((out) => {
			const outname = prefs.file.replace('.lo', `.${backend}`)
			fs.writeFileSync(outname, out)
		})
	}
}

export { compile }
