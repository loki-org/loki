import { type Op, opFromPrefix, parseReqCore } from './parse'
import { parseVersion, Version } from './semver'

function toVersion(major: number, minor = 0, patch = 0, pre = ''): Version {
	return new Version(major, minor, patch, pre, '')
}

export class Comparator {
	readonly op: Op
	readonly major?: number
	readonly minor?: number
	readonly patch?: number
	readonly pre: string

	constructor(op: Op, major?: number, minor?: number, patch?: number, pre = '') {
		this.op = op
		this.major = major
		this.minor = minor
		this.patch = patch
		this.pre = pre
	}

	private floorVersion(): Version {
		return toVersion(this.major ?? 0, this.minor ?? 0, this.patch ?? 0, this.pre)
	}

	private wildcardUpperBound(): Version | undefined {
		if (this.major === undefined) {
			return undefined
		}
		if (this.minor === undefined) {
			return toVersion(this.major + 1, 0, 0)
		}
		return toVersion(this.major, this.minor + 1, 0)
	}

	private tildeUpperBound(): Version {
		if (this.major === undefined) {
			return toVersion(Number.MAX_SAFE_INTEGER, 0, 0)
		}
		if (this.minor === undefined) {
			return toVersion(this.major + 1, 0, 0)
		}
		return toVersion(this.major, this.minor + 1, 0)
	}

	private caretUpperBound(): Version {
		const major = this.major ?? 0
		const minor = this.minor ?? 0
		const patch = this.patch ?? 0
		if (major > 0) {
			return toVersion(major + 1, 0, 0)
		}
		if (minor > 0) {
			return toVersion(0, minor + 1, 0)
		}
		return toVersion(0, 0, patch + 1)
	}

	matches(version: Version): boolean {
		const floor = this.floorVersion()
		switch (this.op) {
			case 'Wildcard': {
				const upper = this.wildcardUpperBound()
				if (!upper) {
					return true
				}
				return version.compare(floor) >= 0 && version.compare(upper) < 0
			}
			case 'Exact':
				return version.eq(floor)
			case 'Greater':
				return version.compare(floor) > 0
			case 'GreaterEq':
				return version.compare(floor) >= 0
			case 'Less':
				return version.compare(floor) < 0
			case 'LessEq':
				return version.compare(floor) <= 0
			case 'Tilde': {
				const upper = this.tildeUpperBound()
				return version.compare(floor) >= 0 && version.compare(upper) < 0
			}
			case 'Caret': {
				const upper = this.caretUpperBound()
				return version.compare(floor) >= 0 && version.compare(upper) < 0
			}
		}
	}

	toString(): string {
		const versionCore =
			this.major === undefined
				? '*'
				: [this.major, this.minor, this.patch]
						.filter((part) => part !== undefined)
						.join('.')
		const pre = this.pre.length > 0 ? `-${this.pre}` : ''
		switch (this.op) {
			case 'Exact':
				return `=${versionCore}${pre}`
			case 'Greater':
				return `>${versionCore}${pre}`
			case 'GreaterEq':
				return `>=${versionCore}${pre}`
			case 'Less':
				return `<${versionCore}${pre}`
			case 'LessEq':
				return `<=${versionCore}${pre}`
			case 'Tilde':
				return `~${versionCore}${pre}`
			case 'Caret':
				return `^${versionCore}${pre}`
			case 'Wildcard':
				return versionCore
		}
	}
}

export class VersionReq {
	readonly comparators: readonly Comparator[]

	constructor(comparators: Comparator[]) {
		if (comparators.length === 0) {
			throw new Error('VersionReq cannot be empty')
		}
		this.comparators = comparators
	}

	static any(): VersionReq {
		return new VersionReq([new Comparator('Wildcard')])
	}

	static parse(raw: string): VersionReq {
		const trimmed = raw.trim()
		if (trimmed.length === 0) {
			throw new Error('VersionReq cannot be empty')
		}
		const parts = trimmed.split(',').map((part) => part.trim())
		const comparators: Comparator[] = []

		for (const part of parts) {
			if (part.length === 0) {
				throw new Error(`Invalid comparator list: ${raw}`)
			}
			const match = part.match(/^(<=|>=|=|<|>|~|\^)?\s*(.+)$/)
			if (!match) {
				throw new Error(`Invalid comparator: ${part}`)
			}
			const op = opFromPrefix(match[1])
			const parsed = parseReqCore(match[2])

			if (parsed.isWildcard) {
				if (match[1] && match[1] !== '=') {
					throw new Error(`Wildcard requirement cannot use operator ${match[1]}`)
				}
				comparators.push(new Comparator('Wildcard', parsed.major, parsed.minor))
				continue
			}

			comparators.push(
				new Comparator(op, parsed.major, parsed.minor, parsed.patch, parsed.pre),
			)
		}

		return new VersionReq(comparators)
	}

	matches(version: Version): boolean {
		if (version.pre.length > 0) {
			const allowsPre = this.comparators.some((comp) => {
				if (comp.pre.length === 0 || comp.major === undefined) {
					return false
				}
				return (
					version.major === comp.major &&
					version.minor === (comp.minor ?? 0) &&
					version.patch === (comp.patch ?? 0)
				)
			})
			if (!allowsPre) {
				return false
			}
		}
		return this.comparators.every((comparator) => comparator.matches(version))
	}

	toString(): string {
		return this.comparators.map((comparator) => comparator.toString()).join(', ')
	}
}

export function parseVersionReq(raw: string): VersionReq {
	return VersionReq.parse(raw)
}

export function versionSatisfies(
	version: string | Version,
	requirement: string | VersionReq,
): boolean {
	const parsedVersion = typeof version === 'string' ? parseVersion(version) : version
	const parsedRequirement =
		typeof requirement === 'string' ? parseVersionReq(requirement) : requirement
	return parsedRequirement.matches(parsedVersion)
}
