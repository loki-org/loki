// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

class Table {
	constructor() {
		this.indexes = new Map()
		this.symbols = []

		this.register('u32')
	}

	register(name) {
		this.symbols.push(name)
		this.indexes.set(name, this.symbols.length - 1)
	}
}

export { Table }
