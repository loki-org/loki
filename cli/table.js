// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const IDXS = {}

class Table {
	constructor() {
		this.indexes = new Map()
		this.symbols = []

		IDXS.void = this.register('void')
		IDXS.i32 = this.register('i32')
		IDXS.u32 = this.register('u32')
		IDXS.f64 = this.register('f64')
		IDXS.builtin = this.register('_')
	}

	register(name) {
		if (this.indexes.has(name)) {
			throw new Error(`Type ${name} already exists`)
		}

		const idx = this.symbols.length
		this.symbols.push(name)
		this.indexes.set(name, idx)
		return idx
	}
}

export { IDXS, Table }
