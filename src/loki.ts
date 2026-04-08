import { convertDirectory } from '../lib/loki/manifest/conversion'

function assertSingleDirectoryArg(argv: string[]): string {
	if (argv.length !== 1) {
		throw new Error('Usage: bun run src/cli.ts <directory>')
	}

	return argv[0]
}

function main(): void {
	try {
		const directory = assertSingleDirectoryArg(process.argv.slice(2))
		convertDirectory(directory)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error(message)
		process.exit(1)
	}
}

if (import.meta.main) {
	main()
}
