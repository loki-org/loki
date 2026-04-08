import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LokiToml, PackageJsonShape } from './validate'
import { validate_lokitoml } from './validate'

function read_lokitoml(directory: string): string {
	return readFileSync(join(directory, 'loki.toml'), 'utf8')
}

function parse_lokitoml(rawToml: string): LokiToml {
	return Bun.TOML.parse(rawToml) as LokiToml
}

function write_packagejson(directory: string, packageJson: PackageJsonShape): void {
	const distDir = join(directory, 'dist')
	mkdirSync(distDir, { recursive: true })
	writeFileSync(
		join(distDir, 'package.json'),
		`${JSON.stringify(packageJson, null, 2)}\n`,
		'utf8',
	)
}

export function convert_lokitoml_text(rawToml: string): PackageJsonShape {
	return validate_lokitoml(parse_lokitoml(rawToml))
}

export function convert_lokitoml(directory: string): void {
	write_packagejson(directory, convert_lokitoml_text(read_lokitoml(directory)))
}
