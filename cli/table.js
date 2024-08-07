// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { Scope } from "./scope.js"

const IDXS = {}

class Table {
	constructor() {
		this.global_scope = new Scope(null)
		this.indexes = new Map()
		this.symbols = []

		IDXS.void = this.register({ name: 'void' })
		IDXS.i32 = this.register({ name: 'i32' })
		IDXS.u32 = this.register({ name: 'u32' })
		IDXS.f64 = this.register({ name: 'f64' })
		IDXS.builtin = this.register({ name: '_' })
	}

	register(sym) {
		if (this.indexes.has(sym.name)) {
			throw new Error(`Type ${sym.name} already exists`)
		}

		const idx = this.symbols.length
		this.symbols.push(sym)
		this.indexes.set(sym.name, idx)
		return idx
	}

	sym(idx) {
		return this.symbols[idx]
	}
}

export { IDXS, Table }
