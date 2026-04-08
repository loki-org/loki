import { comparePre } from './compare'
import { parseVersionParts } from './parse'

export class Version {
	readonly major: number
	readonly minor: number
	readonly patch: number
	readonly pre: string
	readonly build: string

	constructor(major: number, minor: number, patch: number, pre = '', build = '') {
		this.major = major
		this.minor = minor
		this.patch = patch
		this.pre = pre
		this.build = build
	}

	static parse(raw: string): Version {
		const parsed = parseVersionParts(raw, 'version')
		return new Version(parsed.major, parsed.minor, parsed.patch, parsed.pre, parsed.build)
	}

	compare(other: Version): number {
		if (this.major !== other.major) {
			return this.major < other.major ? -1 : 1
		}
		if (this.minor !== other.minor) {
			return this.minor < other.minor ? -1 : 1
		}
		if (this.patch !== other.patch) {
			return this.patch < other.patch ? -1 : 1
		}
		return comparePre(this.pre, other.pre)
	}

	eq(other: Version): boolean {
		return this.compare(other) === 0
	}

	toString(): string {
		const pre = this.pre.length > 0 ? `-${this.pre}` : ''
		const build = this.build.length > 0 ? `+${this.build}` : ''
		return `${this.major}.${this.minor}.${this.patch}${pre}${build}`
	}
}

export function parseVersion(raw: string): Version {
	return Version.parse(raw)
}
