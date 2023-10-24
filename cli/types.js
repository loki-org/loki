// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const IDXS = {}

class Table {
	constructor() {
		this.type_idxs = new Map()
		this.type_syms = []

		IDXS.void = this.register({ name: 'void' })
		IDXS.i32 = this.register({ name: 'i32' })
		IDXS.u8 = this.register({ name: 'u8' })
	}

	register(sym) {
		const idx = this.type_idxs.get(sym.name)
		if (idx > 0){
			return idx
		}
		const new_idx = this.type_syms.length
		this.type_syms.push(sym)
		this.type_idxs.set(sym.name, new_idx)
		return new_idx
	}

	sym(idx) {
		return this.type_syms[idx]
	}
}

export { Table, IDXS }
