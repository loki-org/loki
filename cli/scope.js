// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

class Env {
	impl_type = -1
}

class Scope {
	constructor(parent) {
		this.parent = parent
		this.objects = new Map()
	}

	insert(name, obj) {
		this.objects.set(name, obj)
	}

	lookup_flat(name) {
		if (this.objects.has(name)) {
			return this.objects.get(name)
		}

		return null
	}

	lookup(name) {
		const obj = this.lookup_flat(name)
		if (obj) {
			return obj
		}

		if (this.parent) {
			return this.parent.lookup_flat(name)
		}

		return null
	}
}

export { Env, Scope }
