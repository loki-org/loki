import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type LokiToml = {
	project: Record<string, unknown>
	dependencies?: Record<string, unknown>
	dev_dependencies?: Record<string, unknown>
	[key: string]: unknown
}

const ALLOWED_TOP_LEVEL_KEYS = new Set(['project', 'dependencies', 'dev_dependencies'])
const ALLOWED_PROJECT_KEYS = new Set([
	'name',
	'version',
	'description',
	'keywords',
	'homepage',
	'repository',
	'license',
])

function assertOnlySupportedTopLevelKeys(parsed: LokiToml): void {
	for (const key of Object.keys(parsed)) {
		if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
			throw new Error(`Unsupported top-level field: ${key}`)
		}
	}
}

function assertOnlySupportedProjectKeys(project: Record<string, unknown>): void {
	for (const key of Object.keys(project)) {
		if (!ALLOWED_PROJECT_KEYS.has(key)) {
			throw new Error(`Unsupported [project] field: ${key}`)
		}
	}
}

function toStringMap(
	input: Record<string, unknown> | undefined,
	label: string,
): Record<string, string> {
	if (!input) {
		return {}
	}

	const out: Record<string, string> = {}

	for (const [name, version] of Object.entries(input)) {
		if (typeof version !== 'string') {
			throw new Error(`Expected ${label}.${name} to be a string`)
		}
		out[name] = version
	}

	return out
}

function toPackageJson(parsed: LokiToml): Record<string, unknown> {
	assertOnlySupportedTopLevelKeys(parsed)

	if (!parsed.project || typeof parsed.project !== 'object' || Array.isArray(parsed.project)) {
		throw new Error('Missing or invalid [project] section')
	}

	assertOnlySupportedProjectKeys(parsed.project)

	const project = parsed.project

	return {
		name: project.name,
		version: project.version,
		description: project.description,
		keywords: project.keywords,
		homepage: project.homepage,
		repository: {
			type: 'git',
			url: project.repository,
		},
		license: project.license,
		dependencies: toStringMap(parsed.dependencies, 'dependencies'),
		devDependencies: toStringMap(parsed.dev_dependencies, 'dev_dependencies'),
	}
}

export async function convertDirectory(directory: string): Promise<void> {
	const lokiTomlPath = join(directory, 'loki.toml')
	const distDir = join(directory, 'dist')
	const outputPath = join(distDir, 'package.json')

	const rawToml = await readFile(lokiTomlPath, 'utf8')
	const parsed = Bun.TOML.parse(rawToml) as LokiToml
	const packageJson = toPackageJson(parsed)

	await mkdir(distDir, { recursive: true })
	await writeFile(outputPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
}
