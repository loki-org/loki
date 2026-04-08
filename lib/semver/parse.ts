export type Op =
	| 'Exact'
	| 'Greater'
	| 'GreaterEq'
	| 'Less'
	| 'LessEq'
	| 'Tilde'
	| 'Caret'
	| 'Wildcard'

export function validateIdentifier(value: string, label: string): string {
	if (!/^[0-9A-Za-z-]+$/.test(value)) {
		throw new Error(`${label} has invalid identifier: ${value}`)
	}
	if (/^[0-9]+$/.test(value) && value.length > 1 && value.startsWith('0')) {
		throw new Error(`${label} numeric identifier has a leading zero: ${value}`)
	}
	return value
}

export function parseU64(value: string, label: string): number {
	if (!/^[0-9]+$/.test(value)) {
		throw new Error(`${label} must be numeric`)
	}
	if (value.length > 1 && value.startsWith('0')) {
		throw new Error(`${label} cannot have leading zeros`)
	}
	const parsed = Number.parseInt(value, 10)
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new Error(`${label} is out of range`)
	}
	return parsed
}

export function parseMetadata(value: string | undefined, label: string): string[] {
	if (!value) {
		return []
	}
	return value.split('.').map((segment) => validateIdentifier(segment, label))
}

function parseMetadataString(value: string | undefined, label: string): string {
	if (!value) {
		return ''
	}
	parseMetadata(value, label)
	return value
}

export function parseVersionParts(
	raw: string,
	label: string,
): {
	major: number
	minor: number
	patch: number
	pre: string
	build: string
} {
	const match = raw.match(
		/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/,
	)
	if (!match) {
		throw new Error(`${label} is not valid semver: ${raw}`)
	}
	return {
		major: parseU64(match[1], `${label} major`),
		minor: parseU64(match[2], `${label} minor`),
		patch: parseU64(match[3], `${label} patch`),
		pre: parseMetadataString(match[4], `${label} pre-release`),
		build: parseMetadataString(match[5], `${label} build metadata`),
	}
}

export function opFromPrefix(prefix: string | undefined): Op {
	switch (prefix) {
		case '=':
			return 'Exact'
		case '>':
			return 'Greater'
		case '>=':
			return 'GreaterEq'
		case '<':
			return 'Less'
		case '<=':
			return 'LessEq'
		case '~':
			return 'Tilde'
		case '^':
			return 'Caret'
		case undefined:
			return 'Exact'
		default:
			throw new Error(`Unsupported operator: ${prefix}`)
	}
}

export function parseReqCore(raw: string): {
	major: number
	minor?: number
	patch?: number
	pre: string
	isWildcard: boolean
} {
	const [base, preRaw] = raw.split('-', 2)
	if (!base) {
		throw new Error('Empty version requirement')
	}
	const components = base.split('.')
	if (components.length > 3) {
		throw new Error(`Too many version components in requirement: ${raw}`)
	}
	const out: {
		major: number
		minor?: number
		patch?: number
		pre: string
		isWildcard: boolean
	} = {
		major: 0,
		pre: parseMetadataString(preRaw, 'version requirement pre-release'),
		isWildcard: false,
	}

	if (components.length === 1 && ['*', 'x', 'X'].includes(components[0])) {
		out.isWildcard = true
		return out
	}

	for (let i = 0; i < components.length; i++) {
		const component = components[i]
		const wildcard = ['*', 'x', 'X'].includes(component)
		if (wildcard) {
			if (i !== components.length - 1) {
				throw new Error(`Wildcard can only appear in the last position: ${raw}`)
			}
			out.isWildcard = true
			break
		}
		const parsed = parseU64(component, 'version requirement component')
		if (i === 0) {
			out.major = parsed
		}
		if (i === 1) {
			out.minor = parsed
		}
		if (i === 2) {
			out.patch = parsed
		}
	}

	return out
}
