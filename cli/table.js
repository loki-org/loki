// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { Scope } from "./scope.js"

const IDXS = {}

class Table {
	constructor() {
		this.global_scope = new Scope(null)
		this.indexes = new Map()
		this.types = []

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

		const idx = this.types.length
		this.types.push(name)
		this.indexes.set(name, idx)
		return idx
	}
}

export { IDXS, Table }
