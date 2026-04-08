import { afterEach, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { convert_lokitoml, convert_lokitoml_text } from './index'

const FIXTURE_DIR = join(import.meta.dir, 'testdata')
const EXPECTED_PACKAGE_JSON = join(FIXTURE_DIR, 'package.json')
const DIST_DIR = join(FIXTURE_DIR, 'dist')
const GENERATED_PACKAGE_JSON = join(DIST_DIR, 'package.json')

const BASE_PROJECT_TOML = `
[project]
name = "sample_manifest"
description = "A sample manifest for testing purposes."
version = "0.2.3"
keywords = ["sample", "manifest", "testing"]
homepage = "https://example.com/home"
repository = "https://example.com/repo"
license = "MIT"

[dependencies]
foo = "^1.4.0"

[dev_dependencies]
bar = "~0.9.1"
`.trimStart()

function withTempManifestFile(toml: string, run: (directory: string) => void): void {
	const tempDir = mkdtempSync(join(tmpdir(), 'loki-manifest-'))
	try {
		writeFileSync(join(tempDir, 'loki.toml'), toml, 'utf8')
		run(tempDir)
	} finally {
		rmSync(tempDir, { recursive: true, force: true })
	}
}

afterEach(() => {
	if (existsSync(DIST_DIR)) {
		rmSync(DIST_DIR, { recursive: true, force: true })
	}
})

test('converts testdata/loki.toml into testdata/dist/package.json', () => {
	convert_lokitoml(FIXTURE_DIR)

	const expectedRaw = readFileSync(EXPECTED_PACKAGE_JSON, 'utf8')
	const generatedRaw = readFileSync(GENERATED_PACKAGE_JSON, 'utf8')

	expect(JSON.parse(generatedRaw)).toEqual(JSON.parse(expectedRaw))
})

test('converts toml text directly without file io', () => {
	const expectedRaw = readFileSync(EXPECTED_PACKAGE_JSON, 'utf8')
	const sourceToml = readFileSync(join(FIXTURE_DIR, 'loki.toml'), 'utf8')
	const packageJson = convert_lokitoml_text(sourceToml)

	expect(packageJson).toEqual(JSON.parse(expectedRaw))
})

test('rejects empty [project].name', () => {
	const toml = BASE_PROJECT_TOML.replace('name = "sample_manifest"', 'name = ""')

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow('[project].name cannot be empty')
	})
})

test('rejects non-alphanumeric and non-underscore characters in [project].name', () => {
	const toml = BASE_PROJECT_TOML.replace('name = "sample_manifest"', 'name = "sample-manifest"')

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow(
			'[project].name must contain only alphanumeric characters or _',
		)
	})
})

test('rejects [project].name over 128 chars', () => {
	const longName = 'a'.repeat(129)
	const toml = BASE_PROJECT_TOML.replace('name = "sample_manifest"', `name = "${longName}"`)

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow(
			'[project].name must be at most 128 characters',
		)
	})
})

test('rejects empty [project].version', () => {
	const toml = BASE_PROJECT_TOML.replace('version = "0.2.3"', 'version = ""')

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow('[project].version cannot be empty')
	})
})

test('rejects [project].keywords with more than 10 items', () => {
	const keywords = Array.from({ length: 11 }, (_, index) => `"k${index}"`).join(', ')
	const toml = BASE_PROJECT_TOML.replace(
		'keywords = ["sample", "manifest", "testing"]',
		`keywords = [${keywords}]`,
	)

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow(
			'[project].keywords must contain at most 10 items',
		)
	})
})

test('rejects same [project].homepage and [project].repository', () => {
	const sharedUrl = 'https://example.com/same'
	const toml = BASE_PROJECT_TOML.replace(
		'homepage = "https://example.com/home"',
		`homepage = "${sharedUrl}"`,
	).replace('repository = "https://example.com/repo"', `repository = "${sharedUrl}"`)

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow(
			'[project].homepage and [project].repository must differ',
		)
	})
})

test('rejects when both [project].license and [project].license_file are set', () => {
	const toml = BASE_PROJECT_TOML.replace(
		'license = "MIT"',
		'license = "MIT"\nlicense_file = "LICENSE"',
	)

	withTempManifestFile(toml, (directory) => {
		expect(() => convert_lokitoml(directory)).toThrow(
			'[project].license and [project].license_file cannot both be set',
		)
	})
})

test('supports [project].license_file when [project].license is not set', () => {
	const toml = BASE_PROJECT_TOML.replace('license = "MIT"', 'license_file = "LICENSE"')

	withTempManifestFile(toml, (directory) => {
		convert_lokitoml(directory)

		const packageJson = JSON.parse(
			readFileSync(join(directory, 'dist', 'package.json'), 'utf8'),
		) as {
			license: string
		}
		expect(packageJson.license).toBe('SEE LICENSE IN LICENSE')
	})
})
