import { afterEach, expect, test } from 'bun:test'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { convertDirectory } from './conversion'

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
	convertDirectory(FIXTURE_DIR)

	const expectedRaw = readFileSync(EXPECTED_PACKAGE_JSON, 'utf8')
	const generatedRaw = readFileSync(GENERATED_PACKAGE_JSON, 'utf8')

	expect(JSON.parse(generatedRaw)).toEqual(JSON.parse(expectedRaw))
})
