import { Lexer } from '../lib/loki/lexer/lexer.ts'
import { format_error, ParseError } from '../lib/loki/parser/parse_error.ts'
import { Parser } from '../lib/loki/parser/parser.ts'

const VERSION = '0.1.0'

function printHelp() {
	printVersion()
	console.log(`Usage: loki <command> [options]

Commands:
  build <file>   Compile .lo file to JavaScript
  version        Show the current version
  help           Show this help message

Examples:
  loki build main.lo`)
}

function printVersion() {
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
		console.log(JSON.stringify(ast, null, 2))
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
		printHelp()
		return
	}

	if (command === 'version' || command === '--version' || command === '-v') {
		printVersion()
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
