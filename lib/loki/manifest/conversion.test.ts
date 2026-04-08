import { afterEach, expect, test } from 'bun:test'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
	convert_lokitoml,
	validate_lokitoml,
	validateKeywords,
	validateProjectName,
	validateVersion,
} from './index'

const FIXTURE_DIR = join(import.meta.dir, 'testdata')
const EXPECTED_PACKAGE_JSON = join(FIXTURE_DIR, 'package.json')
const DIST_DIR = join(FIXTURE_DIR, 'dist')
const GENERATED_PACKAGE_JSON = join(DIST_DIR, 'package.json')

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

test('rejects empty [project].name', () => {
	expect(() => validateProjectName({ name: '' })).toThrow('[project].name cannot be empty')
})

test('rejects non-alphanumeric and non-underscore characters in [project].name', () => {
	expect(() => validateProjectName({ name: 'sample-manifest' })).toThrow(
		'[project].name must contain only alphanumeric characters or _',
	)
})

test('rejects [project].name over 128 chars', () => {
	expect(() => validateProjectName({ name: 'a'.repeat(129) })).toThrow(
		'[project].name must be at most 128 characters',
	)
})

test('rejects empty [project].version', () => {
	expect(() => validateVersion({ version: '' })).toThrow('[project].version cannot be empty')
})

test('rejects [project].keywords with more than 10 items', () => {
	const keywords = Array.from({ length: 11 }, (_, index) => `k${index}`)
	expect(() => validateKeywords({ keywords })).toThrow(
		'[project].keywords must contain at most 10 items',
	)
})

test('rejects same [project].homepage and [project].repository', () => {
	const sharedUrl = 'https://example.com/same'
	expect(() =>
		validate_lokitoml({
			project: { name: 'foo', version: '1.0.0', homepage: sharedUrl, repository: sharedUrl },
		}),
	).toThrow('[project].homepage and [project].repository must differ')
})

test('rejects when both [project].license and [project].license_file are set', () => {
	expect(() =>
		validate_lokitoml({
			project: { name: 'foo', version: '1.0.0', license: 'MIT', license_file: 'LICENSE' },
		}),
	).toThrow('[project].license and [project].license_file cannot both be set')
})

test('supports [project].license_file when [project].license is not set', () => {
	const result = validate_lokitoml({
		project: { name: 'foo', version: '1.0.0', license_file: 'LICENSE' },
	}) as { license: string }
	expect(result.license).toBe('SEE LICENSE IN LICENSE')
})
