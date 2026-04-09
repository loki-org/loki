import type { LokiAstFile } from '../ast'

export type CheckerDiagnostic = {
	filePath: string
	message: string
}

export type CheckerResult = {
	diagnostics: CheckerDiagnostic[]
}

export function check_files(files: LokiAstFile[]): CheckerResult {
	const diagnostics: CheckerDiagnostic[] = []

	for (const _file of files) {
	}

	return { diagnostics }
}
