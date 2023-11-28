// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as process from 'process'
import { Builder } from './builder.js'

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
	const b = new Builder(prefs)
	b.compile()
}

main()
