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

async function build(filePath: string) {
	console.log(`Building: ${filePath}`)
	console.log('(build logic not yet implemented)')
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
		const filePath = args[1]
		if (!filePath) {
			error('build requires a file path')
		}
		await build(filePath)
		return
	}

	error(`unknown command: ${command}`)
}

main()
