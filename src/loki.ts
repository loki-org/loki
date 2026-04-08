import { convertDirectory } from '../lib/loki/manifest/conversion'

// --- Arg parsing ---

type ParsedArgs = {
	command: string | undefined
	positional: string[]
	options: Record<string, string>
	flags: Set<string>
}

function parseArgs(argv: string[]): ParsedArgs {
	const result: ParsedArgs = {
		command: undefined,
		positional: [],
		options: {},
		flags: new Set(),
	}

	let i = 0
	while (i < argv.length) {
		const arg = argv[i]
		if (arg.startsWith('--')) {
			const eqIndex = arg.indexOf('=')
			if (eqIndex !== -1) {
				result.options[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1)
			} else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
				result.options[arg.slice(2)] = argv[++i]
			} else {
				result.flags.add(arg.slice(2))
			}
		} else if (result.command === undefined) {
			result.command = arg
		} else {
			result.positional.push(arg)
		}
		i++
	}

	return result
}

// --- Command registry ---

type CommandDef = {
	description: string
	usage: string
	run: (args: ParsedArgs) => void
}

const commands: Record<string, CommandDef> = {
	build: {
		description: 'Build a loki project in the given directory',
		usage: 'build <directory>',
		run(args) {
			const [directory] = args.positional
			if (!directory) {
				throw new Error(`Usage: loki ${commands.build.usage}`)
			}
			convertDirectory(directory)
		},
	},
}

function printHelp(): void {
	console.log('Usage: loki <command> [options]\n')
	console.log('Commands:')
	for (const [name, cmd] of Object.entries(commands)) {
		console.log(`  ${name.padEnd(12)} ${cmd.description}`)
	}
}

// --- Entry point ---

function main(): void {
	try {
		const args = parseArgs(process.argv.slice(2))

		if (args.flags.has('help')) {
			printHelp()
			process.exit(0)
		}

		// Default to "build" when the first argument is not a known command
		if (args.command && !commands[args.command]) {
			args.positional.unshift(args.command)
			args.command = 'build'
		}

		if (!args.command) {
			printHelp()
			process.exit(1)
		}

		const cmd = commands[args.command]

		cmd.run(args)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error(message)
		process.exit(1)
	}
}

if (import.meta.main) {
	main()
}
