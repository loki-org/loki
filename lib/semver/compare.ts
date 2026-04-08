export function isNumericIdentifier(value: string): boolean {
	return /^[0-9]+$/.test(value)
}

export function cmpIdentifier(left: string, right: string): number {
	const leftNumeric = isNumericIdentifier(left)
	const rightNumeric = isNumericIdentifier(right)
	if (leftNumeric && rightNumeric) {
		const leftNum = Number.parseInt(left, 10)
		const rightNum = Number.parseInt(right, 10)
		return leftNum === rightNum ? 0 : leftNum < rightNum ? -1 : 1
	}
	if (leftNumeric !== rightNumeric) {
		return leftNumeric ? -1 : 1
	}
	return left === right ? 0 : left < right ? -1 : 1
}

export function comparePre(left: string, right: string): number {
	if (left.length === 0 && right.length === 0) {
		return 0
	}
	if (left.length === 0) {
		return 1
	}
	if (right.length === 0) {
		return -1
	}
	const leftIdentifiers = left.split('.')
	const rightIdentifiers = right.split('.')
	const length = Math.min(leftIdentifiers.length, rightIdentifiers.length)

	for (let index = 0; index < length; index++) {
		const comparison = cmpIdentifier(leftIdentifiers[index], rightIdentifiers[index])
		if (comparison !== 0) {
			return comparison
		}
	}

	if (leftIdentifiers.length === rightIdentifiers.length) {
		return 0
	}

	return leftIdentifiers.length < rightIdentifiers.length ? -1 : 1
}
