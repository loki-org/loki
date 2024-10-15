// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as process from 'process'
import { compile } from './compiler.js'

function help_and_exit() {
	console.log(`Usage: loki [options] <command|file>

Commands:
  [build] <file>   Compile the given file. Command can be omitted.

Options:
  -b, --backend <backend>   One of [js, c, py] or a comma-separated list. Default: js
  -o, --outdir <dir>        Directory for compiler output. Default: "build"
`)
	process.exit(0)
}

function parse_args(args) {
	const prefs = {
		command: 'build',
		options: {
			outdir: 'build',
			backends: ['js'],
		},
		file: '',
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		switch (arg) {
			case '-o':
			case '--outdir':
				prefs.options.outdir = args[++i]
				continue
			case '-b':
			case '--backend': {
				prefs.options.backends = args[++i].split(',')

				for (const backend of prefs.options.backends) {
					if (!['js', 'c', 'py'].includes(backend)) {
						console.error(`Unknown backend: ${backend}`)
						process.exit(1)
					}
				}

				continue
			}
			default:
				break
		}

		if (!arg.endsWith('.lo')) {
			prefs.command = arg
		} else if (prefs.file === '') {
			prefs.file = arg
		} else {
			console.error(`Unknown argument: ${arg}`)
			process.exit(1)
		}
	}

	return prefs
}

function main() {
	if (process.argv.length < 3) {
		help_and_exit()
	}

	const prefs = parse_args(process.argv.slice(2))

	switch (prefs.command) {
		case 'build':
			compile(prefs)
			break
		case 'help':
			help_and_exit()
		default:
			console.error(`Unknown command: ${prefs.command}`)
			process.exit(1)
	}
}

main()
