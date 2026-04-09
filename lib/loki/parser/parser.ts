import { readFileSync } from 'node:fs'
import type { LokiAstFile } from '../ast'

export function parse_text(filePath: string, _text: string): LokiAstFile {
	return {
		path: filePath,
	}
}

export function parse_file(filePath: string): LokiAstFile {
	const sourceText = readFileSync(filePath, 'utf8')
	return parse_text(filePath, sourceText)
}
