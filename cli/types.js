// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

const IDXS = {}

class Table {
	constructor() {
		this.type_idxs = new Map()
		this.type_syms = []

		IDXS.void = this.register({ name: 'void' })
		IDXS.any = this.register({ name: 'any', kind: 'any' })
		IDXS.bool = this.register({ name: 'bool' })
		IDXS.i32 = this.register({ name: 'i32' })
		IDXS.u8 = this.register({ name: 'u8' })
		IDXS.string = this.register({ name: 'string' })
		IDXS.array = this.register({ name: 'Array' })
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

	get_method(sym, name) {
		if (sym.kind === 'array') {
			const psym = this.sym(sym.parent)
			return this.get_method(psym, name)
		}

		if (!sym.methods) {
			return null
		}

		for (const method of sym.methods) {
			if (method.name === name) {
				return method
			}
		}

		return null
	}
}

export { Table, IDXS }
