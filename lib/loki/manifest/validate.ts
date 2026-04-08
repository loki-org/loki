export type LokiToml = {
	project: Record<string, unknown>
	dependencies?: Record<string, unknown>
	dev_dependencies?: Record<string, unknown>
	[key: string]: unknown
}

export type PackageJsonShape = Record<string, unknown>

const ALLOWED_TOP_LEVEL_KEYS = new Set(['project', 'dependencies', 'dev_dependencies'])
const ALLOWED_PROJECT_KEYS = new Set([
	'name',
	'version',
	'description',
	'keywords',
	'homepage',
	'repository',
	'license',
	'license_file',
])

const PROJECT_NAME_REGEX = /^[A-Za-z0-9_]+$/

function asRequiredString(
	input: Record<string, unknown>,
	field: string,
	label = `[project].${field}`,
): string {
	const value = input[field]
	if (typeof value !== 'string') {
		throw new Error(`Expected ${label} to be a string`)
	}
	return value
}

function asOptionalString(input: Record<string, unknown>, field: string): string | undefined {
	const value = input[field]
	if (value === undefined) {
		return undefined
	}
	if (typeof value !== 'string') {
		throw new Error(`Expected [project].${field} to be a string`)
	}
	return value
}

function validateProjectName(project: Record<string, unknown>): string {
	const name = asRequiredString(project, 'name')
	if (name.length === 0) {
		throw new Error('[project].name cannot be empty')
	}
	if (name.length > 128) {
		throw new Error('[project].name must be at most 128 characters')
	}
	if (!PROJECT_NAME_REGEX.test(name)) {
		throw new Error('[project].name must contain only alphanumeric characters or _')
	}
	return name
}

function validateVersion(project: Record<string, unknown>): string {
	const version = asRequiredString(project, 'version')
	if (version.length === 0) {
		throw new Error('[project].version cannot be empty')
	}
	return version
}

function validateKeywords(project: Record<string, unknown>): string[] | undefined {
	const keywords = project.keywords
	if (keywords === undefined) {
		return undefined
	}
	if (!Array.isArray(keywords)) {
		throw new Error('Expected [project].keywords to be an array of strings')
	}
	if (keywords.length > 10) {
		throw new Error('[project].keywords must contain at most 10 items')
	}

	const out: string[] = []
	for (const keyword of keywords) {
		if (typeof keyword !== 'string') {
			throw new Error('Expected [project].keywords to be an array of strings')
		}
		out.push(keyword)
	}

	return out
}

function validateLicense(project: Record<string, unknown>): string | undefined {
	const license = asOptionalString(project, 'license')
	if (license === undefined) {
		return undefined
	}
	if (license.length === 0) {
		throw new Error('[project].license cannot be empty when provided')
	}
	return license
}

function validateLicenseFile(project: Record<string, unknown>): string | undefined {
	const licenseFile = asOptionalString(project, 'license_file')
	if (licenseFile === undefined) {
		return undefined
	}
	if (licenseFile.length === 0) {
		throw new Error('[project].license_file cannot be empty when provided')
	}
	return licenseFile
}

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

export function validate_lokitoml(parsed: LokiToml): PackageJsonShape {
	assertOnlySupportedTopLevelKeys(parsed)

	if (!parsed.project || typeof parsed.project !== 'object' || Array.isArray(parsed.project)) {
		throw new Error('Missing or invalid [project] section')
	}

	assertOnlySupportedProjectKeys(parsed.project)

	const project = parsed.project
	const name = validateProjectName(project)
	const version = validateVersion(project)
	const keywords = validateKeywords(project)
	const homepage = asOptionalString(project, 'homepage')
	const repository = asOptionalString(project, 'repository')
	const license = validateLicense(project)
	const licenseFile = validateLicenseFile(project)

	if (homepage !== undefined && repository !== undefined && homepage === repository) {
		throw new Error('[project].homepage and [project].repository must differ')
	}

	if (license !== undefined && licenseFile !== undefined) {
		throw new Error('[project].license and [project].license_file cannot both be set')
	}

	const packageJsonLicense =
		license ?? (licenseFile !== undefined ? `SEE LICENSE IN ${licenseFile}` : undefined)

	return {
		name,
		version,
		description: project.description,
		keywords,
		homepage,
		repository:
			repository === undefined
				? undefined
				: {
						type: 'git',
						url: repository,
					},
		license: packageJsonLicense,
		dependencies: toStringMap(parsed.dependencies, 'dependencies'),
		devDependencies: toStringMap(parsed.dev_dependencies, 'dev_dependencies'),
	}
}
