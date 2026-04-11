import type { File } from '../ast'

export type CheckerDiagnostic = {
	filePath: string
	message: string
}

export type CheckerResult = {
	diagnostics: CheckerDiagnostic[]
}

export function check_files(files: File[]): CheckerResult {
	const diagnostics: CheckerDiagnostic[] = []

	for (const _file of files) {
	}

	return { diagnostics }
}
