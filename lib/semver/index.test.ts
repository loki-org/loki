import { expect, test } from 'bun:test'
import { parseVersion, parseVersionReq, Version, versionSatisfies } from './index'

test('parses and normalizes versions', () => {
	const version = parseVersion('1.2.3-alpha.1+build.9')
	expect(version.major).toBe(1)
	expect(version.minor).toBe(2)
	expect(version.patch).toBe(3)
	expect(version.pre).toBe('alpha.1')
	expect(version.build).toBe('build.9')
	expect(version.toString()).toBe('1.2.3-alpha.1+build.9')
})

test('orders versions by semver precedence', () => {
	const ordered = ['1.0.0-alpha', '1.0.0'].map((v) => Version.parse(v))

	for (let i = 0; i < ordered.length - 1; i++) {
		expect(ordered[i].compare(ordered[i + 1])).toBeLessThan(0)
	}
})

test('rejects invalid versions', () => {
	expect(() => parseVersion('1.2')).toThrow('version is not valid semver: 1.2')
	expect(() => parseVersion('01.2.3')).toThrow('version major cannot have leading zeros')
	expect(() => parseVersion('1.2.3-01')).toThrow(
		'version pre-release numeric identifier has a leading zero: 01',
	)
})

test('supports caret and tilde ranges', () => {
	expect(versionSatisfies('1.5.2', '^1.2.3')).toBe(true)
	expect(versionSatisfies('2.0.0', '^1.2.3')).toBe(false)
	expect(versionSatisfies('0.2.5', '^0.2.3')).toBe(true)
	expect(versionSatisfies('0.3.0', '^0.2.3')).toBe(false)
	expect(versionSatisfies('1.2.9', '~1.2.3')).toBe(true)
	expect(versionSatisfies('1.3.0', '~1.2.3')).toBe(false)
})

test('supports wildcard and comparator intersections', () => {
	const req = parseVersionReq('>=1.2.0, <2.0.0')
	expect(req.matches(parseVersion('1.9.9'))).toBe(true)
	expect(req.matches(parseVersion('2.0.0'))).toBe(false)
	expect(versionSatisfies('1.4.0', '1.*')).toBe(true)
	expect(versionSatisfies('2.0.0', '1.*')).toBe(false)
})

test('prerelease versions require explicit prerelease comparator', () => {
	expect(versionSatisfies('1.2.3-alpha.1', '^1.2.3')).toBe(false)
	expect(versionSatisfies('1.2.3-alpha.1', '>=1.2.3-alpha.1, <1.2.3')).toBe(true)
})
