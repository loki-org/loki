import { afterEach, expect, test } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const FIXTURE_DIR = join(process.cwd(), 'tests/inout')
const EXPECTED_PACKAGE_JSON = join(FIXTURE_DIR, 'package.json')
const DIST_DIR = join(FIXTURE_DIR, 'dist')
const GENERATED_PACKAGE_JSON = join(DIST_DIR, 'package.json')

afterEach(() => {
	if (existsSync(DIST_DIR)) {
		rmSync(DIST_DIR, { recursive: true, force: true })
	}
})

test('converts tests/inout/loki.toml into tests/inout/dist/package.json', async () => {
	const run = Bun.spawn(['bun', 'run', 'src/cli.ts', FIXTURE_DIR], {
		cwd: process.cwd(),
		stderr: 'pipe',
		stdout: 'pipe',
	})

	const exitCode = await run.exited
	const stderr = await new Response(run.stderr).text()

	expect(exitCode).toBe(0)
	expect(stderr).toBe('')

	const expectedRaw = await readFile(EXPECTED_PACKAGE_JSON, 'utf8')
	const generatedRaw = await readFile(GENERATED_PACKAGE_JSON, 'utf8')

	expect(JSON.parse(generatedRaw)).toEqual(JSON.parse(expectedRaw))
})
