class Table {
	constructor() {
		this.type_idxs = new Map()
		this.type_syms = []

		this.register({ name: 'void' })
		this.register({ name: 'i32' })
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

const IDXS = {
	void: 0,
	i32: 1,
}

export { Table, IDXS }
