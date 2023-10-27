// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

class Scope{
	constructor(parent) {
		this.parent = parent
		this.objects = {}
	}

	register(name, typ) {
		this.objects[name] = typ
	}

	find(name) {
		if (this.objects[name] !== undefined) {
			return this.objects[name]
		}
		if (this.parent !== null) {
			return this.parent.find(name)
		}
		return null
	}

	is_known(name) {
		return this.objects[name] !== undefined
	}
}

export { Scope }
