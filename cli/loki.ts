import { Lexer } from '../lib/loki/lexer/lexer.ts'
import { format_check_error } from '../lib/loki/checker/check_error.ts'
import { Checker } from '../lib/loki/checker/checker.ts'
import { CGenerator } from '../lib/loki/gen/c.ts'
import { JsGenerator } from '../lib/loki/gen/js.ts'
import { format_error, ParseError } from '../lib/loki/parser/parse_error.ts'
import { Parser } from '../lib/loki/parser/parser.ts'

const VERSION = '0.1.0'

function print_help() {
	print_version()
	console.log(`Usage: loki <command> [options]

Commands:
  build <file>   Compile .lo file to target language
  version        Show the current version
  help           Show this help message

Options:
  -b, --backend <js|c>   Target backend (default: js)
  -o, --output <file>    Output file path

Examples:
  loki build main.lo --backend js
  loki build main.lo -o out.c -b c`)
}

function print_version() {
	console.log(`Loki v${VERSION}`)
}

function error(message: string) {
	console.error(`error: ${message}`)
	process.exit(1)
}

async function build(file_path: string) {
	let source = ''
	try {
		source = await Bun.file(file_path).text()
	} catch {
		error(`could not read file: ${file_path}`)
	}

	try {
		const lex = new Lexer(source, file_path)
		const parser = new Parser(lex)
		const ast = parser.parse_file(file_path)

		const checker = new Checker()
		const errors = checker.check_file(ast)

		if (errors.length > 0) {
			for (const err of errors) {
				console.error(format_check_error(err))
			}
			process.exit(1)
		}

		// Select backend
		let backend = 'js'
		let output_path: string | undefined

		const build_args = process.argv.slice(3)
		for (let i = 0; i < build_args.length; i++) {
			if (build_args[i] === '--backend' || build_args[i] === '-b') {
				backend = build_args[++i]
			} else if (build_args[i] === '--output' || build_args[i] === '-o') {
				output_path = build_args[++i]
			}
		}

		let generated_code = ''
		if (backend === 'js') {
			const gen = new JsGenerator()
			gen.gen_file(ast)
			generated_code = gen.to_string()
		} else if (backend === 'c') {
			const gen = new CGenerator()
			gen.gen_file(ast)
			generated_code = gen.to_string()
		} else {
			console.error(`Unknown backend: ${backend}`)
			process.exit(1)
		}

		if (output_path) {
			await Bun.write(output_path, generated_code)
		} else {
			process.stdout.write(generated_code)
		}
	} catch (e) {
		if (e instanceof ParseError) {
			console.error(format_error(e))
			process.exit(1)
		}
		throw e
	}
}

async function main() {
	const args = process.argv.slice(2)
	const command = args[0]

	if (!command || command === 'help') {
		print_help()
		return
	}

	if (command === 'version' || command === '--version' || command === '-v') {
		print_version()
		return
	}

	if (command === 'build') {
		const file_path = args[1]
		if (!file_path) {
			error('build requires a file path')
		}
		await build(file_path)
		return
	}

	error(`unknown command: ${command}`)
}

main()
