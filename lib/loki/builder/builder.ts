import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { check_files } from '../checker'
import { parse_file } from '../parser'

const SOURCE_FILE_EXTENSION = '.lo'

function collect_source_file_paths(projectDirectory: string): string[] {
	const filePaths: string[] = []

	function walk(directory: string): void {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const entryPath = join(directory, entry.name)
			if (entry.isDirectory()) {
				walk(entryPath)
				continue
			}
			if (entry.isFile() && entry.name.endsWith(SOURCE_FILE_EXTENSION)) {
				filePaths.push(entryPath)
			}
		}
	}

	walk(projectDirectory)
	return filePaths
}

// TODO read and convert manifest
export function build(projectDirectory: string): number {
	const filePaths = collect_source_file_paths(projectDirectory)
	const astFiles = filePaths.map((filePath) => parse_file(filePath))
	const checkResult = check_files(astFiles)

	if (checkResult.diagnostics.length > 0) {
		for (const diagnostic of checkResult.diagnostics) {
			console.error(`${diagnostic.filePath}: ${diagnostic.message}`)
		}
		return 1
	}

	// TODO: Add code generation once target backends are wired to the checked AST.

	return 0
}
